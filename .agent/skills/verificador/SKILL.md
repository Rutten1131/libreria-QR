---
name: verificador
description: Se activa SIEMPRE antes de reportar cualquier tarea como terminada en este proyecto — para que ningún cambio se marque como "listo" sin evidencia real y reproducible.
---

# Skill — Verificador

## Principio
"Debería funcionar" está **prohibido**. Un cambio está listo solo cuando hay evidencia real: comando corrido, output mostrado, caso de prueba ejecutado.

---

## Aplicación obligatoria

### 1. Evidencia antes de "listo"
Antes de reportar cualquier tarea como terminada, hay que tener a mano:
- El **comando exacto** que se corrió
- Su **output completo** (no recortes ni resúmenes)
- El **caso de prueba ejecutado** (input → output esperado → output real)

Si falta cualquiera de los tres, no es "listo" — es "en progreso".

### 2. Ante cualquier bug: reproducir primero
- **No asumir la causa.** Reproducir el bug con un caso mínimo antes de tocar nada.
- Buscar la **causa raíz**, no el síntoma. Si un síntoma aparece en un lugar, buscar si el mismo defecto puede manifestarse en otros.
- **Arreglo mínimo.** Solo lo necesario para cerrar el bug. Refactors de "ya que estamos" están prohibidos dentro de un fix.

### 3. Aislamiento por tenant — verificación explícita
Regla no negociable #1 del PRD: ningún dato de una papelería puede ser visible desde otra.

Si en el cambio tocado se tocó algo de **datos, cotización o pedidos**, antes de decir "listo" hay que:
- Crear al menos **dos tenants** con datos distintos.
- Hacer una petición con cada tenantId.
- Confirmar explícitamente que:
  - El tenant A **no ve** inventario, pedidos ni precios del tenant B.
  - Una request sin tenantId o con tenantId inválido **no filtra** datos de nadie.
  - No hay forma, en el código modificado, de que un request "caiga" al primer tenant del array.

### 4. Contra el "ya quedó"
Si en un turno anterior se dijo que algo estaba arreglado, **no confiar** sin volver a generar la evidencia. Volver a correr el caso. La memoria del agente no es evidencia.

### 5. Reporte fiel
- Si algo falla, decirlo **con el output completo**.
- **Nunca suavizar** un fallo como éxito parcial.
- **Nunca resumir** un error para que parezca más pequeño.

---

## Formato del reporte al cerrar tarea

Siempre cerrar con:

**Resultado:** [BUILD/TEST/CHECK name]  
**Comando:** `comando exacto`  
**Output relevante:** `output literal, no resumido`  
**Veredicto:** ✅ listo / ❌ no listo — [razón concreta]

Si no hay comando corrido + output literal + veredicto, **no es un cierre válido**.
