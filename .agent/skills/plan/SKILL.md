---
name: plan
description: Se activa antes de construir cualquier función nueva del proyecto — para que nada se codifique sin un plan pequeño, reversible y acordado por el usuario.
---

# Skill — Plan

## Principio
Antes de escribir una línea de código nuevo, pensar. El plan debe ser tan pequeño que la siguiente pregunta sea **"¿cuál es el primer paso?"**, no **"¿qué archivo abro?"**.

---

## Aplicación obligatoria — preguntas antes de codear

Para cada función nueva o cambio de comportamiento, responder **en este orden**:

1. **¿Cuál es el problema real detrás del pedido?**  
   No la solución pedida — el problema. Si la respuesta es "porque el usuario lo pidió", falta profundidad.

2. **¿Qué es lo más pequeño que lo resuelve?**  
   Minimum Viable Change. Si el cambio puede ser una sola frase en código, no hacer dos.

3. **¿Qué se rompe con este cambio?**  
   - ¿Algún flujo del PRD deja de funcionar?
   - ¿Algún panel deja de servir su propósito principal?
   - ¿Algún isolation por tenant se ve afectado?

4. **¿Qué casos límite aplican?**  
   Revisar con lupa los riesgos ya documentados en el PRD:
   - **Ambigüedad de producto** (Riesgo #2 y #8) — ¿qué pasa si no se puede emparejar?
   - **Concurrencia de stock** (Riesgo #13) — ¿qué pasa si dos clientes piden lo último?
   - **Fallo de OCR** (Riesgo #16) — ¿qué pasa si la lista es ilegible?
   - Y cualquier otro riesgo listado en A.10.

5. **¿Cómo se verifica que quedó?**  
   Tener claro el comando de build / el caso de prueba / la evidencia necesaria **antes** de codear.

6. **¿Qué NO se va a hacer?**  
   Lista explícita de lo que queda fuera de este cambio. Especialmente cualquier cosa listada como "fuera de alcance del MVP" en el PRD (A.6.4).

---

## Resolución de preguntas antes de planear

- **Si una pregunta puede cambiar el plan:** se pregunta a César y se espera respuesta antes de avanzar.
- **Si una pregunta no cambia el plan:** se decide, se anota en el plan como asunción, y se sigue.

---

## Formato del plan

Escribir el plan en pasos pequeños y **reversibles**. Cada paso lleva su propia verificación.

```markdown
## Plan — [nombre corto del cambio]

### Supuestos
- ...

### Pasos
1. [paso reversible 1] — verificación: [qué se corre / qué se ve]
2. [paso reversible 2] — verificación: [...]
3. ...

### Fuera de alcance
- [lista explícita]

### Veredicto del plan
- Riesgo principal: ...
- Si falla el paso N, qué hago: ...
```

---

## Regla de cierre — **presentar y esperar OK**

> Antes de tocar código, presentar el plan y esperar el OK de César.

**Excepción única:** si César ya dio luz verde explícita para avanzar sin pausas (ej. "sí, dale" después de ver un plan), se puede codear directamente.

Sin OK explícito, **no se escribe código**.
