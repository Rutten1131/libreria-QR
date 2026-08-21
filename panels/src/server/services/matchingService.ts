// Servicio de matching inteligente: analiza útiles escolares y encuentra productos en el catálogo
import { Producto, Cotizacion, PedidoItem } from '../domain/entities';
import { getInventarioAsync } from '../adapters/inventarioAdapter';

export interface ItemEntrada {
  nombre: string;
  cantidad: number;
  productoId?: string;
}

type EntradaCotizar = string | ItemEntrada;

function esItem(obj: EntradaCotizar): obj is ItemEntrada {
  return typeof obj === 'object' && obj !== null && 'nombre' in obj;
}

function extraerCantidadDeTexto(texto: string): number {
  const match = texto.trim().match(/^(\d+)\b/);
  if (match) {
    const qty = parseInt(match[1], 10);
    if (qty > 0 && qty < 500) return qty;
  }
  return 1;
}

function desabreviar(palabra: string): string {
  // Abreviaturas reales de inventario de papelería
  if (palabra === 'cdrs' || palabra === 'cdros' || palabra === 'cuadro' || palabra === 'cuadros' || palabra === 'cd') return 'cuadros';
  if (palabra === '1l' || palabra === '1linea' || palabra === 'linea' || palabra === 'lineas' || palabra === '4l') return 'lineas';
  if (palabra === 'anillada' || palabra === 'anillado' || palabra === 'esp' || palabra === 'espiral' || palabra === 'cm') return 'espiral';
  if (palabra === '100h' || palabra === '100hojas') return '100 hojas';
  if (palabra === '50h' || palabra === '50hojas') return '50 hojas';
  if (palabra === '200h' || palabra === '200hojas') return '200 hojas';
  if (palabra === 'c/separador') return 'separador';
  if (palabra === 'p/pincho' || palabra === 'pincho' || palabra === 'pinchos') return 'pincho';
  if (palabra === 'p/balsa' || palabra === 'balsa') return 'balsa';
  if (palabra === 'plast' || palabra === 'plastico' || palabra === 'plastica') return 'plastico';
  if (palabra === 'bolig' || palabra === 'boligrafo' || palabra === 'boligrafos' || palabra === 'esfero' || palabra === 'esferos' || palabra === 'pluma' || palabra === 'plumas') return 'esfero';
  if (palabra === 'marc' || palabra === 'marcador' || palabra === 'marcadores') return 'marcador';
  if (palabra === 'pint' || palabra === 'pintura' || palabra === 'pinturas' || palabra === 'colores') return 'pintura';
  if (palabra === 'temp' || palabra === 'tempera' || palabra === 'temperas') return 'tempera';
  return palabra;
}

function lematizar(palabra: string): string {
  const desab = desabreviar(palabra);
  if (desab !== palabra) return desab;

  if (palabra.endsWith('ces') && palabra.length > 4) return palabra.slice(0, -3) + 'z'; // lapices -> lapiz
  if (palabra.endsWith('es') && palabra.length > 4 && !palabra.endsWith('les')) return palabra.slice(0, -2);
  if (palabra.endsWith('s') && palabra.length > 3 && !palabra.endsWith('as') && !palabra.endsWith('is')) return palabra.slice(0, -1);
  if (palabra === 'plastico' || palabra === 'plastica' || palabra === 'plasticas') return 'plastico';
  if (palabra === 'lapices' || palabra === 'lapiz') return 'lapiz';
  if (palabra === 'pinturas' || palabra === 'colores' || palabra === 'pintura') return 'pintura';
  if (palabra === 'cuadernos' || palabra === 'cuaderno') return 'cuaderno';
  if (palabra === 'borradores' || palabra === 'borrador') return 'borrador';
  if (palabra === 'tijeras' || palabra === 'tijera') return 'tijera';
  if (palabra === 'gomas' || palabra === 'pega' || palabra === 'goma') return 'goma';
  if (palabra === 'palillos' || palabra === 'palitos' || palabra === 'palillo') return 'palillo';
  if (palabra === 'agendas' || palabra === 'agenda') return 'agenda';
  if (palabra === 'esferos' || palabra === 'esfero' || palabra === 'boligrafo' || palabra === 'boligrafos') return 'esfero';
  if (palabra === 'bicolores' || palabra === 'bicolor') return 'bicolor';
  return palabra;
}

function normalizar(texto: string): string {
  const sinAcentos = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/c\/separador/g, ' con separador ')
    .replace(/p\/pincho/g, ' pincho ')
    .replace(/p\/balsa/g, ' balsa ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return sinAcentos.split(' ').map(lematizar).join(' ');
}

const STOPWORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'para', 'con', 'sin', 'por', 'en', 'del', 'al', 'y', 'o',
  'tipo', 'tamano', 'grande', 'pequeno', 'cosido', 'parvulario',
  'forrado', 'hoja', 'delgado', 'servicio', 'sobre', 'broche', 'caja'
]);

const NOUNS = [
  'cuaderno', 'lapiz', 'borrador', 'tijera', 'sacapuntas',
  'goma', 'resma', 'pintura', 'carpeta', 'regla', 'compas',
  'corrector', 'juego', 'marcador', 'palillo', 'agenda', 'fomix', 'plastilina',
  'esfero', 'boligrafo', 'tempera', 'pincel', 'cartulina', 'papel', 'silicona'
];

/**
 * Calcula similitud semántica y de tokens entre el ítem de la lista escolar y el producto de inventario.
 */
