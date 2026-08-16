---
name: emil-design-eng
description: Use cuando se necesite guidance sobre polish de UI, decisiones de motion o micro-detalles invisibles de los componentes del proyecto LibreríaQR (Next.js). NO es la versión original; es la adaptación operativa local para los paneles del SaaS.
---

# Skill — Emil Kowalski Design Eng (adaptada a LibreríaQR)

## Filosofía aplicada al proyecto

### El gusto se entrena
No es preferencia personal — es la capacidad de ver más allá de lo obvio y reconocer qué eleva. En LibreríaQR esto significa que cuando copiemos un patrón de UI, **estudiamos por qué funciona**, no solo "se ve bien".

### Los detalles invisibles se acumulan
Cada decisión visible abajo existe porque el agregado de invisibles correctos crea interfaces que la gente ama sin saber por qué.

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune." — Paul Graham

### La belleza es apalancamiento
En un mercado donde toda competencia usa lo mismo, los detalles de craft son el diferenciador. En LibreríaQR el fronteo es importante porque **las personas se dejan llevar por lo que ven** — si la UI se ve genérica, el dueño de la papelería no la va a usar.

## Framework de decisión de animación

Antes de cualquier animación en este proyecto, responder:

### 1. ¿Debería animarse?
| Frecuencia | Decisión |
|------------|----------|
| 100+ veces/día (atajos) | **Nunca** animar |
| Decenas/día (hover, navegación) | Quitar o reducir drásticamente |
| Ocasional (modales, toasts) | Animación estándar |
| Raro/primera vez (onboarding) | Se permite delight |

### 2. ¿Para qué?
Propósitos válidos en LibreríaQR:
- **Consistencia espacial** — un toast entra y sale del mismo lado
- **Indicación de estado** — el cambio de "Verificar pago" → "Pagado" se siente
- **Feedback** — el botón escala a 0.97 en `:active`, confirmando el toque
- **Prevenir cambios abruptos** — el panel de Pedidos no salta sin transición al cambiar de estado

Si es solo "se ve cool" y el usuario lo ve seguido → **no animar**.

### 3. ¿Qué easing?

```
¿Entra o sale?
  Sí → ease-out (responsive)
  No →
    ¿Se mueve en pantalla?
      Sí → ease-in-out
    ¿Es hover/cambio de color?
      Sí → ease
    ¿Es movimiento constante (marquee)?
      Sí → linear
    Default → ease-out
```

**Crítico:** usar curvas custom. Las nativas CSS son demasiado débiles.

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

## Reglas operativas para LibreríaQR

### Prácticas prohibidas
- ❌ `transition: all` — solo propiedades específicas
- ❌ Animaciones en acciones iniciadas por teclado (atajos del panel)
- ❌ `ease-in` en dropdowns — se siente perezoso
- ❌ Botones sin `:active` — la persona necesita feedback táctil

### Prácticas obligatorias
- ✅ `transform` y `opacity` (GPU-accelerated) por sobre `width/height/top`
- ✅ `prefers-reduced-motion` respetado — si el usuario lo pidió, no animar
- ✅ Botones: `:active { transform: scale(0.97); }` por defecto
- ✅ Popovers se escalan desde el trigger, **modales desde el centro**
- ✅ Duración: 150-300ms para la mayoría; nada sobre 500ms salvo celebración

### Formato de revisión (cuando se pide crítica a UI existente)

Tabla markdown con columnas `Before | After | Why`. **Nunca** listas con `Before:` / `After:` en líneas separadas.

| Before | After | Why |
| --- | --- | --- |
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Specify exact properties; avoid `all` |
| `transform: scale(0)` | `transform: scale(0.95); opacity: 0` | Nothing in the real world appears from nothing |
| `ease-in` on dropdown | `ease-out` con curva custom | `ease-in` se siente sluggish |
| Sin `:active` en botón | `transform: scale(0.97)` en `:active` | Botones deben sentir responsivos |
| `transform-origin: center` en popover | `transform-origin: var(--trigger-origin)` | Popovers deben escalar desde su trigger |

## Aplicación concreta a LibreríaQR

| Superficie | Animación aceptable | Razón |
|------------|---------------------|-------|
| Cambio de columna en Panel de Pedidos | Cross-fade 200ms, ease-out | Indicar movimiento de estado |
| Botón "Tomar comanda" | Scale 0.97 en :active | Feedback táctil obligatorio |
| Toast de confirmación | Entrar desde abajo, ease-out 250ms | Consistencia espacial |
| Modal de carga Excel | Fade-in 150ms, sin escala | Acción ocasional |
| Hover sobre card de producto | Cambio de color 100ms, ease | Patrón visual estándar |

## Lo que esta skill NO hace

- No define colores ni tipografía — eso lo cubre `impeccable` y `gpt-taste`.
- No se invoca sola; se invoca cuando hay una decisión de motion puntual.
- No reemplaza la verificación visual con la skill `verificador` — una animación "bonita" sin captura corriendo no es cambio cerrado.
