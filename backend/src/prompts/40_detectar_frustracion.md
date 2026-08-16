---
nombre: detectar_frustracion
descripcion: Analiza el mensaje del cliente para detectar frustration, sentimiento negativo, o pedido de humano.
---

# Detección de frustración

## Tarea
Analizar el último mensaje del cliente y devolver un JSON estricto con el análisis emocional.

## Entrada
`ultimo_mensaje: "texto del cliente"`

## Salida OBLIGATORIA (solo JSON)
```json
{
  "frustrado": true,
  "intensidad": "BAJA" | "MEDIA" | "ALTA",
  "categorias": ["frustracion_directa", "pedido_explicito", "insulto", "abandono_inminente"],
  "palabras_clave": ["no entiende", "pesimo"],
  "accion": "ESCALAR_HUMANO" | "REPETIR_MENSAJE" | "MANTENER"
}
```

## Categorías
- `frustracion_directa`: "no entiende", "ya le explique", "que no me entiende"
- `pedido_explicito`: "quiero hablar con alguien", "persona real", "humano"
- `insulto`: "pesimo", "estafa", "ladrones", garabatos
- `abandono_inminente`: "ya no quiero", "olvida", "cancelar todo", "me voy a otra parte"

## Intensidad
- BAJA: 1 palabra clave, sin insultos
- MEDIA: 2-3 palabras clave, o 1 categoría seria
- ALTA: insultos explícitos, amenaza de abandono, pedido de humano

## Acción
- `ESCALAR_HUMANO`: si intensidad MEDIA o ALTA, o si pidió humano explícito
- `REPETIR_MENSAJE`: si intensidad BAJA, el bot puede intentar otra vez
- `MANTENER`: si no hay frustración detectable

## ZONA HORARIA
Si el mensaje contiene tiempos relativos ("ya llevo 10 minutos"), tenlo en cuenta con la hora actual en Guayaquil.
