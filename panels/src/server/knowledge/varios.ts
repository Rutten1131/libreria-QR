import type { CategoriaConocimiento } from './types';

/**
 * PALILLOS Y MADERAS — Descubierto en chats reales.
 *
 * Dimensiones:
 * - Tipo: Palillos tipo pincho (brocheta) vs Palillos de madera de balsa para maquetas.
 */
export const PALILLOS: CategoriaConocimiento = {
  familia: 'palillos',
  disparadores: ['palillo', 'palillos', 'pincho', 'pinchos', 'madera de balsa', 'palito', 'palitos', 'p/pincho', 'p/balsa'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: '¿Los necesitas *palillos tipo pincho* o *palillos de madera de balsa* para maquetería?',
      opciones: ['pincho', 'tipo pincho', 'balsa', 'madera de balsa', 'maqueta', 'chuzo'],
    },
    {
      nombre: 'tamano',
      pregunta: '¿De qué tamaño o grosor los prefieres?',
      opciones: ['delgados', 'gruesos', 'largos', 'pequeños'],
    },
  ],
  preguntaGenerica: 'Para los *palillos*, ¿los prefieres tipo pincho o madera de balsa para maquetas?',
};

/**
 * AGENDAS Y LIBRETAS — Descubierto en catálogo real (80+ modelos).
 *
 * Dimensiones:
 * - Tipo: Agenda escolar anual vs Libreta anillada de notas
 * - Rayado: Cuadros vs 1 Línea
 */
export const AGENDAS: CategoriaConocimiento = {
  familia: 'agendas',
  disparadores: ['agenda', 'agendas', 'agenda escolar', 'agenda anillada', 'diario'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: '¿Buscas *agenda escolar institucional* (ej. Coquito, Artesco) o *agenda/libreta anillada decorativa*?',
      opciones: ['escolar', 'coquito', 'artesco', 'anillada', 'kawai', 'labubu', 'gato', 'kitty'],
    },
    {
      nombre: 'rayado',
      pregunta: '¿La prefieres a *cuadros* o a *líneas*?',
      opciones: ['cdrs', 'cuadros', '1l', 'lineas', 'líneas'],
    },
  ],
  preguntaGenerica: 'Para la *agenda*, ¿buscas agenda escolar o agenda anillada de notas? ¿A cuadros o a líneas?',
};

export const UTILES_ESCOLARES: CategoriaConocimiento = {
  familia: 'escolar',
  disparadores: ['estudiantes', 'estudiante', 'escolares', 'escolar', 'utiles', 'útiles', 'material escolar', 'materiales escolares', 'para estudiar', 'para estudiantes'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: 'Para estudiantes disponemos de *cuadernos*, *lápices*, *esferos*, *tijeras*, *gomas* y *carpetas*. ¿Qué te gustaría cotizar?',
      opciones: ['cuadernos', 'lapices', 'esferos', 'tijeras', 'gomas', 'carpetas'],
    },
  ],
  preguntaGenerica: 'Para estudiantes disponemos de cuadernos, lápices, esferos, tijeras, gomas y carpetas. ¿Qué necesitas cotizar?',
};
