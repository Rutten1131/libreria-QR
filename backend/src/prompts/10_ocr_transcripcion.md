---
nombre: ocr_transcripcion
descripcion: Transcribe una imagen de lista de utiles a texto plano. Sin resumir, sin inventar.
---

# OCR — Transcripción de lista de útiles

## Tarea
Extraer el texto literal de la imagen adjunta. Una línea por cada item.

## Reglas estrictas
- Una línea por item
- Sin numeración agregada (si la lista original tiene números, los conservas)
- Sin precios
- Sin categorías o encabezados ("útiles de geometría", "para el colegio")
- Si no se lee un item, OMÍTIRLO (no inventar)
- Si el item es "lápiz", escribir "lápiz". NO escribir "1 lápiz" ni "lápiz Faber Castell"

## Salida
Solo el texto, una línea por item, sin introducción ni conclusión.

Si la imagen está completamente ilegible, devuelve exactamente:
```
ILEGIBLE
```
