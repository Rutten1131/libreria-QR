/**
 * variantService.ts
 * Motor de resolución de variantes y ambigüedades.
 * Cruza el conocimiento general de papelería (/server/knowledge/)
 * con el inventario REAL del tenant en stock para generar preguntas precisas.
 */

import { buscarCategoriaParaItem, CategoriaConocimiento } from '../knowledge/index';

export interface CandidatoProducto {
  id: string;
  nombre: string;
  precio: number;
  familia?: string;
  disponible?: boolean;
}

export interface ResultadoAmbiguedad {
  esAmbiguo: boolean;
  categoria?: CategoriaConocimiento;
  preguntaSugerida?: string;
  opcionesDisponibles: CandidatoProducto[];
}

/**
 * Normaliza un texto para comparaciones sin tildes ni caracteres extraños
 */
function norm(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determina si el texto del cliente ya contiene todas las especificaciones necesarias
 * para evitar hacer preguntas innecesarias cuando el cliente fue súper claro.
 */
function esDetalleCompleto(itemTexto: string, cat: CategoriaConocimiento): boolean {
  const textoNorm = norm(itemTexto);

  if (cat.familia === 'cuaderno') {
    const tieneRayado = ['cuadro', 'linea', 'dibujo', 'blanco'].some((r) => textoNorm.includes(r));
    const tieneTipo = ['cosido', 'espiral', 'grapado', 'parvulario'].some((t) => textoNorm.includes(t));
    return tieneRayado && tieneTipo;
  }

  if (cat.familia === 'pinturas') {
    return ['12', '24', '36', '6'].some((num) => textoNorm.includes(num));
  }

  if (cat.familia === 'goma') {
    return ['liquida', 'barra', 'silicona'].some((t) => textoNorm.includes(t));
  }

  if (cat.familia === 'fomix') {
    return ['llano', 'liso', 'escarchado', 'glitter'].some((t) => textoNorm.includes(t));
  }

  return false;
}

/**
 * Analiza un ítem pedido por el cliente contra el inventario real del tenant.
 * Devuelve si es ambiguo y la pregunta enriquecida con las opciones REALES en stock.
 */
export function detectarAmbiguedad(
  itemTexto: string,
  candidatosEnStock: CandidatoProducto[]
): ResultadoAmbiguedad {
  if (!candidatosEnStock || candidatosEnStock.length <= 1) {
    return { esAmbiguo: false, opcionesDisponibles: candidatosEnStock || [] };
  }

  const categoria = buscarCategoriaParaItem(itemTexto);

  // Si el cliente ya fue específico, no molestamos con preguntas
  if (categoria && esDetalleCompleto(itemTexto, categoria)) {
    return { esAmbiguo: false, categoria, opcionesDisponibles: candidatosEnStock };
  }

  // Filtrar y tomar máximo 4 opciones más representativas para no saturar WhatsApp
  const opcionesTop = candidatosEnStock.slice(0, 4);
  const opcionesTexto = opcionesTop
    .map((opc) => `• *${opc.nombre}* ($${opc.precio.toFixed(2)})`)
    .join('\n');

  let pregunta = `Para *${itemTexto}*, tenemos varias opciones en stock:\n${opcionesTexto}\n👉 ¿Cuál de estas prefieres?`;

  if (categoria) {
    // Buscar la dimensión prioritaria que no esté clara
    const dimensionNoResuelta = categoria.dimensiones.find((dim) => {
      const textoNorm = norm(itemTexto);
      return !dim.opciones.some((opc) => textoNorm.includes(norm(opc)));
    });

    if (dimensionNoResuelta?.pregunta) {
      pregunta = `Para *${itemTexto}*, ${dimensionNoResuelta.pregunta}\n\nTenemos en stock:\n${opcionesTexto}`;
    } else if (categoria.preguntaGenerica) {
      pregunta = `${categoria.preguntaGenerica}\n\nOpciones disponibles en tienda:\n${opcionesTexto}`;
    }
  }

  return {
    esAmbiguo: true,
    categoria: categoria || undefined,
    preguntaSugerida: pregunta,
    opcionesDisponibles: opcionesTop,
  };
}
