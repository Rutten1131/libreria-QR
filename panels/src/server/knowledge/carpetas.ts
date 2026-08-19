import type { CategoriaConocimiento } from './types';

/**
 * CARPETAS — todo lo que el bot sabe sobre carpetas, archivadores y portafolios.
 *
 * Dimensiones de variante:
 * 1. Tipo de cierre  (sobre con broche / elástico / anillos / palanca)
 * 2. Material  (plástica / cartón / tela)
 * 3. Tamaño  (A4 / oficio)
 * 4. Color  (azul / verde / transparente / rojo...)
 */
export const CARPETAS: CategoriaConocimiento = {
  familia: 'carpeta',
  disparadores: [
    'carpeta', 'carpetas', 'archivador', 'archivadores',
    'portafolio', 'portafolios', 'folder', 'folders', 'fólder',
  ],
  dimensiones: [
    {
      nombre: 'cierre',
      pregunta: '¿La prefieres *tipo sobre con broche*, *con elástico* o *de argollas/anillos*?',
      opciones: [
        'broche', 'tipo sobre', 'sobre con broche',
        'elástico', 'elastico',
        'argolla', 'anillos', 'doble argolla',
        'palanca', 'palanca cartón',
      ],
    },
    {
      nombre: 'material',
      pregunta: '¿La prefieres *plástica* o de *cartón*?',
      opciones: ['plástica', 'plastica', 'plástico', 'plastico', 'cartón', 'carton', 'tela'],
    },
    {
      nombre: 'tamano',
      pregunta: '¿La necesitas tamaño *A4* u *oficio*?',
      opciones: ['a4', 'oficio', 'carta', 'legal'],
    },
  ],
  preguntaGenerica: 'Para la *carpeta*, ¿la prefieres con broche, con elástico o de argollas? ¿Plástica o de cartón?',
};
