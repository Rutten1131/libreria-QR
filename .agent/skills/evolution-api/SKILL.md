---
name: evolution-api
description: Documentación conceptual sobre la integración multi-tenant de WhatsApp vía Evolution API para LibreríaQR. Se invoca cuando se diseña o implementa la conexión Evolution, los webhooks, el ciclo de vida de instancias o el envío de mensajes.
---

# 📘 Sistema WhatsApp Multi-Tenant con Evolution API — Documentación Conceptual

## ¿Qué estamos construyendo?

Un sistema SaaS donde **cada cliente (tenant) tiene su propia conexión de WhatsApp** para que la plataforma le envíe notificaciones y reciba mensajes en su nombre, de forma aislada.

> **Analogía**: Imagina que Evolution API es una centralita de teléfonos. Cada "instancia" es una línea telefónica independiente con su propio número. Tu plataforma le pide a la centralita: "créame una línea nueva para este cliente", "muéstreme el QR para que vincule su WhatsApp a esa línea", "envíe un mensaje por esa línea", etc.

---

## 🧱 Concepto 1: La "instancia" es el corazón del sistema

**Una instancia = una línea de WhatsApp = un cliente del SaaS.**

- Cada cliente tiene exactamente **una instancia**.
- La instancia tiene un **nombre único** dentro del servidor Evolution (lo elegís vos, debe ser derivable de algo único del cliente, ej: su número de teléfono normalizado).
- La instancia vive en el servidor Evolution de forma **persistente**: si tu app se cae, la instancia sigue ahí con su sesión de WhatsApp abierta.
- Una instancia puede estar en 3 estados macro:
  - **Desconectada**: creada pero nadie escaneó el QR todavía
  - **Esperando QR**: hay un QR fresco que el cliente debe escanear desde su celular
  - **Conectada**: el cliente ya vinculó su WhatsApp y puede enviar/recibir mensajes

> **Decisión de diseño clave**: ¿por qué una instancia por cliente y no una global compartida?
> - **Aislamiento**: si un cliente desconecta su WhatsApp, los demás siguen funcionando
> - **Multi-tenancy limpio**: cada cliente usa SU propio número, no el tuyo
> - **Trazabilidad**: cuando llega un mensaje al webhook, ya sabés de qué cliente viene sin hacer consultas extra

---

## 🧱 Concepto 2: Las 6 operaciones con Evolution API

Toda la integración se reduce a **6 operaciones**. Cada operación es un endpoint HTTP de Evolution al que llamás con autenticación.

### Operación A: Crear instancia
**Cuándo**: cuando un cliente nuevo se registra en tu SaaS.
**Qué le decís a Evolution**: "dame una línea nueva llamada `X`, prepárala para WhatsApp".
**Respuesta**: la instancia queda creada en estado "esperando QR" (si el cliente nunca la conectó antes) o ya conectada (si la instancia con ese nombre ya existía de un intento previo).

> ⚠️ **Idempotencia importante**: si el proceso de creación se interrumpe y lo intentás de nuevo, Evolution te dirá "ya existe". Esto **no es error**, es éxito: significa que podés continuar con el siguiente paso.

### Operación B: Configurar webhook
**Cuándo**: inmediatamente después de crear la instancia (siempre).
**Qué le decís a Evolution**: "cada vez que esta instancia reciba un mensaje o cambie de estado, enviale un POST a esta URL mía".
**Por qué es crucial**: sin esto, tu plataforma nunca se entera de los mensajes que mandan tus clientes ni de cuándo se conecta/desconecta.

> **Pensalo como un "callback"**: en lugar de andar preguntando "¿hay mensajes nuevos?", Evolution te los empuja cuando ocurren. Esto es lo que hace que el sistema sea en tiempo real.

**Eventos que típicamente necesitás escuchar**:
- Mensajes nuevos (entrantes o salientes)
- Cambios de estado de conexión (para detectar cuando alguien escaneó el QR o se cayó la sesión)

### Operación C: Obtener QR fresco
**Cuándo**: cuando el dueño del cliente entra a su panel y aún no está conectado.
**Qué le decís a Evolution**: "dame el QR actual de esta instancia para mostrárselo al usuario".
**Respuesta**: viene como imagen base64 lista para `<img src="data:image/png;base64,...">`.

> ⚠️ **Detalle operacional**: los QRs de WhatsApp expiran cada ~60 segundos. Por eso se hace **polling cada 30 segundos** desde el frontend para mantener uno fresco en pantalla.

### Operación D: Consultar estado
**Cuándo**: constantemente (polling cada 5-10 segundos en el panel) + en un cron cada X minutos.
**Qué le decís a Evolution**: "¿esta instancia está conectada, esperando QR o caída?".
**Respuesta**: un string. Vos lo mapeás a tu propio enum interno.

