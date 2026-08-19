import type { CategoriaConocimiento } from './types';

/**
 * MANUALIDADES Y PEGAS — Gomas, siliconas, tijeras, fomix, plastilinas.
 *
 * Dimensiones:
 * - Goma: presentación (líquida blanca 250ml / barra 40g / barra 20g / silicona líquida / barras de silicona)
 * - Tijeras: tipo (escolar punta redonda / zurdos / zig-zag)
 * - Fomix: tipo (llano A4 / escarchado A4 / pliego)
 * - Plastilina: tamaño (caja 12 barras grande / pequeña)
 */

export const GOMAS_Y_ADHESIVOS: CategoriaConocimiento = {
  familia: 'goma',
  disparadores: [
    'goma', 'gomas', 'pega', 'pegamento', 'silicona',
    'barra de silicona', 'silicona liquida', 'silicona líquida', 'pritt'
  ],
  dimensiones: [
    {
      nombre: 'presentacion',
      pregunta: '¿La prefieres *líquida blanca*, *en barra* (40g o 20g) o *silicona* (líquida o en barras)?',
      opciones: [
        'líquida blanca', 'liquida blanca', '250ml',
        'en barra 40g', 'barra 40g', 'en barra 20g', 'barra 20g', 'en barra',
        'silicona líquida', 'silicona liquida', 'barras de silicona'
      ],
    },
    {
      nombre: 'marca',
      pregunta: '¿Prefieres alguna marca en particular?',
      opciones: ['pelikan', 'pritt', 'uhu', 'artesco'],
    },
  ],
  preguntaGenerica: 'Para el *pegamento*, ¿lo prefieres líquido blanco, en barra (grande o mediana) o silicona?',
};

export const TIJERAS: CategoriaConocimiento = {
  familia: 'tijera',
  disparadores: ['tijera', 'tijeras', 'tijeritas'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: '¿La necesitas *escolar punta redonda estándar* o *especial para zurdos*?',
      opciones: ['punta redonda', 'escolar', 'zurdos', 'para zurdos', 'zigzag', 'formas'],
    },
  ],
  preguntaGenerica: 'Para la *tijera*, ¿la necesitas estándar de punta redonda o especial para zurdos?',
};

export const FOMIX: CategoriaConocimiento = {
  familia: 'fomix',
  disparadores: ['fomix', 'fomy', 'foamy', 'espuma eva', 'goma eva'],
  dimensiones: [
    {
      nombre: 'acabado',
      pregunta: '¿Lo necesitas *fomix llano* o *fomix escarchado / con brillantina*?',
      opciones: ['llano', 'liso', 'escarchado', 'brillante', 'glitter'],
    },
  ],
  preguntaGenerica: 'Para el *fomix*, ¿lo necesitas paquete llano o paquete escarchado con brillantina?',
};

export const PLASTILINA: CategoriaConocimiento = {
  familia: 'plastilina',
  disparadores: ['plastilina', 'plastilinas', 'masa moldeable', 'play doh'],
  dimensiones: [
    {
      nombre: 'tamano',
      pregunta: '¿Prefieres el paquete *grande de 12 barras* o tamaño pequeño?',
      opciones: ['grande 12', '12 barras', 'pequeña', '6 barras'],
    },
  ],
  preguntaGenerica: 'Para la *plastilina*, ¿la prefieres paquete grande de 12 barras o pequeña?',
};
