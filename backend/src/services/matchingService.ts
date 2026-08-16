// Servicio de matching: dada una lista de textos, encuentra productos en el catálogo
import { Producto, Cotizacion, PedidoItem } from '../domain/entities';
import { getInventarioAsync } from '../adapters/inventarioAdapter';

function normalizar(texto: string): string {
  return texto.toLowerCase().trim();
}

function similitud(a: string, b: string): number {
  const aNorm = normalizar(a);
  const bNorm = normalizar(b);
  if (aNorm === bNorm) return 1;
  // Contains solo si el termino contenido tiene al menos 4 chars
  if (bNorm.length >= 4 && (aNorm.includes(bNorm) || bNorm.includes(aNorm))) return 0.8;
  // Levenshtein REAL (no por longitud). Esto evita falsos positivos por igual longitud.
  const maxLen = Math.max(aNorm.length, bNorm.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(aNorm, bNorm);
  // Ratio: 1.0 = identicos, 0.0 = todos los caracteres diferentes
  return Math.max(0, 1 - dist / maxLen);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

export async function cotizar(tenantId: string, listaTextos: string[]): Promise<Cotizacion> {
  const inventario = await getInventarioAsync(tenantId);
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
