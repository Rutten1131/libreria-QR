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
  disparadores: ['clips', 'clip', 'grapas', 'grapadora', 'perforadora', 'chinchetas'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: '¿Buscas *clips mariposa*, *clips estándar* o *caja de grapas*?',
      opciones: ['mariposa', 'clip estándar', 'grapas 26/6', 'grapas', 'grapadora'],
    },
  ],
  preguntaGenerica: '¿Buscas caja de clips (mariposa o estándar) o caja de grapas?',
};
