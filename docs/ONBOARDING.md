# Manual de Onboarding — LibreríaQR

## Rol
César (operador) carga el inventario de una nueva papelería siguiendo este manual.

## Pre-requisitos
- El cliente ya confirmó que va a usar el SaaS.
- Tenemos el `tenant_id` acordado (slug tipo `libreria_el_sol`).
- Tenemos el Excel del cliente (o el cliente confirma por WhatsApp qué tiene).

## Flujo del onboarding

### Paso 1 — Identificación del tenant
Preguntar al cliente:
- Nombre comercial de la papelería
- Teléfono principal (será el número de WhatsApp que se conecta a Evolution)
- Dirección física (referencia para despachos)

Resultado: `tenant_id` único. Ej: `papeleria_don_pablo`.

### Paso 2 — Recolección del inventario
Pedir al cliente una de estas opciones, en orden de preferencia:

**Opción A (ideal):** Excel con columnas mínimas:
- `nombre` (o como lo llame el cliente)
- `precio`
- `disponible` (sí/no)

**Opción B (si no tiene Excel):** Lista por WhatsApp con precios.

**Opción C (último recurso):** Recorrer la papelería con el dueño y armar la lista a mano.

�️ El operador (vos) **normaliza a mano** lo que el cliente entrega. El sistema no interpreta Excels arbitrarios — vos traducís.

### Paso 3 — Estructura JSON esperada por el endpoint

El sistema acepta este JSON estricto:

```json
{
  "tenant_id": "papeleria_don_pablo",
  "items": [
    {
      "nombre": "Cuaderno college 100h",
      "familia": "cuaderno",
      "precio": 2.50,
      "stock": 50,
      "variantes": ["Cosido", "Espiral"]
    },
    {
      "nombre": "Bolígrafo azul",
      "familia": "boligrafo",
      "precio": 0.40,
      "stock": 200
    }
  ]
}
```

**Reglas de validación:**
- `nombre` — string no vacío, máx 200 caracteres
- `familia` — string en minúsculas, sin acentos (ej: `cuaderno`, `boligrafo`, `libro`)
- `precio` — número positivo, 2 decimales
- `stock` — entero ≥ 0 (0 = disponible=false)
- `variantes` — array de strings opcional

**Si el item no cumple → el endpoint lo rechaza y lo lista en `detalle_rechazos`.**

### Paso 4 — Cargar el inventario
```bash
POST https://api.libreriaqr.com/api/admin/inventario/cargar
Authorization: Bearer <operator_token>
Content-Type: application/json

{ ... json del paso 3 ... }
```

### Paso 5 — Verificar carga
```bash
GET https://api.libreriaqr.com/api/tenants/{tenant_id}/productos
```

Esperado: la lista de productos coincide con la que el cliente confirmó.

### Paso 6 — Conectar WhatsApp (separado, ver skill evolution-api)
Solo después de que el inventario esté cargado, se configura Evolution API.

### Paso 7 — Onboarding comercial
Solo después de que entienda y valore el SaaS, ofrecer el Programa de Referidos (Parte B del PRD).

## Tareas del operador

- [ ] Recolectar inventario del cliente (Paso 2)
- [ ] Normalizar a JSON (Paso 3)
- [ ] POST al endpoint de carga (Paso 4)
- [ ] Verificar respuesta con GET (Paso 5)
- [ ] Conectar WhatsApp (Paso 6)
- [ ] Coordinar primera prueba con el dueño

## Tiempo estimado

~1 hora por cliente (PRD A.7). Si el inventario tiene más de 100 items, sumar 15-30 min adicionales.