> **Por qué un cron además del polling**: Evolution puede desconectar al cliente por muchas razones (celular sin internet, sesión caducada por inactividad, etc.). Si solo dependés del polling del frontend, perdés visibilidad cuando el dueño cierra la pestaña. El cron revisa todos los clientes en background y sincroniza el estado en tu DB.

### Operación E: Enviar mensaje
**Cuándo**: cada vez que tu SaaS necesita notificar al cliente (reactivación, magic link, reseña pendiente, etc.).
**Qué le decís a Evolution**: "enviale este texto a este número, usando esta instancia y esta clave".
**Parámetros clave**:
- `instance`: nombre de la instancia
- `apiKey`: clave de autenticación
- `to`: número destino (normalizado, sin `+`, sin espacios, con código de país)
- `message`: texto plano

> **Manejo de errores recomendado**: 2 reintentos con 1 segundo entre cada uno, timeout de 15 segundos. Los envíos pueden fallar por timeouts del VPS, no por mensajes mal formados.

### Operación F: Eliminar instancia
**Cuándo**: cuando el cliente cancela su cuenta o pide reset.
**Qué le decís a Evolution**: "borrá esta instancia".
**Importante**: siempre eliminar en el servidor Evolution ANTES de borrar el registro en tu DB. Si tu DB se borra primero y la llamada a Evolution falla, te queda una instancia huérfana ocupando recursos.

---

## 🧱 Concepto 3: El flujo de onboarding de un cliente

Lo que vive en tu base de datos vs. lo que vive en Evolution:

| Responsabilidad | Dónde vive |
|---|---|
| Nombre del cliente, plan, fecha de trial | Tu DB |
| **Nombre de la instancia Evolution** | Tu DB (es el "puente") |
| Credenciales/API keys | Tu DB (puede ser global o por cliente) |
| Sesión de WhatsApp activa | Evolution (nunca la ves) |
| Mensajes enviados/recibidos | Evolution (los consultás vía API si necesitás) |

**El flujo exacto** cuando un nuevo cliente se registra:

```
1. Validás los datos del cliente (formulario)
         ↓
2. Verificás que no exista otro cliente con el mismo identificador único
         ↓
3. Llamás a Evolution → "crear instancia con nombre X"
         ↓
4. (Si falla por "ya existe" → seguís como si fuera éxito)
         ↓
5. Llamás a Evolution → "configurar webhook de esta instancia a mi URL"
         ↓
6. Guardás todo en tu DB (incluido el nombre de la instancia)
         ↓
7. Devolvés éxito al frontend
         ↓
8. El frontend entra al panel, ve "desconectado", pide QR
         ↓
9. QR aparece → cliente lo escanea con su WhatsApp
         ↓
10. Evolution notifica a tu webhook → actualizás estado a "conectado"
```

> **El paso 10 puede llegar antes o después** según tu implementación. La forma más confiable es: cuando llega el evento "conexión exitosa" al webhook, actualizás la DB y guardás el número de WhatsApp que se conectó (porque ya lo sabés).

---

## 🧱 Concepto 4: El webhook entrante y la multi-tenancy

Cuando Evolution te manda un mensaje, el payload siempre incluye el **nombre de la instancia** que lo recibió. Esto es tu ancla multi-tenant.

```
Evolution detecta mensaje en instancia "barber_593963410409"
         ↓
POST a tu webhook con payload { instance: "barber_593963410409", data: { ... } }
         ↓
Tu código: busco en mi DB el cliente cuyo nombre_de_instancia == "barber_593963410409"
         ↓
A partir de ahí, todo el procesamiento es scoped a ESE cliente
```

**Decisión crítica**: el webhook es el mismo endpoint para TODOS tus clientes. La discriminación por `instance` en el payload es lo que te permite escalar a miles de clientes sin tener un endpoint por cliente.

> **Si hacés lo contrario** (una sola instancia global y discriminás por algún otro campo), tenés un problema serio: cuando un cliente quiere que la plataforma mande mensajes "desde su número", no podés. La promesa del SaaS es que cada cliente use SU número.

---

## 🧱 Concepto 5: La UI para que el cliente conecte su WhatsApp

El patrón de UX probado es:

**Tres estados visuales principales**:
1. **Conectado** → mostrar mensaje de éxito + el número que se vinculó
2. **Esperando QR** → mostrar el QR grande, con un botón para recargar si expira
3. **Desconectado** → mostrar mensaje instructivo + botón para volver a pedir QR

**Patrón de polling inteligente**:
- Cada 6 segundos → consultar estado
- Cada 30 segundos → refrescar QR
- **Detener el polling** cuando:
  - El estado pasa a "conectado"
  - La pestaña del navegador está oculta (no tiene sentido gastar llamadas)
