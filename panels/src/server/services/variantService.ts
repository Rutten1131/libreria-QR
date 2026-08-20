import { buscarCategoriaParaItem, CategoriaConocimiento } from '../knowledge/index';
import { corregirTypos, formatearOpcionesNumeradas, limpiarNombreERP, limpiarFraseConsulta } from './displayService';

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
 * Normaliza un texto para comparaciones sin tildes ni caracteres extraños,
 * aplicando primero la corrección de errores tipográficos frecuentes.
 */
export function norm(texto: string): string {
  const corregido = corregirTypos(texto || '');
  return corregido
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae cantidades expresadas en lenguaje natural ecuatoriano/cotidiano
 * ej: "una docena" -> 12, "media docena" -> 6, "un par" -> 2, "3 cuadernos" -> 3
 * IMPORTANTE: No confunde atributos del producto (como "100 hojas", "12 colores", "90 gr") con cantidades a comprar.
 */
export function extraerCantidadNatural(texto: string): number | null {
  const t = norm(texto);

  // 1. Detección de lotes explícitos primero
  if (t.includes('media docena') || t.includes('1/2 docena')) return 6;
  if (t.includes('una docena') || t.includes('1 docena') || t.includes('la docena') || t.includes('docena') || t.includes('dicena')) return 12;
  if (t.includes('dos docenas') || t.includes('2 docenas')) return 24;
  if (t.includes('tres docenas') || t.includes('3 docenas')) return 36;
  if (t.includes('un par') || t.includes('par de') || t.includes('pares')) return 2;
  if (t.includes('un ciento') || t.includes('ciento')) return 100;
  if (t.includes('medio ciento')) return 50;

  // 2. Limpiar especificaciones técnicas del producto para no confundir atributos con cantidad
  // ej: "100 hojas", "100h", "12 colores", "24col", "90 gr", "50h"
  const textoSinAtributos = t
    .replace(/\b\d+\s*(hojas|h|pag|paginas|colores|col|gr|grs|gramos|cm|mm|oz|ml|piezas|pz|unidades\s*por\s*caja)\b/gi, ' ')
    .replace(/\b(100h|50h|200h|160h|80h|145h|12col|16col|24col|36col|6col|90gr|75gr)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 3. Buscar cantidad explícita asociada a intención de compra
  // ej: "quiero 3", "deme 2", "2 cuadernos", "5 unidades", "comprar 4"
  const matchIntencion = textoSinAtributos.match(
    /\b(?:quiero|necesito|deme|dame|venda|mandame|traeme|pedir|cotizar|comprar|son)?\s*(\d+)\s*(?:cuadernos?|lapices?|esferos?|boligrafos?|gomas?|borradores?|carpetas?|cajas?|unidades?|unid|uds)?\b/
  );
  if (matchIntencion && matchIntencion[1]) {
    const num = parseInt(matchIntencion[1], 10);
    if (num > 0 && num <= 200) return num;
  }

  // 4. Buscar si empieza con un número directo o contiene número suelto residual
  const matchResidual = textoSinAtributos.match(/\b(\d+)\b/);
  if (matchResidual) {
    const num = parseInt(matchResidual[1], 10);
    // Solo si es una cantidad razonable para compras al por menor (< 100)
    if (num > 0 && num <= 50) return num;
  }

  // 5. Palabras numerales simples al inicio o tras palabras de compra
  if (/\b(?:quiero|necesito|deme|dame|comprar)?\s*(un|uno|una)\s+(?:cuaderno|lapiz|esfero|goma|borrador|carpeta|caja|unidad)\b/.test(textoSinAtributos)) return 1;
  if (/\b(?:quiero|necesito|deme|dame|comprar)?\s*(dos)\b/.test(textoSinAtributos)) return 2;
  if (/\b(?:quiero|necesito|deme|dame|comprar)?\s*(tres)\b/.test(textoSinAtributos)) return 3;
  if (/\b(?:quiero|necesito|deme|dame|comprar)?\s*(cuatro)\b/.test(textoSinAtributos)) return 4;
  if (/\b(?:quiero|necesito|deme|dame|comprar)?\s*(cinco)\b/.test(textoSinAtributos)) return 5;
  if (/\b(?:quiero|necesito|deme|dame|comprar)?\s*(seis)\b/.test(textoSinAtributos)) return 6;
  if (/\b(?:quiero|necesito|deme|dame|comprar)?\s*(diez)\b/.test(textoSinAtributos)) return 10;
  if (/\b(?:quiero|necesito|deme|dame|comprar)?\s*(doce)\b/.test(textoSinAtributos)) return 12;

  return null;
}

/**
 * Filtra candidatos de inventario estrictamente por la categoría/familia solicitada,
 * evitando que palabras genéricas como números coincidan con productos de otra familia.
 */
export function filtrarCandidatosPorCategoria(
  categoria: CategoriaConocimiento | null,
  textoItem: string,
  inventario: CandidatoProducto[]
): CandidatoProducto[] {
  const textoNorm = norm(textoItem);
  const disparadores = categoria?.disparadores.map(norm) || [];

  // 1. Filtrar productos que pertenezcan a la familia o tengan el sustantivo principal
  let candidatos = inventario.filter((p) => {
    // Si tiene precio ridículo o placeholder (< 0.15) de ERP corrupto, descartar a menos que no haya más
    if (p.precio < 0.15 && inventario.some((otro) => otro.precio >= 0.50)) {
      return false;
    }

    const pNombre = norm(p.nombre);
    const pFam = norm(p.familia || '');

    if (categoria) {
      const matchFamilia = pFam.includes(categoria.familia) || categoria.familia.includes(pFam);
      const matchDisparador = disparadores.some((d) => pNombre.includes(d));
      return matchFamilia || matchDisparador;
    }

    // Si no hay categoría definida, coincidencia de palabras significativas (>3 letras)
    const tokens = textoNorm.split(' ').filter((t) => t.length > 3 && !['para', 'con', 'las', 'los', 'unas', 'unos'].includes(t));
    return tokens.some((t) => pNombre.includes(t));
  });

  // 2. Si el texto tiene atributos específicos (cuadros, lineas, espiral, 100h, etc.), filtrar más fino
  if (textoNorm.includes('cuadro') || textoNorm.includes('cdrs') || textoNorm.includes('cdros')) {
    const filtrados = candidatos.filter((p) => {
      const pn = norm(p.nombre);
      return pn.includes('cuadro') || pn.includes('cdrs') || pn.includes('cdros') || pn.includes('cd ');
    });
    if (filtrados.length > 0) candidatos = filtrados;
  } else if (textoNorm.includes('linea') || textoNorm.includes('1l')) {
    const filtrados = candidatos.filter((p) => {
      const pn = norm(p.nombre);
      return pn.includes('linea') || pn.includes('1l');
    });
    if (filtrados.length > 0) candidatos = filtrados;
  }

  if (textoNorm.includes('espiral') || textoNorm.includes('anillad') || textoNorm.includes('esp')) {
    const filtrados = candidatos.filter((p) => {
      const pn = norm(p.nombre);
      return pn.includes('espiral') || pn.includes('anillad') || pn.includes('esp');
    });
    if (filtrados.length > 0) candidatos = filtrados;
  } else if (textoNorm.includes('cosido')) {
    const filtrados = candidatos.filter((p) => {
      const pn = norm(p.nombre);
      return pn.includes('cosido') || pn.includes('parvulario');
    });
    if (filtrados.length > 0) candidatos = filtrados;
  }

  if (textoNorm.includes('100') || textoNorm.includes('100h')) {
    const filtrados = candidatos.filter((p) => norm(p.nombre).includes('100'));
    if (filtrados.length > 0) candidatos = filtrados;
  } else if (textoNorm.includes('50') || textoNorm.includes('50h')) {
    const filtrados = candidatos.filter((p) => norm(p.nombre).includes('50'));
    if (filtrados.length > 0) candidatos = filtrados;
  }

  return candidatos;
}

/**
 * Resuelve la opción elegida por el cliente a partir de su respuesta en lenguaje natural:
 * - Por precio: "el de 3.50", "el de $3.40" (fuzzy matching de precio cercano)
 * - Por orden: "el primero", "el segundo", "el 1", "opción 2"
 * - Por marca o palabra clave: "Stanford", "Norma", "Jean Book", "el más barato"
 */
export function resolverSeleccionOpcion(
  textoRespuesta: string,
  opcionesPresentadas: CandidatoProducto[]
): CandidatoProducto | null {
  if (!opcionesPresentadas || opcionesPresentadas.length === 0) return null;

  const t = norm(textoRespuesta);

  // 1. Coincidencia por orden o posición
  if (/\b(primero|primera|el 1|opcion 1|1ero|1ra)\b/.test(t) && opcionesPresentadas.length >= 1) {
    return opcionesPresentadas[0];
  }
  if (/\b(segundo|segunda|el 2|opcion 2|2do|2da)\b/.test(t) && opcionesPresentadas.length >= 2) {
    return opcionesPresentadas[1];
  }
  if (/\b(tercero|tercera|el 3|opcion 3|3ro|3ra)\b/.test(t) && opcionesPresentadas.length >= 3) {
    return opcionesPresentadas[2];
  }
  if (/\b(cuarto|cuarta|el 4|opcion 4|4to|4ta)\b/.test(t) && opcionesPresentadas.length >= 4) {
    return opcionesPresentadas[3];
  }
  if (/\b(ultimo|ultima|el ultimo)\b/.test(t)) {
    return opcionesPresentadas[opcionesPresentadas.length - 1];
  }

  // 2. Coincidencia por "el más barato" o "económico"
  if (/\b(barato|economico|mas economico|menor precio)\b/.test(t)) {
    return [...opcionesPresentadas].sort((a, b) => a.precio - b.precio)[0];
  }

  // 3. Coincidencia por precio numérico (ej. "el de 3.50", "el de $3.40", "3.80")
  const matchPrecio = t.match(/(\d+[.,]\d{1,2}|\b\d+\b)/);
  if (matchPrecio) {
    const precioBuscado = parseFloat(matchPrecio[1].replace(',', '.'));
    if (!isNaN(precioBuscado) && precioBuscado > 0) {
      // Buscar la opción con precio más cercano (tolerancia +/- 0.30)
      let mejorOpcion: CandidatoProducto | null = null;
      let menorDiferencia = 999;

      for (const opc of opcionesPresentadas) {
        const diff = Math.abs(opc.precio - precioBuscado);
        if (diff < menorDiferencia && diff <= 0.35) {
          menorDiferencia = diff;
          mejorOpcion = opc;
        }
      }

      if (mejorOpcion) return mejorOpcion;
    }
  }

  // 4. Coincidencia por marca o palabra clave (ej. "Stanford", "Norma", "Jean Book", "Pelikan")
  for (const opc of opcionesPresentadas) {
    const opcNorm = norm(opc.nombre);
    const palabrasOpc = opcNorm.split(' ').filter((w) => w.length > 3 && !['cuaderno', 'universitario', 'hojas', 'cosido', 'espiral'].includes(w));
    for (const w of palabrasOpc) {
      if (t.includes(w)) {
        return opc;
      }
    }
  }

  return null;
}

/**
 * Determina si el texto del cliente ya contiene todas las especificaciones necesarias
 */
function esDetalleCompleto(itemTexto: string, cat: CategoriaConocimiento): boolean {
  const textoNorm = norm(itemTexto);

  if (cat.familia === 'cuaderno') {
    const tieneRayado = ['cuadro', 'linea', 'dibujo', 'blanco', 'cdrs', 'cdros', '1l', '4l'].some((r) => textoNorm.includes(r));
    const tieneTipo = ['cosido', 'espiral', 'grapado', 'parvulario', 'anillad', 'esp'].some((t) => textoNorm.includes(t));
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
 * Devuelve si es ambiguo y la pregunta enriquecida con las opciones REALES en stock numeradas.
 */
export function detectarAmbiguedad(
  itemTexto: string,
  candidatosEnStock: CandidatoProducto[],
  cantidad?: number
): ResultadoAmbiguedad {
  if (!candidatosEnStock || candidatosEnStock.length <= 1) {
    return { esAmbiguo: false, opcionesDisponibles: candidatosEnStock || [] };
  }

  const categoria = buscarCategoriaParaItem(itemTexto);

  // Si el cliente ya fue específico, no molestamos con preguntas
  if (categoria && esDetalleCompleto(itemTexto, categoria)) {
    return { esAmbiguo: false, categoria, opcionesDisponibles: candidatosEnStock };
  }

  // Filtrar candidatos para evitar productos con precios corruptos o de otra familia
  const candidatosLimpios = candidatosEnStock.filter((p) => p.precio >= 0.15 || candidatosEnStock.length === 1);
  const opcionesParaMostrar = candidatosLimpios.length > 0 ? candidatosLimpios : candidatosEnStock;

  // Filtrar y tomar máximo 4 opciones más representativas
  const opcionesTop = opcionesParaMostrar.slice(0, 4);
  const opcionesTexto = formatearOpcionesNumeradas(opcionesTop, cantidad);
  const nombreLimpioPregunta = limpiarFraseConsulta(itemTexto);

  let pregunta = `Para *${nombreLimpioPregunta}*, tenemos estas opciones en stock:\n\n${opcionesTexto}`;

  if (categoria) {
    const dimensionNoResuelta = categoria.dimensiones.find((dim) => {
      const textoNorm = norm(itemTexto);
      return !dim.opciones.some((opc) => textoNorm.includes(norm(opc)));
    });

    if (dimensionNoResuelta?.pregunta) {
      pregunta = `Para *${nombreLimpioPregunta}*, ${dimensionNoResuelta.pregunta}\n\n${opcionesTexto}`;
    } else if (categoria.preguntaGenerica) {
      pregunta = `${categoria.preguntaGenerica}\n\n${opcionesTexto}`;
    }
  }

  return {
    esAmbiguo: true,
    categoria: categoria || undefined,
    preguntaSugerida: pregunta,
    opcionesDisponibles: opcionesTop,
  };
}
