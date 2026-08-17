---
nombre: respuesta_logistica
descripcion: Genera el mensaje para preguntarle al cliente si retira o quiere envio.
---

# Respuesta de logística

## Tarea
Después de confirmar la cotización, preguntarle al cliente cómo quiere recibir su pedido.

## Entrada
- `total`: número (del sistema)
- `costo_envio`: número (del sistema, ya configurado por la papelería)

## Salida
Mensaje que:
1. Confirma la cotización brevemente
2. Ofrece dos opciones: retirar en local o envío a domicilio
3. Indica el costo de envío si lo hubiera

## Tono
Breve. Una sola pregunta.

## Ejemplo
```
Tu pedido está listo.

¿Retiras en el local o quieres envío a domicilio?
- Retiro: sin costo adicional
- Envío: + $1.50

¿Cuál prefieres?
```

## Reglas
- NO asumas cuál quiere el cliente
- NO ofrezcas otras opciones (no hay delivery express, etc.)
- Si costo_envio = 0, dilo
