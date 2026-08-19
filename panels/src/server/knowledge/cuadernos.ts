import type { CategoriaConocimiento } from './types';

/**
 * CUADERNOS — todo lo que el bot sabe sobre cuadernos.
 *
 * Dimensiones de variante en orden de prioridad:
 * 1. Rayado  (cuadros / líneas / 4 líneas / dibujo)
 * 2. Encuadernación  (cosido / espiral / grapado / parvulario)
 * 3. Número de hojas  (50 / 100 / 200)
 * 4. Nivel  (parvulario / universitario / escolar)
 *
 * El bot preguntará solo por las dimensiones que generen ambigüedad real
 * después de filtrar contra el inventario del tenant.
 */
export const CUADERNOS: CategoriaConocimiento = {
  familia: 'cuaderno',
  disparadores: [
    'cuaderno', 'cuadernos', 'libreta', 'libretas',
    'cuad', 'cuadernillo', 'cuadernillos',
  ],
  dimensiones: [
    {
      nombre: 'rayado',
      pregunta: '¿Lo prefieres a *cuadros* o a *líneas*?',
      opciones: ['cuadros', 'líneas', 'lineas', '4 líneas', '4 lineas', 'dibujo', 'blanco'],
    },
    {
      nombre: 'encuadernacion',
      pregunta: '¿Lo prefieres *cosido* o con *espiral*?',
      opciones: ['cosido', 'espiral', 'grapado', 'parvulario', 'anillado'],
    },
    {
      nombre: 'hojas',
      pregunta: '¿De cuántas hojas lo necesitas?',
      opciones: ['50 hojas', '100 hojas', '200 hojas', '50h', '100h', '200h'],
    },
    {
      nombre: 'nivel',
      pregunta: '¿Es para nivel parvulario o escolar/universitario?',
      opciones: ['parvulario', 'universitario', 'escolar', 'college'],
    },
  ],
  preguntaGenerica: 'Para el *cuaderno*, ¿me puedes indicar si lo prefieres a cuadros o a líneas, y si lo quieres cosido o con espiral?',
};
