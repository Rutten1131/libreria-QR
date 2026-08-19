/**
 * REGISTRO CENTRAL DE CONOCIMIENTO DE PAPELERÍA (LibreríaQR)
 * 
 * Exporta todas las categorías modulares de conocimiento.
 * Cualquier nueva categoría que se agregue en el futuro simplemente
 * se crea como un archivo .ts en esta carpeta y se incluye aquí.
 */

export * from './types';
import type { CategoriaConocimiento } from './types';

import { CUADERNOS } from './cuadernos';
import { CARPETAS } from './carpetas';
import { LAPICES, BORRADORES, SACAPUNTAS, CORRECTORES, REGLAS } from './escritura';
import { PINTURAS_COLOR, MARCADORES, CRAYONES, TEMPERAS, PINCELES } from './pinturas';
import { CARTULINAS, PAPELES_Y_RESMAS } from './papeles';
import { GOMAS_Y_ADHESIVOS, TIJERAS, FOMIX, PLASTILINA } from './manualidades';
import { CINTAS_ADHESIVAS, ACCESORIOS_OFICINA } from './oficina';
import { PALILLOS, AGENDAS } from './varios';

export const TODAS_LAS_CATEGORIAS: CategoriaConocimiento[] = [
  CUADERNOS,
  CARPETAS,
  LAPICES,
  BORRADORES,
  SACAPUNTAS,
  CORRECTORES,
  REGLAS,
  PINTURAS_COLOR,
  MARCADORES,
  CRAYONES,
  TEMPERAS,
  PINCELES,
  CARTULINAS,
  PAPELES_Y_RESMAS,
  GOMAS_Y_ADHESIVOS,
  TIJERAS,
  FOMIX,
  PLASTILINA,
  CINTAS_ADHESIVAS,
  ACCESORIOS_OFICINA,
  PALILLOS,
  AGENDAS,
];

/**
 * Encuentra la categoría de conocimiento adecuada para un texto dado.
 */
export function buscarCategoriaParaItem(textoItem: string): CategoriaConocimiento | null {
  const textoNorm = textoItem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const cat of TODAS_LAS_CATEGORIAS) {
    if (cat.disparadores.some((disp) => {
      const dispNorm = disp.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return textoNorm.includes(dispNorm);
    })) {
      return cat;
    }
  }
  return null;
}
