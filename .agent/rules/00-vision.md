# PRD Final — LibreríaQR (v2, sin cabos sueltos)

Documento consolidado para entregar a Antigravity. Incluye el núcleo del SaaS, las adiciones acordadas (canal web, libros, comandas) y el programa de referidos **como módulo aparte, opcional, no parte del core**.

---

## PARTE A — PRODUCTO PRINCIPAL: SaaS LibreríaQR

### A.1 Resumen ejecutivo

SaaS multi-tenant para papelerías/librerías: reciben, cotizan y cobran pedidos de útiles escolares (y libros, ver A.7) sin atención presencial masiva. Fork del esqueleto arquitectónico de barberos.plus y taxi-qr — una base madre, multi-tenant, un usuario y un QR por cliente. Vive como subdominio dentro de ActivaQR, con backend y base de datos propios, sin compartir carga con otros productos.

**Modelo de negocio:** pago único de temporada, $120 por mes de uso — no suscripción anual continua.

**Propuesta de valor:** no elimina a la persona que atiende, multiplica cuánto puede atender esa misma persona en el mismo tiempo.

### A.2 Usuarios

1. Dueño/administrador de la papelería (tenant) — usa los paneles.
2. Cliente final (padre/madre/estudiante) — solo interactúa por WhatsApp o por el canal web (A.4), nunca ve paneles.
3. Operador (César/equipo) — onboarding, carga inicial de inventario, soporte.

### A.3 Reglas de negocio no negociables

- **Aislamiento total por tenant:** el tenant se define una sola vez al inicio de cada conversación (por el QR escaneado o el número al que se escribió) y nunca se reevalúa. Ninguna conversación, inventario, precio o pedido es visible entre tenants distintos, sin excepción.
- **La IA nunca calcula precio.** Solo interpreta y empareja texto contra catálogo. El precio siempre sale de una consulta exacta a los datos reales de ese tenant.
- **Ningún ítem ambiguo se resuelve por defecto silenciosamente** — siempre se pregunta o se escala a revisión humana.
- **El pago nunca se marca confirmado automáticamente** — requiere acción humana explícita en el Panel de Pedidos.
- **La entrega física no es responsabilidad del sistema** — se comunica explícitamente al cliente que la coordina la papelería.

### A.4 Flujo funcional — dos canales de entrada

El cliente final llega por **uno de dos canales**, ambos desembocan en el mismo motor de cotización/pedidos:

**Canal 1 — WhatsApp** (flujo conversacional, como se diseñó originalmente):

1. Identificación de tenant (QR o número).
2. Cliente envía lista (foto, texto o PDF).
3. OCR transcribe sin resumir.
4. Cliente confirma o corrige la transcripción.
5. Matching: ítems de alta confianza vs. ítems ambiguos.
6. Cotización preliminar (precio real, determinístico).
7. Resolución de ambigüedades por texto; si no se resuelve, escala a revisión humana.
8. Cotización final, confirmación de compra.
9. Cobro: transferencia o efectivo contra entrega (ver A.4 Canal 2 para pago con tarjeta).
10. Verificación humana de pago.
11. Verificación humana de stock físico y separación del pedido.
12. Formulario de dirección de envío.
13. Despacho coordinado por la papelería.
14. Cierre.

**Canal 2 — Web QR** (nuevo, reduce dependencia de WhatsApp):
QR con leyenda tipo "Pídelo rápido, escanea este QR" que abre una interfaz web simple (no chat) con:

- Subida de foto/PDF de la lista.
- Visualización de la cotización una vez procesada (mismo motor de matching/precio que el Canal 1).
- Confirmación de compra con dos opciones de pago: **pagar directo** (tarjeta, vía Payphone — ver A.8) o **pagar en efectivo contra entrega**.
- El pedido confirmado cae al mismo Panel de Pedidos que los pedidos de WhatsApp — no hay dos sistemas de gestión, solo dos puertas de entrada.