- Reanudar el polling cuando la pestaña vuelve a ser visible

> **Por qué este patrón y no WebSockets**: Evolution no expone eventos push al backend de forma nativa, solo webhooks. Podrías implementar un canal de eventos propio (Server-Sent Events, WebSockets), pero para una verificación de estado simple el polling es suficiente y mucho más simple. La optimización está en **detener el polling cuando no hace falta**.

---

## 🧱 Concepto 6: Seguridad y autenticación

**Tres tipos de secretos que tenés que manejar**:

1. **API key global de Evolution** (en tu `.env`): es la "llave maestra" del servidor. Si alguien la tiene, puede crear/borrar instancias.
2. **Credenciales de tu propio backend**:
   - `ADMIN_SECRET` o equivalente: para endpoints administrativos (crear clientes desde el panel de admin)
   - `CRON_SECRET` o equivalente: para los cron jobs
3. **Headers personalizados entre tu frontend y tu backend**: ej. un header que identifique al tenant actual (lo seteás en un middleware). **No usar el ID del tenant desde el frontend sin validar**, porque es trivial de falsificar.

**Recomendaciones**:
- El API key de Evolution **nunca debe llegar al frontend**. Todas las llamadas a Evolution pasan por tu backend.
- El endpoint de creación/eliminación de instancias está protegido por admin secret.
- Los endpoints de estado/QR del panel del cliente están protegidos por el header de tenant que validas en backend.

---

## 🧱 Concepto 7: Casos edge que tenés que cubrir

| Caso | Cómo manejarlo |
|---|---|
| Instancia ya existe al crear | Tratar como éxito, continuar |
| Webhook no se configuró | Reintentar; verificar que la URL sea accesible públicamente |
| Cliente escaneó QR y desconectó después | Cron job lo detecta y actualiza estado |
| Cliente cambió de número de WhatsApp | Necesita reset: eliminar instancia + crear nueva (no se puede "renombrar") |
| VPS de Evolution caído | El cliente ve "error de conexión"; los envíos fallan silenciosamente en background; el cron de check-connections eventualmente lo detecta |
| Número destino inválido | Evolution devuelve error en la respuesta del envío; loguear para debugging |
| Reenvío del mismo mensaje (duplicado) | Evolution puede reenviar webhooks si tu endpoint tarda en responder. Considerar **idempotencia** usando un ID de mensaje |

---

## 🧱 Concepto 8: Lo que NO tenés que construir vos

Evolution API ya hace todo el trabajo pesado:
- ❌ No implementás el protocolo de WhatsApp vos
- ❌ No manejás encriptación end-to-end
- ❌ No mantenés la sesión del celular abierta
- ❌ No decodificás mensajes multimedia (vos los recibís ya parseados)
- ❌ No administrás la base de datos de Evolution

Tu trabajo es: **orquestar**. Llamás a Evolution cuando necesitás algo, escuchás los webhooks cuando pasan cosas, y persistís en tu DB lo que te importa a vos (lógica de negocio, no mensajes crudos).

---

## 🎯 Resumen ejecutivo para que otro LLM lo replique

**Si tuvieras que explicarlo en 5 líneas**:

> "Cada cliente del SaaS tiene su propia 'instancia' en Evolution API (un contenedor con su sesión de WhatsApp). Para crear un cliente: llamás al endpoint de creación de Evolution con un nombre único derivado del cliente, después configurás un webhook para recibir mensajes, y guardás el nombre de la instancia en tu DB. Para enviar mensajes: llamás al endpoint de envío con el nombre de instancia, la API key, el número destino y el texto. Para mostrar el QR al cliente en su panel: llamás al endpoint de connect y le devolvés la imagen base64. Para saber si está conectado: llamás al endpoint de connection state. La multi-tenancy funciona porque cada mensaje entrante en el webhook incluye el nombre de la instancia que lo recibió, y vos lo usás para buscar al cliente correcto en tu DB."

**Decisiones que el dueño del proyecto debe tomar** (no las tomes por él):

1. **Cómo nombrar las instancias** (recomendado: derivar de un campo único del cliente, ej. número de WhatsApp normalizado).
2. **Si cada cliente usa su propia API key o comparten una global** (trade-off entre seguridad y simplicidad operativa).
3. **Frecuencia del polling en el panel** (trade-off entre UX y carga del servidor).
4. **Si vas a tener una instancia "maestra" del sistema para mensajes propios** (magic links, notificaciones del admin, etc.) o usarás una sola instancia compartida.
5. **Política de retención de instancias** cuando un cliente cancela (borrar inmediatamente, programar para X días, o dejar huérfanas).
