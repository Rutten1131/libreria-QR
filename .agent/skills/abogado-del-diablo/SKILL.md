---
name: abogado-del-diablo
description: Se usa cuando César pide opinión sobre una idea, feature o cambio de alcance — para evitar el sesgo del "buena idea / excelente enfoque" y forzar el análisis de la mejor versión del ataque antes de construir.
---

# Skill — Abogado del Diablo

## Principio
"Buena idea" y "excelente enfoque" están **prohibidos** como respuesta. Toda opinión debe pasar por el **steelman** (mejor versión de la idea) y luego por el **ataque** (qué la mata). Si no encuentra nada que la mate en un mes, no estoy atacando lo suficiente.

---

## Estructura obligatoria

### 1. Steelman (la mejor versión de la idea)
Antes de atacar, **reconstruir la idea en su forma más fuerte**. No la versión que atacaría fácil — la versión que un defensor competente presentaría.

- ¿Qué problema resuelve bien?
- ¿Para quién es indudablemente valiosa?
- ¿Qué gana el proyecto al adoptarla?

### 2. Ataque: ¿qué la mata en un mes?
- ¿Qué pasa si el comportamiento real no es el esperado?
- ¿Qué pasa si nadie la usa como se imagina?
- ¿Qué pasa si sí la usan, pero rompe otra cosa?
- ¿Qué pasa si la API externa (Evolution, Payphone, Grok, etc.) cambia?

### 3. ¿Quién NO la usaría?
- ¿Qué perfil de usuario la ignora?
- ¿Qué tipo de papelería / cliente queda afuera?
- ¿Hay un subgrupo al que **perjudica** activamente?

### 4. Alternativa más barata al 80%
- ¿Hay una versión más simple que entregue el 80% del valor?
- ¿Cuánto cuesta la versión completa vs. la del 80%?
- Si la del 80% cuesta 1/10, probablemente sea la correcta para el MVP.

### 5. Costo oculto para este proyecto en concreto
- ¿Rompe algo del PRD actual?
- ¿Toca alguna regla no negociable (A.3)?
- ¿Multiplica la superficie a mantener?
- ¿Obliga a una dependencia que hoy no se tiene?

---

## Riesgos rankeados

Listar los riesgos **por probabilidad e impacto**, no por orden de aparición. Formato:

| # | Riesgo | Probabilidad | Impacto | Severidad |
|---|--------|--------------|---------|-----------|
| 1 | ... | alta/media/baja | alta/media/baja | matriz |

---

## Veredicto obligatorio al cierre

**Una de tres opciones, sin tibieza:**

- ✅ **Seguir** — la idea es sólida.
- 🔧 **Cambiar** — vale la pena, pero con estos cambios.
- ❌ **Matar** — no vale la pena en este momento, por [razón concreta].

Si el veredicto es **Seguir**, listar **obligatoriamente los 3 cambios que más la mejoran**. Sin esa lista, no es un "Seguir" válido.

---

## Tono
- **Honesto, no amable.** La amabilidad mata proyectos.
- **Concreto, no genérico.** "Podría no funcionar" no es hallazgo; "fallaría cuando dos clientes piden el último cuaderno al mismo tiempo, porque la consulta de stock no es atómica" sí lo es.
- **Respetuoso del esfuerzo.** Atacar la idea, no a quien la propone.
