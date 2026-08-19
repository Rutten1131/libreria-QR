import type { CategoriaConocimiento } from './types';

/**
 * ESCRITURA — lápices, borradores, sacapuntas, correctores, reglas, compases.
 *
 * Dimensiones de variante:
 * Lápiz → graduación (HB / 2B / triangular / mecánico)
 * Borrador → tipo (miga blanca / plástico / queso)
 * Sacapuntas → tipo (metálico / con depósito / eléctrico)
 * Corrector → presentación (líquido / cinta)
 */

export const LAPICES: CategoriaConocimiento = {
  familia: 'lapiz',
  disparadores: [
    'lápiz', 'lapiz', 'lápices', 'lapices',
    'lapicero', 'lapiceros', 'lápicero',
  ],
  dimensiones: [
    {
      nombre: 'graduacion',
      pregunta: '¿Lo prefieres *HB* (escolar estándar), *2B* (para dibujo) o *triangular*?',
      opciones: ['hb', 'hb n', 'n° 2', 'no 2', '2b', 'triangular', 'triplus', 'mecánico', 'mecanico'],
    },
    {
      nombre: 'marca',
      pregunta: '¿Tienes preferencia de marca?',
      opciones: ['faber', 'faber-castell', 'mongol', 'staedtler', 'pentel', 'bic'],
    },
  ],
  preguntaGenerica: 'Para el *lápiz*, ¿lo prefieres HB escolar estándar, 2B para dibujo o triangular?',
};

export const BORRADORES: CategoriaConocimiento = {
  familia: 'borrador',
  disparadores: ['borrador', 'borradores', 'goma de borrar'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: '¿Lo prefieres *blanco de miga* o *tipo queso*?',
      opciones: ['miga', 'blanco', 'queso', 'plástico', 'plastico'],
    },
  ],
  preguntaGenerica: 'Para el *borrador*, ¿lo prefieres blanco de miga o tipo queso?',
};

export const SACAPUNTAS: CategoriaConocimiento = {
  familia: 'sacapuntas',
  disparadores: ['sacapuntas', 'afilador', 'tajalápiz', 'tajador'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: '¿Lo prefieres *metálico doble servicio* o *con depósito plástico*?',
      opciones: ['metálico', 'metalico', 'doble servicio', 'depósito', 'deposito', 'con depósito'],
    },
  ],
  preguntaGenerica: 'Para el *sacapuntas*, ¿lo prefieres metálico doble servicio o con depósito plástico?',
};

export const CORRECTORES: CategoriaConocimiento = {
  familia: 'corrector',
  disparadores: ['corrector', 'correctores', 'liquid paper', 'tipp-ex', 'tipex', 'blanco corrector'],
  dimensiones: [
    {
      nombre: 'presentacion',
      pregunta: '¿Lo prefieres *líquido* o en *cinta correctora*?',
      opciones: ['líquido', 'liquido', 'cinta', 'roller', 'tape'],
    },
  ],
  preguntaGenerica: 'Para el *corrector*, ¿lo prefieres líquido o en cinta correctora?',
};

export const REGLAS: CategoriaConocimiento = {
  familia: 'regla',
  disparadores: ['regla', 'reglas', 'escuadra', 'transportador', 'juego de geometría', 'compas'],
  dimensiones: [
    {
      nombre: 'tipo',
      pregunta: '¿Necesitas *regla simple*, *juego de geometría completo* (escuadra + transportador + compás) o solo el *compás*?',
      opciones: ['regla', 'escuadra', 'transportador', 'compás', 'compas', 'juego de geometría', 'juego geometria', 'set'],
    },
  ],
  preguntaGenerica: '¿Necesitas regla simple, juego de geometría completo o solo el compás?',
};
