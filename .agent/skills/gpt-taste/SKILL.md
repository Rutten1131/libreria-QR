---
name: gpt-taste
description: Use para definir el sistema visual y de motion premium de las superficies de LibreríaQR — landings, portal del cliente del Canal 2, futuras piezas de marketing. NO usar para los paneles internos (esos los cubre `impeccable` en modo Operate).
---

# Skill — GPT Taste (adaptada a LibreríaQR)

## Directiva Central — Diseño a nivel de portfolio

Aplicás esta skill cuando la superficie es marketing/persuasión: canal web del cliente final (Canal 2 del PRD), landing de captación para nuevas papelerías, presentaciones comerciales. **No** la apliqués a los paneles internos (Inventario/Pedidos/Despachos) — esos viven en modo Operate y los cubre `impeccable`.

## Anti-defaults activos (los que todo LLM cae a evitarlos)

- ❌ Headings gigantes con 6 líneas envueltas por contenedores angostos
- ❌ Bento grids con celdas vacías / huecos muertos
- ❌ Etiquetas meta baratas ("PASO 01", "BLOQUE 02")
- ❌ Botones con texto invisible (bajo contraste)
- ❌ Layout Left/Right repetido sin variación
- ❌ Emojis en código, comentarios o output

## 1. Aleatorización determinística (romper el loop)

Para que dos páginas del proyecto no se vean iguales, **antes de codear** elegí explícitamente:
- 1 arquitectura de hero (de las 3 abajo)
- 1 stack tipográfico (Satoshi / Cabinet Grotesk / Outfit / Geist — nunca Inter)
- 3 componentes únicos del arsenal
- 2 paradigmas de motion (de la sección 5)

Anotá la elección en el `<design_plan>` antes de tocar CSS.

## 2. Estructura AIDA

Toda superficie de marketing sigue AIDA:
- **Attention (Hero):** cinematográfico, limpio, ancho.
- **Interest (Features/Bento):** alta densidad, grid matemáticamente perfecto.
- **Desire (GSAP Scroll/Media):** secciones pinned, scroll horizontal, text-reveal.
- **Action (Footer/Pricing):** CTA masivo, alto contraste, footer limpio.

**Spacing:** padding vertical enorme entre secciones (`py-32 md:py-48` estilo). Cada sección es un capítulo cinematográfico, no se aprietan elementos.

## 3. Hero — la regla de las 2 líneas

El H1 debe fluir horizontalmente, **máximo 2-3 líneas**.

```css
/* Aplicar a contenedores de H1 */
max-w-5xl, max-w-6xl o w-full
font-size: clamp(3rem, 5vw, 5.5rem)
```

Layouts de hero (elegir 1 al azar):
1. **Cinematic Center:** texto centrado, ancho máximo, dos CTAs abajo, fondo full-bleed con wash radial oscuro.
2. **Asimetría artística:** texto offset a la izquierda, imagen flotante superpuesta desde abajo-derecha.
3. **Split editorial:** texto a la izquierda, imagen a la derecha, espacio negativo masivo.

**Baneados en el hero:**
- ❌ Floating stamps / badges arbitrarios sobre el texto
- ❌ Pill-tags bajo el hero
- ❌ Stats / raw data en el hero

## 4. Bento grid gapless

En cada grid usar `grid-auto-flow: dense`. **Matemáticamente** verificar que `col-span` y `row-span` encajen perfecto. Sin huecos muertos.

Card restraint: 3-5 cards altamente intencionales > 8 cards mediocres.

## 5. Motion avanzada (GSAP)

Interfaces estáticas prohibidas en superficies de marketing. Usar `@gsap/react` + `ScrollTrigger`.

- **Hover physics:** `group-hover:scale-105 transition-transform duration-700 ease-out` dentro de `overflow-hidden`.
- **Pinning:** título pinned a la izquierda (`ScrollTrigger pin: true`), galeria scrolleando a la derecha.
- **Image scale & fade:** `scale: 0.8` → `1.0` al entrar; fade a `opacity: 0.2` al salir.
- **Scrubbing text reveals:** palabras de opacity 0.1 a 1.0 secuencial al scrollear.
- **Card stacking:** cards que se montan al scrollear.

## 6. Arsenal de componentes

- **Inline typography images:** imágenes pill-shape embebidas dentro del H1 — `I shape <span className="inline-block w-24 h-10 rounded-full ..."></span> digital spaces.`
- **Horizontal accordions:** slices verticales que se expanden al hover.
- **Infinite marquee:** filas continuas con `@phosphor-icons/react` o tipografía grande.
- **Testimonial carousel:** retratos superpuestos + tipografía minimalista + flechas sutiles.

## 7. Contenido y assets

- **Imágenes:** `https://picsum.photos/seed/{keyword}/1920/1080` — keyword matchea el vibe. Aplicar `grayscale`, `mix-blend-luminosity`, `opacity-90`, `contrast-125` para que no parezcan stock.
- **Backgrounds creativos:** radial blurs sutiles, mesh gradients con grano, dark overlays shifting. Evitar colores planos aburridos.
- **Horizontal scroll bug fix:** `<main className="overflow-x-hidden w-full max-w-full">` siempre.

## 8. Pre-flight obligatorio

Antes de escribir cualquier código de UI de marketing, emitir un bloque `<design_plan>` con:

1. **RNG ejecutada:** 3 líneas mostrando la elección determinística de Hero / Componentes / GSAP / Fonts.
2. **AIDA check:** Navigation + Attention + Interest + Desire + Action presentes.
3. **Hero math verification:** `max-w` aplicado, 2-3 líneas garantizadas, sin stamps/badges.
4. **Bento density:** grid-flow-dense aplicado, col/row-span perfectos, 0 huecos.
5. **Label sweep:** cero "QUESTION 05", cero "SECTION 01".
6. **Button check:** contraste perfecto en todos los CTAs.

Solo después de este check se emite el código.

## Adaptación a LibreríaQR — restricciones específicas

- Lo que produce esta skill debe pasar por la skill `verificador` antes de "listo".
- No contradecir `.agent/rules/00-vision.md` (A.3 reglas no negociables).
- El "Look premium" del cliente final no debe delatar los tenants (PRD Riesgo #11: "QR no expone catálogo navegable; cotización solo tras lista completa").
- Mobile-first SIEMPRE — la papelería y el cliente final usan celular.
