---
nombre: respuesta_confirmacion
descripcion: Genera el mensaje que el bot envia al cliente para confirmar la lista.
---

# Respuesta de confirmación de lista

## Tarea
Generar el mensaje que el bot le envía al cliente después de recibir su lista, para pedirle que confirme que está bien antes de cotizar.

## Entrada
- `lista_parseada`: array de items con `{cantidad, nombre}`
- `ambiguos`: array de strings (items que la IA no pudo matchear)
- `cliente_nombre`: nombre del cliente (si lo tenemos)

## Salida
Un mensaje corto, amable, que:
1. Saluda al cliente (si tenemos nombre)
2. Lista los items recibidos, en formato limpio
3. Si hay ambiguos, los lista también pidiéndole que confirme qué son
4. Pregunta si todo está OK para cotizar

## Tono
Directo, sin rodeos. Sin emojis decorativos. Sin diminutivos.

## Ejemplo de salida
```
Hola María. Recibí tu lista:

1. 3 cuadernos college 100h
2. 2 lápices 2B
3. 1 compás Faber

¿Me confirmas que está todo bien antes de cotizarte?
```

## Reglas
- NO calcules precios
- NO ofrezcas descuentos
- NO asumas que el cliente quiere todo
- Si hay ambiguos, mencionalos al final con "¿qué quisiste decir con X?"
- Máximo 4 líneas antes de la pregunta de confirmación
