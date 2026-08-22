import type { CategoriaConocimiento } from './types';

/**
 * OFICINA Y ACCESORIOS — Clips, grapas, cintas adhesivas y masking.
 *
 * Dimensiones:
 * - Cintas: tipo (masking tape pega fuerte / adhesiva transparente de embalaje o pequeña)
 * - Clips: tipo (mariposa / estándar)
 * - Grapas: tamaño estándar 26/6
 */

export const CINTAS_ADHESIVAS: CategoriaConocimiento = {
  familia: 'cintas',
  disparadores: ['cinta', 'cintas', 'masking', 'maskin', 'tape', 'cinta adhesiva', 'cinta de embalaje', 'diurex', 'scotch'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: '¿Necesitas *cinta masking de papel* (pega fuerte) o *cinta transparente*?',
      opciones: ['masking', 'maskin', 'papel', 'transparente', 'embalaje', 'fina'],
    },
  ],
  preguntaGenerica: 'Para la *cinta*, ¿necesitas cinta masking o cinta adhesiva transparente?',
};

export const ACCESORIOS_OFICINA: CategoriaConocimiento = {
  familia: 'oficina',
  disparadores: ['clips', 'clip', 'grapas', 'grapadora', 'perforadora', 'chinchetas', 'oficina', 'para oficina', 'material de oficina', 'articulos de oficina', 'artículos de oficina', 'suministros de oficina', 'cosas de oficina'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: 'Para oficina disponemos de *resmas de papel bond*, *esferos*, *carpetas*, *tijeras*, *clips* y *gomas*. ¿Qué te gustaría cotizar?',
      opciones: ['resma', 'papel bond', 'esferos', 'carpetas', 'tijeras', 'clips', 'gomas'],
    },
  ],
  preguntaGenerica: 'Para oficina disponemos de resmas de papel bond, esferos, carpetas, tijeras y clips. ¿Qué necesitas cotizar?',
};