function calcularSimilitudInteligente(itemTexto: string, productoTexto: string): number {
  const itemNorm = normalizar(itemTexto);
  const prodNorm = normalizar(productoTexto);

  if (itemNorm === prodNorm) return 1.0;
  if (itemNorm.includes(prodNorm) || prodNorm.includes(itemNorm)) return 0.92;

  const itemTokens = itemNorm.split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t));
  const prodTokens = prodNorm.split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t));

  if (itemTokens.length === 0 || prodTokens.length === 0) return 0;

  // Claves diferenciales estrictas para no confundir cuadros con líneas o HB con 2B
  if (itemNorm.includes('cuadro') && prodNorm.includes('linea')) return 0;
  if (itemNorm.includes('linea') && prodNorm.includes('cuadro')) return 0;
  if (itemNorm.includes('2b') && prodNorm.includes('hb')) return 0;
  if (itemNorm.includes('hb') && prodNorm.includes('2b')) return 0;

  // Si el cliente pide cuadernos normales, NO emparejar con libros parvularios de preescolar
  if (!itemNorm.includes('parvulario') && prodNorm.includes('parvulario')) return 0;

  let matches = 0;
  let hasMainNoun = false;

  for (const pToken of prodTokens) {
    for (const iToken of itemTokens) {
      if (
        pToken === iToken ||
        (pToken.length >= 4 && iToken.length >= 4 && (pToken.startsWith(iToken) || iToken.startsWith(pToken)))
      ) {
        matches++;
        if (NOUNS.includes(pToken) || NOUNS.includes(iToken)) {
          hasMainNoun = true;
        }
        break;
      }
    }
  }

  if (!hasMainNoun) return 0;

  const matchRatio = matches / prodTokens.length;
  if (hasMainNoun && matchRatio >= 0.30) {
    return 0.70 + matchRatio * 0.28;
  }

  return 0;
}

/**
 * Filtra líneas de ruido que no son útiles escolares (instrucciones, notas, mensajes de IA)
 */
function esLineaValida(texto: string): boolean {
  const low = texto.toLowerCase().trim();
  if (low.length < 3) return false;
  if (
    low.startsWith('no se observan') ||
    low.startsWith('no se encontraron') ||
    low.startsWith('lista de') ||
    low.startsWith('año lectivo') ||
    low.startsWith('material individual') ||
    low.startsWith('cartuchera') ||
    low.startsWith('materiales varios') ||
    low.startsWith('notas:') ||
    low.startsWith('útiles de aseo') ||
    low.includes('en todos los materiales') ||
    low.includes('prendas del uniforme') ||
    low.includes('permanente de cd') ||
    low.includes('grado egb')
  ) {
    return false;
  }
  return true;
}

/**
 * Normaliza la entrada a un array de {nombre, cantidad}.
 */
function normalizarEntrada(lista: EntradaCotizar[]): ItemEntrada[] {
  return lista
    .filter((e) => {
      const nombre = esItem(e) ? e.nombre : e;
      return esLineaValida(nombre);
    })
    .map((e) => {
      if (esItem(e)) {
        return {
          nombre: e.nombre,
          cantidad: Number.isFinite(e.cantidad) && e.cantidad > 0 ? Math.floor(e.cantidad) : extraerCantidadDeTexto(e.nombre),
          productoId: e.productoId,
        };
      }
      return {
        nombre: e,
        cantidad: extraerCantidadDeTexto(e),
      };
    });
}

/**
 * Cotiza una lista de útiles escolares contra el inventario del tenant con matching semántico inteligente.
 */
export async function cotizar(tenantId: string, lista: EntradaCotizar[]): Promise<Cotizacion> {
  const inventario = await getInventarioAsync(tenantId);
  const itemsNormalizados = normalizarEntrada(lista);

  const items: PedidoItem[] = [];
  const ambiguos: string[] = [];

  for (const item of itemsNormalizados) {
    let mejorMatch: Producto | null = null;
    let mejorSimilitud = 0;

    // 1. Coincidencia directa por ID de producto (máxima fidelidad cuando ya fue seleccionado)
    if (item.productoId) {
      mejorMatch = inventario.find((p) => p.id === item.productoId) || null;
      if (mejorMatch) mejorSimilitud = 1.0;
    }

    // 2. Coincidencia exacta por nombre de catálogo
    if (!mejorMatch) {
      const exacto = inventario.find((p) => p.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim());
      if (exacto) {
        mejorMatch = exacto;
        mejorSimilitud = 1.0;
      }
    }

    // 3. Matching semántico inteligente
    if (!mejorMatch) {
      for (const producto of inventario) {
        const sim = calcularSimilitudInteligente(item.nombre, producto.nombre);
        if (sim > mejorSimilitud) {
          mejorSimilitud = sim;
          mejorMatch = producto;
        }
      }
    }

    if (mejorMatch && mejorSimilitud >= 0.65) {
      let cantidadFinal = item.cantidad;

      // Si el producto se vende en paquetes (ej. "Paquete de 25 unidades") y la cantidad pedida es un número grande de hojas/unidades (ej. 100 por "1 ciento")
      const matchUnds = mejorMatch.nombre.match(/\b(\d+)\s*(?:unidades|unid|und)\b/i);
      if (matchUnds && cantidadFinal >= 50) {
        const undsPorPaquete = parseInt(matchUnds[1], 10);
        if (undsPorPaquete > 1 && cantidadFinal % undsPorPaquete === 0) {
          cantidadFinal = cantidadFinal / undsPorPaquete;
        }
      }

      items.push({
        productoId: mejorMatch.id,
        nombre: mejorMatch.nombre,
        cantidad: cantidadFinal,
        precioUnitario: mejorMatch.precio,
        matchConfidence: mejorSimilitud >= 0.85 ? 'alta' : 'baja',
      });
    } else {
      ambiguos.push(item.nombre);
    }
  }

  const total = items.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);

  return { tenantId, items, total, ambiguos };
}