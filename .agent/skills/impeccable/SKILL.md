---
name: impeccable
description: Use cuando se quiera diseñar, rediseñar, criticar, auditar o pulir cualquier interfaz del proyecto LibreríaQR (paneles de inventario, pedidos, despachos, canal web, futuras landings). Cubre UX, jerarquía visual, accesibilidad, performance, motion, microinteracciones, error states y edge cases. NO usar para tareas de backend-only.
---

# Skill — Impeccable (adaptada a LibreríaQR)

## Propósito
Esta es la versión local y personalizada de la filosofía impeccable, **acotada al producto LibreríaQR** — SaaS multi-tenant para papelerías/librerías descrito en `.agent/rules/00-vision.md`. No se invoca nada externo, no se delega a otros runtimes. Todo lo que produce esta skill vive dentro del proyecto.

## Principios rectores (los que aplican aquí)
- **Ir hasta el final.** Sin atajos, sin hedging. Lo entregable tiene que estar completo, salvo assets que el usuario provea.
- **Soñar grande y nítido.** Diseño distintivo, memorable, fuera del gris genérico.
- **Verificar en pasadas acotadas.** Capturas + escaneo de defectos + micro-ediciones en una sola ronda, no en loops abiertos.

## Setup (al invocar)
1. Cargar `.agent/rules/00-vision.md` — entender el producto antes de diseñar nada.
2. Cargar `.agent/skills/chequeo-seguridad/SKILL.md` en mente — la UI nunca debe exponer datos cruzados entre tenants.
3. Leer la superficie concreta sobre la que se trabaja (página, componente, pantalla) antes de editar.

## Cómo se diseña en LibreríaQR

### El PRD gana
Honrar la estética fijada en el PRD aunque choque con un warning de patrón saturado. Redirigir el PRD hacia tu gusto es falla.

### Refinar preserva; rediseñar reemplaza
- **Refinar** mantiene la identidad, comportamiento y copy existentes. No tocar copy factual sin preguntar.
- **Rediseñar** mantiene la verdad del producto (qué hace, para quién, qué reglas no negociables) pero trata la UI vieja como evidencia y anti-referencia.

### Las reglas no negociables del PRD se respetan en la UI
| Regla PRD | Cómo se traduce a UI |
|-----------|---------------------|
| Aislamiento por tenant (A.3 #1) | Cada vista filtra y muestra solo lo del tenant actual — visualmente perceptible |
| La IA nunca calcula precio (A.3 #2) | UI nunca infiere precios — solo muestra los de la consulta exacta |
| Acción pendiente explícita (A.6.2) | Nunca una etiqueta "Pendiente" genérica; siempre "Confirmar variante", "Verificar pago", "Confirmar stock" |
| Entrega física fuera del sistema (A.3 #5) | UI comunica al cliente que la papelería coordina |

## Modos (elige según la superficie, no según el producto)

| Modo | Cuándo | Para LibreríaQR |
|------|--------|-----------------|
| **Persuade** | Decidir y actuar | Canal 2 web (futuro), onboarding de papelerías |
| **Operate** | Completar tarea | Paneles internos (Inventario, Pedidos, Despachos) |
| **Read** | Entender algo | Help in-app, mensajes de error explicativos |
| **Experience** | Estar dentro | — (no aplica en el MVP) |

Reglas por modo (resumidas):
- **Operate:** escaneabilidad, consistencia, expectativas nativas > expresión. La marca vive en detalles precisos.
- **Persuade:** ganar atención y acción. Imagen real cuando el brief lo pide.
- **Read:** estructura para comprensión, después hacer que valga la pena quedarse.

## Comandos disponibles en este proyecto

| Comando | Categoría | Descripción |
|---------|-----------|-------------|
| `shape [superficie]` | Build | Planificar UX/UI antes de escribir código |
| `document` | Build | Generar DESIGN.md a partir del código existente |
| `extract` | Build | Extraer tokens y componentes reutilizables al sistema de diseño |
| `critique [superficie]` | Evaluate | Revisión UX con scoring heurístico |
| `audit [superficie]` | Evaluate | Checks técnicos (a11y, perf, responsive) |
| `polish [superficie]` | Refine | Pase final de calidad antes de producción |
| `harden [superficie]` | Refine | Estados de error, edge cases, i18n |
| `onboard [superficie]` | Refine | First-run flows, empty states, activación |
| `animate [superficie]` | Enhance | Animaciones con propósito (ver skill `emil-design-eng`) |
| `typeset [superficie]` | Enhance | Mejorar jerarquía tipográfica |
| `layout [superficie]` | Enhance | Spacing, ritmo, jerarquía visual |
| `delight [superficie]` | Enhance | Personalidad y toques memorables |
| `clarify [superficie]` | Fix | Mejorar UX copy y mensajes de error |
| `adapt [superficie]` | Fix | Distintos dispositivos y pantallas |

## Baneados en este proyecto

- ❌ Templates genéricos de "AI default" (hero centrado con 6 líneas de título, 3 cards iguales, gradientes baratos).
- ❌ Tipografías por defecto que todo el mundo usa (Inter, Roboto, Arial en una landing premium).
- ❌ Emojis como decoración o ícono funcional.
- ❌ Etiquetas meta ("PEDIDO #01", "INVENTARIO") tipo contador barato.
- ❌ Botones con texto invisible (bajo contraste).
- ❌ Floating badge / pill-tags sobre el H1.
- ❌ Bento grids con huecos vacíos.

## Restricciones duras del proyecto

- La UI es para móvil primero (acorde a A.6 — uso desde celular por el dueño).
- Cada panel es una página Next.js en `panels/src/app/panel/<sección>/page.tsx`.
- Toda interacción visible debe ser coherente con la skill `verificador` — un cambio de UI se cierra cuando hay captura corriendo, no cuando "debería funcionar".
