---
name: chequeo-seguridad
description: Se usa antes de publicar o después de tocar pagos, datos de tenants o autenticación en este proyecto — para evitar exponer secretos, romper el aislamiento por tenant o filtrar datos sensibles.
---

# Skill — Chequeo de Seguridad

## Principio
Cualquier cambio que toque **pagos, datos de tenants o autenticación** debe pasar por este chequeo antes de mergear o publicar. La regla no negociable #1 del PRD (aislamiento estricto por tenant) **nunca** se asume cumplida — se verifica explícitamente cada vez.

---

## Orden de revisión (en este orden, sin saltarse pasos)

### 1. Secretos expuestos o committeados
- Buscar `.env`, archivos con API keys, tokens de Evolution, claves de Payphone, etc. en el repo.
- Confirmar que `.gitignore` cubre `.env` y similares.
- Si hay un secreto en el histórico de git, **marcarlo como incidente**, no como nota.

### 2. Validación de lo que entra
- Todo input que llega por **WhatsApp** (texto, foto, audio, PDF) y por el **canal web** (form, upload, JSON) debe pasar por validación antes de llegar al motor de matching o a la base de datos.
- Tipos: longitud máxima, caracteres permitidos, tamaño máximo de archivo, tipo MIME válido.
- Rechazo explícito de inputs que no pasen validación — **nunca** caer a un default silencioso.

### 3. Aislamiento por tenant — **regla no negociable #1**
Esta es la verificación central. Ningún dato de una papelería puede ser alcanzable desde el contexto de otra:

- **Toda query a la base de datos o al adapter de inventario debe llevar `tenantId` en el filtro.** Si encuentra una query o función que no lleva `tenantId`, es un hallazgo.
- **Toda ruta de API debe recibir `tenantId` validado** y usarlo para scopes. Sin tenantId en la ruta → acceso denegado.
- **Pedir al menos dos tenants con datos distintos en el chequeo.** Confirmar:
  - Tenant A no ve inventario, pedidos ni precios del tenant B.
  - Una request sin tenantId o con tenantId inválido **no filtra** datos de nadie.
  - No hay forma de que un request "caiga" al primer tenant del array por un fallback accidental.
- Si hay caché, asegurar que la clave incluye `tenantId` (un caché sin `tenantId` es un cross-tenant leak latente).

### 4. Inyección
- **SQL/NoSQL:** queries parametrizadas o adapters que ya lo hagan. Nunca concatenar input del usuario en un query.
- **Comandos del sistema:** ningún `exec`/`spawn`/`child_process` con input del usuario.
- **Templates HTML:** cualquier render que pueda incluir input del usuario debe escapar por default (React ya lo hace en JSX; verificar que no se use `dangerouslySetInnerHTML` con input de WhatsApp).
- **Path traversal:** si se sirve un archivo a partir de un nombre que viene del cliente, hay que validar contra un allowlist o un path base fijo.

### 5. Datos sensibles en logs
- Logs de requests **no deben** incluir: tokens de WhatsApp, claves de Payphone, cuerpo completo de mensajes, números de tarjeta, comprobantes de transferencia.
- Si se loguea un pedido, **no loguear** el teléfono del cliente en texto plano si el log sale a un servicio externo — enmascarar al menos los últimos 4 dígitos.

### 6. Dependencias vulnerables
- Correr `npm audit` en backend y panels antes de mergear cualquier cambio que toque dependencias (`package.json`, `package-lock.json`).
- Si hay vulnerabilidades `high`/`critical` que toquen superficie expuesta (Express, next, etc.), **bloquean el merge** hasta que se arreglen o se documente la excepción.

---

## Formato del hallazgo

Cada hallazgo se reporta con:

```markdown
### [SEVERIDAD] — [título corto]

- **Archivo:** `ruta/al/archivo.ts:NN`
- **Severidad:** alta | media | baja
- **Ataque (1 frase):** cómo se explota — si no se puede explicar, no es hallazgo.
- **Mitigación:** [cambio concreto o link a docs]
```

Si no podés escribir la frase de ataque, **no es un hallazgo** — es ruido.

---

## Reporte honesto de lo NO revisado

Al final del chequeo, listar explícitamente:

```markdown
### Lo que NO se revisó en este pase
- [ej: autenticación del panel — fuera del alcance de este cambio]
- [ej: rate limiting — pendiente para fase X]
```

Esto se reporta aunque quede vacío. **Nunca** presentar el chequeo como completo si faltó alguna categoría del orden de revisión.
