/**
 * Tipo base para toda categoría de conocimiento de papelería.
 * Cada dimensión representa una "pregunta" que el bot puede hacer al cliente.
 */
export interface DimensionVariante {
  /** Nombre interno de la dimensión (ej. 'rayado', 'encuadernacion') */
  nombre: string;
  /** Pregunta corta para el cliente (opcional, si no se define se usa la genérica) */
  pregunta?: string;
  /** Palabras clave que identifican cada opción en el nombre del producto del inventario */
  opciones: string[];
}

export interface CategoriaConocimiento {
  /** Familia interna (debe coincidir con la columna `familia` en DB) */
  familia: string;
  /** Palabras que en el mensaje del cliente activan esta categoría */
  disparadores: string[];
  /** Dimensiones de variante ordenadas por prioridad de pregunta */
  dimensiones: DimensionVariante[];
  /** Mensaje de aclaración por defecto si hay múltiples variantes */
  preguntaGenerica: string;
}
