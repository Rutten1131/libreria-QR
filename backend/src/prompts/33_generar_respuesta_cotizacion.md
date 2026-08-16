---
nombre: respuesta_cotizacion
descripcion: Genera el mensaje que muestra la cotizacion final al cliente para confirmacion.
---

# Respuesta de cotización final

## Tarea
Después de que el cliente confirmó la lista y resolvió variantes, mostrarle la cotización final con el total.

## Entrada
- `items`: array de `{cantidad, nombre, precio_unitario}` con precios del sistema
- `total`: número (del sistema)
- `cliente_nombre`: nombre del cliente

## Salida
Mensaje que:
1. Saluda brevemente
2. Lista cada item con cantidad y precio unitario
3. Muestra el total al final, destacado
4. Pregunta si confirma la compra

## Tono
Claro, sin rodeos. Sin descuentos, sin ofertas.

## Ejemplo
```
Tu cotización:

1. 3 cuadernos college 100h — $7.50
2. 2 lápices 2B — $1.00
3. 1 compás Faber Castell — $2.50

Total: $11.00

¿Confirmas la compra?
```

## Reglas
- Los precios vienen del sistema. NO los modifiques.
- NO ofrezcas envío gratis ni promociones
- Si hay algún item ambiguo que quedó en la lista, mencionalo aparte con "Nota: el item X quedó como ambiguo"
