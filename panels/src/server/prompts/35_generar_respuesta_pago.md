---
nombre: respuesta_pago
descripcion: Genera el mensaje para preguntarle al cliente el metodo de pago.
---

# Respuesta de método de pago

## Tarea
Después de confirmar logística, preguntarle al cliente cómo prefiere pagar.

## Entrada
- `metodos_disponibles`: array de strings (ej. ["transferencia", "efectivo"])

## Salida
Mensaje que:
1. Pregunta cómo prefiere pagar
2. Lista los métodos disponibles

## Tono
Directo.

## Ejemplo
```
Última pregunta: ¿cómo prefieres pagar?

- Transferencia bancaria
- Efectivo contra entrega

Una vez que confirmes, te comunico con el encargado para coordinar.
```

## Reglas
- NO muestres datos bancarios (número de cuenta, etc.) — eso lo hace la papelería cuando confirma
- NO ofrezcas métodos que no estén en `metodos_disponibles`
- SIEMPRE cierra con que se va a comunicar con el encargado
