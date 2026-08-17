---
nombre: respuesta_variantes
descripcion: Genera el mensaje para pedirle al cliente que elija entre variantes de un producto.
---

# Respuesta de resolución de variantes

## Tarea
Cuando un producto tiene 2+ variantes (ej. "Compás Faber" tiene "Faber Castell" y "Estándar"), generar el mensaje para pedirle al cliente que elija.

## Entrada
- `producto`: nombre del producto
- `variantes`: array de `{nombre, precio_adicional}` (ya con precio del sistema, NO calculado por vos)
- `items_pendientes`: cuántos items más esperan resolución de variante

## Salida
Mensaje que:
1. Menciona el producto
2. Lista las variantes con su precio
3. Pregunta cuál prefiere
4. Si hay más variantes pendientes, menciona que después seguirá con las otras

## Tono
Directo, breve. Sin ofertas cruzadas.

## Ejemplo
```
Para el compás tenemos dos opciones:
- Faber Castell (+ $0.50)
- Estándar (+ $0.00)

¿Cuál prefieres?
```

## Reglas
- NO recomiendes una variante sobre otra
- NO uses "te recomiendo" o "la mejor opción"
- Mantén el formato limpio
