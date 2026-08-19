import type { CategoriaConocimiento } from './types';

/**
 * PAPELES Y CARTULINAS — Cartulinas, resmas, papel bond, papel crepé, papel kraft, contact.
 *
 * Dimensiones:
 * - Cartulinas: tipo/tamaño (blanca A4 / IRIS colores / A3 pliego / escolar)
 * - Papel: tipo (bond / crepé / kraft / iris / contact)
 * - Presentación: resma, pliego, block, paquete
 */

export const CARTULINAS: CategoriaConocimiento = {
  familia: 'cartulina',
  disparadores: ['cartulina', 'cartulinas', 'cartulina iris', 'cartulina blanca'],
  dimensiones: [
    {
      nombre: 'tipo_tamano',
      pregunta: '¿Necesitas *paquete A4 de cartulinas blancas*, *paquete IRIS de colores* o *pliegos grandes A3*?',
      opciones: ['blancas a4', 'iris inen', 'iris a4', 'blanca a3', 'pliego a3', 'pliego'],
    },
    {
      nombre: 'presentacion',
      pregunta: '¿En *paquete* o *por pliego individual*?',
      opciones: ['paquete', 'paquete 20', 'paquete 25', 'pliego', 'unidad'],
    },
  ],
  preguntaGenerica: 'Para las *cartulinas*, ¿las necesitas en paquete A4 (blancas o de colores) o pliegos grandes?',
};

export const PAPELES_Y_RESMAS: CategoriaConocimiento = {
  familia: 'papel',
  disparadores: [
    'papel', 'papeles', 'resma', 'resmas', 'papel bond',
    'papel crepe', 'papel crepé', 'papel kraft', 'papel contact', 'contact', 'block'
  ],
  dimensiones: [
    {
      nombre: 'tipo_papel',
      pregunta: '¿Qué tipo de papel necesitas? (*Resma bond A4*, *block de papel iris*, *papel crepé*, *papel kraft* o *papel contact* para forrar)',
      opciones: [
        'resma', 'resma bond', 'resma a4',
        'block papel iris', 'block',
        'papel crepe', 'papel crepé',
        'papel kraft', 'kraft',
        'papel contact', 'contact', 'rollo contact',
        'papel bond pliego', 'pliego bond'
      ],
    },
  ],
  preguntaGenerica: '¿Qué tipo de papel buscas? ¿Resma bond A4, block de papel iris, papel crepé o papel contact?',
};
