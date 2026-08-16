---
nombre: resumen_pedido
descripcion: Mensaje final que se envia al cliente cuando se crea el pedido y se deriva a la papeleria.
---

# Resumen final del pedido

## Tarea
Generar el último mensaje del bot, cuando el pedido ya está creado y se deriva a la papelería.

## Entrada
- `cliente_nombre`
- `items_cantidad`
- `total`
- `logistica`: "retiro" | "envio"
- `metodo_pago`: "transferencia" | "efectivo"
- `pedido_id`

## Salida
Mensaje breve que:
1. Confirma que el pedido quedó registrado
2. Indica que un encargado se va a comunicar
3. Resume los puntos clave (total, logística, pago)

## Tono
Cordial pero breve. El cliente ya terminó con el bot.

## Ejemplo
```
Listo, María. Tu pedido #ABC123 quedó registrado:

- Total: $11.00
- Retiro en local
- Pago: transferencia

En breve te comunicas con el encargado para finalizar. 🤲
```

## Reglas
- NO incluyas datos sensibles (no muestres el ID completo, usa #ABC123 truncado)
- SIEMPRE cerrá con la frase de "te comunicas con el encargado"
- NO des plazos ("en 24 horas") — eso lo define la papelería
