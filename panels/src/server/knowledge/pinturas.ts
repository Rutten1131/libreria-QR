import type { CategoriaConocimiento } from './types';

/**
 * PINTURAS — colores, marcadores, crayones, tizas, témperas, pinceles.
 *
 * Dimensiones:
 * Pinturas de color → cantidad (12/24/36), grosor (delgadas/gruesas/triangulares)
 * Marcadores → tipo (escolares / doble punta / tiza líquida / permanente)
 * Crayones → cantidad (12/24), grosor (delgados/gruesos/jumbo)
 * Temperas → tamaño (frasco 250ml / set completo), colores específicos
 * Pinceles → número y tipo de pelo
 */

export const PINTURAS_COLOR: CategoriaConocimiento = {
  familia: 'pinturas',
  disparadores: [
    'pintura', 'pinturas', 'colores', 'lápices de colores', 'lapices de colores',
    'color', 'caja de colores', 'caja de pinturas',
  ],
  dimensiones: [
    {
      nombre: 'cantidad',
      pregunta: '¿Los prefieres de *12 colores* o de *24 colores*?',
      opciones: ['12 colores', '12c', '24 colores', '24c', '36 colores', '6 colores'],
    },
    {
      nombre: 'grosor',
      pregunta: '¿Los prefieres *delgados* (estándar), *gruesos* o *triangulares*?',
      opciones: ['delgadas', 'delgados', 'delgada', 'largas', 'largos', 'gruesas', 'gruesos', 'jumbo', 'triangulares', 'triplus'],
    },
    {
      nombre: 'marca',
      pregunta: '¿Prefieres alguna marca en especial?',
      opciones: ['faber', 'faber-castell', 'norma', 'pelikan', 'staedtler', 'giotto', 'crayola'],
    },
  ],
  preguntaGenerica: 'Para las *pinturas de colores*, ¿las prefieres de 12 o de 24 colores? ¿Delgadas o gruesas?',
};

export const MARCADORES: CategoriaConocimiento = {
  familia: 'marcador',
  disparadores: [
    'marcador', 'marcadores', 'plumón', 'plumones', 'rotulador',
    'rotuladores', 'markers', 'tiza líquida', 'tiza liquida', 'marker',
  ],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: '¿Buscas *marcadores escolares normales*, *doble punta*, *de tiza líquida* o *permanentes*?',
      opciones: [
        'escolares', 'escolar', 'punta fina', 'fino',
        'doble punta', 'doble',
        'tiza líquida', 'tiza liquida', 'pizarrón', 'pizarron',
        'permanente', 'permanentes',
      ],
    },
    {
      nombre: 'cantidad',
      pregunta: '¿Los necesitas en *caja de 12* o *por unidad*?',
      opciones: ['12 colores', 'caja 12', 'unidad', 'por unidad', 'suelto'],
    },
  ],
  preguntaGenerica: 'Para los *marcadores*, ¿buscas escolares normales, doble punta, de tiza líquida o permanentes?',
};

export const CRAYONES: CategoriaConocimiento = {
  familia: 'crayones',
  disparadores: ['crayón', 'crayon', 'crayones', 'crayones', 'cera', 'ceras'],
  dimensiones: [
    {
      nombre: 'grosor',
      pregunta: '¿Los prefieres *delgados* o *gruesos/jumbo*?',
      opciones: ['delgados', 'delgadas', 'gruesos', 'gruesas', 'jumbo'],
    },
    {
      nombre: 'cantidad',
      pregunta: '¿Los necesitas en *caja de 12* o *de 24*?',
      opciones: ['12 unidades', '12u', '24 unidades', '24u'],
    },
  ],
  preguntaGenerica: 'Para los *crayones*, ¿los prefieres delgados o gruesos/jumbo? ¿Caja de 12 o de 24?',
};

export const TEMPERAS: CategoriaConocimiento = {
  familia: 'tempera',
  disparadores: ['témpera', 'tempera', 'témperas', 'temperas', 'pintura lavable', 'pintura al agua'],
  dimensiones: [
    {
      nombre: 'presentacion',
      pregunta: '¿La necesitas en *frasco individual* o *set completo*?',
      opciones: ['frasco', 'frasco 250ml', 'set', 'kit', 'caja de témperas'],
    },
    {
      nombre: 'color',
      pregunta: '¿Necesitas un color específico?',
      opciones: ['rojo', 'azul', 'amarillo', 'verde', 'negro', 'blanco', 'naranja', 'morado'],
    },
  ],
  preguntaGenerica: '¿La témpera la necesitas en frasco individual o set completo? ¿Algún color específico?',
};

export const PINCELES: CategoriaConocimiento = {
  familia: 'pincel',
  disparadores: ['pincel', 'pinceles', 'brocha', 'brochas'],
  dimensiones: [
    {
      nombre: 'numero',
      pregunta: '¿Qué número de pincel necesitas? (N° 8, N° 16, etc.)',
      opciones: ['n° 8', 'no 8', 'n8', 'n° 16', 'no 16', 'n16', 'n° 4', 'no 4'],
    },
    {
      nombre: 'tipo',
      pregunta: '¿Lo prefieres *plano* o *redondo*?',
      opciones: ['plano', 'redondo', 'pelo de cerda', 'cerda', 'nylon'],
    },
  ],
  preguntaGenerica: '¿Qué número de pincel necesitas y lo prefieres plano o redondo?',
};