**Por qué importa tener los dos canales:** el Canal 2 no depende de la disponibilidad ni de los límites de WhatsApp, así que si una conexión de WhatsApp falla (riesgo #9, ver A.10), el negocio no se detiene — el cliente puede seguir pidiendo por la web.

### A.5 Categorías de producto: útiles + libros escolares

El catálogo de cada tenant no se limita a útiles — incluye también libros de texto, ya que las papelerías los cotizan de forma habitual y es un motivo frecuente de que el cliente recorra varias librerías. Mismo mecanismo de matching y cotización, solo otra categoría dentro del mismo catálogo. Se usa como gancho de venta adicional al ofrecer el sistema a cada papelería.

### A.6 Paneles (frontend por tenant)

Acceso vía enlace enviado por WhatsApp, sin usuario/contraseña tradicional, pensado para uso desde celular.

**A.6.1 Panel de Inventario**

- Pantalla principal: buscador + botón de un toque "Disponible"/"Agotado" (acción de uso diario).
- Actualización masiva de precios/catálogo: re-subir el mismo formato de Excel del onboarding (función secundaria, no la pantalla principal).
- Productos agrupables en "familias de variantes" (ej. tipos de compás) para que el sistema sepa cuándo preguntar.

**A.6.2 Panel de Pedidos**

- Tablero de 3 estados: **Necesita revisión → Confirmado/Pagado → Despachado.**
- Cada tarjeta en "Necesita revisión" indica explícitamente la acción pendiente (nunca una etiqueta genérica de "pendiente"): "Confirmar variante", "Verificar pago recibido", "Confirmar stock físico".

**A.6.3 Panel de Despachos (tipo comanda de restaurante)**

- Pantalla separada para el equipo que despacha físicamente (asume que la papelería tiene personal para esto).
- Cada pedido confirmado aparece como una comanda; quien lo atiende la "toma" y queda como responsable de ese despacho — deja trazabilidad de quién despachó cada pedido y habilita, si la papelería lo decide, una comisión interna por despacho (esto lo define la papelería, no el sistema).

**A.6.4 Fuera de alcance del MVP:** reportes de ventas, estadísticas, configuración avanzada, múltiples roles de usuario.

### A.7 Onboarding

- Se solicita como mínimo una hoja de Excel con el inventario (útiles y libros).
- Normalización a estructura fija de columnas (producto, familia de variante, precio, disponibilidad).
- ~1 hora de trabajo estimado por cliente — debe planificarse como recurso real, no asumirse gratuito.
- Mismo formato reutilizable para actualizaciones posteriores.
- **En este mismo momento de onboarding se le presenta también, como oferta aparte, el Programa de Referidos (ver Parte B)** — nunca antes de que el dueño entienda y valore el SaaS por sí solo.

### A.8 Arquitectura técnica

- WhatsApp: conexión independiente por tenant (Evolution API) — aísla el riesgo de que una conexión caída afecte a otras.
- IA/OCR: cascada de APIs gratuitas (Grok, Nvidia) para el piloto; prever presupuesto de API de pago como respaldo antes de escalar, porque el pico de uso coincide con el pico de riesgo de saturación gratuita.
- Backend/orquestación: Node.js/TypeScript.
- Paneles: Next.js (frontend + backend del panel en un mismo proyecto).
- Pago con tarjeta (Canal 2 web): integración con Payphone.
- Despliegue: paneles y canal web en Vercel; proceso de conexión persistente con WhatsApp en Railway o VPS propio (Vercel no sirve para conexiones persistentes).
- Base de datos: VPS propio, no Supabase (evita el cambio de condiciones de free tier ya notificado, da control total).

### A.9 Manejo de fallos y observabilidad

- Registro de cada paso de cada pedido (fecha/hora, tenant, estado) — nunca se pierde un pedido sin rastro.
- Si falla la IA/OCR tras agotar la cascada: el pedido cae automáticamente a "Necesita revisión" con la lista/foto original adjunta, para cotización manual. El negocio nunca depende al 100% de que la IA funcione.
- Si la conexión de WhatsApp de un tenant se cae por completo: alerta al operador (César/equipo), no al dueño de la papelería.
- Ante fallos repetidos (2-3 intentos) en el mismo paso de un pedido: se detiene y se escala a revisión humana, nunca reintentos infinitos silenciosos.

### A.10 Riesgos y mitigaciones (consolidado, sin puntos abiertos)

| # | Riesgo | Mitigación |
|---|--------|------------|
| 1 | Lanzar en la semana de mayor caos, sin margen de debugueo | Piloto con 1-2 papelerías antes de escalar |
| 2 | Error de IA cobra mal a un cliente | Ítems ambiguos nunca se auto-resuelven |
| 3 | Transferencia no elimina el paso humano | Diseño intencional: verificación humana de pago es control, no defecto |
| 4 | Inventario desincronizado | Botón de un toque "agotado" + verificación humana de stock antes de despachar |
| 5 | Carga de inventario como cuello de botella | Excel + normalización, ~1h/cliente, planificado como recurso |
| 6 | Producto estacional, objeción de precio mensual | Pago único de temporada ($120), no suscripción |
| 7 | Última milla fuera de control | Fuera de alcance explícito, comunicado al cliente desde el inicio |
| 8 | Variantes ambiguas sin fotos | Pregunta por texto; si no se resuelve, escala a humano |
| 9 | Riesgo de bloqueo de número de WhatsApp | Conexión independiente por tenant + Canal 2 web como respaldo (A.4) |
| 10 | Saturación de APIs gratuitas de IA en pico de uso | Cascada + presupuesto de respaldo pago antes de escalar |
| 11 | Competidor "espía" precios vía QR | QR no expone catálogo navegable; cotización solo tras lista completa |
| 12 | Mezcla de datos entre tenants | Aislamiento estricto desde el primer mensaje (A.3) |
| 13 | Sobreventa por concurrencia (dos clientes piden el último ítem) | **Resuelto:** el pedido que primero llega a "pago verificado + stock confirmado" en el Panel de Pedidos se procesa; si el segundo llega antes de que el primero se despache, el sistema lo marca automáticamente como "Revisar disponibilidad" en vez de confirmarlo, y la papelería contacta proactivamente al segundo cliente con alternativa o reembolso |
| 14 | Reembolsos y cancelaciones sin proceso | **Resuelto:** la papelería es quien autoriza y ejecuta la devolución (mismo medio de pago, transferencia de vuelta); el Panel de Pedidos exige un motivo obligatorio al mover un pedido a "Cancelado"; se comunica al cliente un plazo estimado (ej. 24-48h) |
| 15 | Carrito abandonado (cliente inicia y no confirma) | **Resuelto:** un único recordatorio automático tras un período de inactividad definido (ej. 2 horas), sin insistir más de una vez para no ser invasivo |
| 16 | Falla total de OCR (lista ilegible) | **Resuelto:** mensaje explícito pidiendo que escriba la lista directo como texto; si tampoco se puede procesar, escala directo a revisión humana con la imagen original adjunta |

---

## PARTE B — MÓDULO APARTE: Programa de Referidos (Fase 2, opcional, no core)

**Importante:** este módulo no es un bróker, no maneja pagos de terceros ni logística propia. Es un programa de comisión por referido que se ofrece como extra sobre el SaaS ya vendido. Se activa por tenant, solo si el tenant acepta.

### B.1 Qué es

Al momento del onboarding del SaaS (A.7), y solo después de que el dueño ya entendió y valorado el sistema por sí solo, se le ofrece: *"si querés, yo también te puedo traer clientes — por cada uno, me das un 5% de comisión. Si no te interesa, no pasa nada."* Es opt-in, por tenant, sin obligación.

### B.2 Cómo funciona

1. La demanda llega por un canal propio de César (marketing/landing separada del QR de cada papelería individual — puerta de entrada distinta al Canal 1/2 de la Parte A).
2. El cliente final (ej. un oficinista sin tiempo) entrega su lista por ese canal propio.
3. El sistema/César cotiza esa lista **solo entre los tenants que aceptaron participar en el programa**, usando el inventario y precios que ya existen en el sistema porque son también clientes SaaS (dato usado con consentimiento explícito del tenant, no de forma oculta).
4. **Regla de selección cuando varios tenants participantes cumplen con la lista:** se prioriza el precio más bajo para el cliente final — la comisión no decide a quién se envía el pedido cuando hay empate real de disponibilidad; esto protege la credibilidad de la promesa de valor. La comisión es el ingreso de César, no el criterio de selección.
5. Al cliente final **no se le dice en qué librería específica se compró** — solo que se cotizó entre varias y cuál fue el resultado.
6. El pago del pedido en sí va **directo a la papelería** (transferencia), como cualquier otro pedido del SaaS — César no custodia ese dinero.
7. La papelería despacha el pedido igual que cualquier otro (mismo Panel de Despachos, A.6.3).
8. Aparte, al cliente final se le cobra un servicio propio de César (~$10, pago directo a César, no a la papelería) por el compromiso de resolverle la compra y dejársela lista/entregada en su lugar de trabajo — este es un servicio distinto, de tiempo/conveniencia, no relacionado al precio de los útiles.
9. La comisión (5%, o el % que cada tenant haya aceptado) se cobra a la papelería por separado, por cada venta efectivamente concretada por este canal — cubre el costo de campaña/marketing que César asume para captar esa demanda.

### B.3 Por qué está separado del core

- No requiere ningún cambio en la arquitectura técnica del SaaS (Parte A) más allá de un campo de configuración por tenant: "participa en referidos: sí/no" + "% acordado".
- No introduce custodia de pago, logística, ni inventario propio.
- No se lanza en paralelo a la venta inicial del SaaS — se ofrece recién en el onboarding de cada papelería ya cerrada, y se activa cliente por cliente, sin bloquear ni condicionar el lanzamiento del producto principal.

### B.4 Riesgos propios de este módulo (no se mezclan con la tabla de A.10 porque es un producto aparte)

| # | Riesgo | Mitigación |
|---|--------|------------|
| 1 | Que el dueño sienta que se le pide algo antes de valorar el SaaS | Se ofrece solo después, nunca como parte de la venta inicial |
| 2 | Sesgo hacia el tenant que paga más comisión | Regla fija: precio más bajo decide cuando hay empate de disponibilidad (B.2.4) |
| 3 | Percepción de doble cobro si el cliente final se entera de la comisión | Son dos servicios distintos a dos partes distintas (conveniencia al cliente, referido a la papelería) — no requiere ocultarse, pero tampoco necesita explicarse en el mismo mensaje de venta |

---

Con esto, el PRD queda cerrado en dos partes independientes, sin cabos sueltos pendientes. ¿Lo entrego así a Antigravity, o querés que le agregue una portada tipo "changelog" resumiendo qué se agregó respecto a la primera versión?
