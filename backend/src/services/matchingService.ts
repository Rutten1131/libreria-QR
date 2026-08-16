// Servicio de matching: dada una lista de textos, encuentra productos en el catálogo
import { Producto, Cotizacion, PedidoItem } from '../domain/entities';
import { getInventario } from '../adapters/inventarioAdapter';

function normalizar(texto: string): string {
  return texto.toLowerCase().trim();
}

function similitud(a: string, b: string): number {
  const aNorm = normalizar(a);
  const bNorm = normalizar(b);
  if (aNorm === bNorm) return 1;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return 0.8;
  // Levenshtein simplificado
  const lenA = aNorm.length;
  const lenB = bNorm.length;
  const maxLen = Math.max(lenA, lenB);
  if (maxLen === 0) return 1;
  const diff = Math.abs(lenA - lenB);
  return Math.max(0, 1 - diff / maxLen);
}

export function cotizar(tenantId: string, listaTextos: string[]): Cotizacion {
  const inventario = getInventario(tenantId);
  const items: PedidoItem[] = [];
  const ambiguos: string[] = [];

  for (const texto of listaTextos) {
    const textoNorm = normalizar(texto);

    // Buscar mejor coincidencia
    let mejorMatch: Producto | null = null;
    let mejorSimilitud = 0;

    for (const producto of inventario) {
      const sim = similitud(textoNorm, producto.nombre);
      if (sim > mejorSimilitud) {
        mejorSimilitud = sim;
        mejorMatch = producto;
      }
    }

    if (mejorMatch && mejorSimilitud >= 0.6) {
      items.push({
        productoId: mejorMatch.id,
        nombre: mejorMatch.nombre,
        cantidad: 1,
        precioUnitario: mejorMatch.precio,
        matchConfidence: mejorSimilitud >= 0.8 ? 'alta' : 'baja',
      });
    } else {
      ambiguos.push(texto);
    }
  }

  const total = items.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);

  return { tenantId, items, total, ambiguos };
}
