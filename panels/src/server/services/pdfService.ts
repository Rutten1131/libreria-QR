import { extractText } from 'unpdf';

/**
 * Extrae líneas de texto de un buffer PDF usando unpdf (compatible con serverless, sin DOM).
 * Retorna un array de líneas limpias listas para cotizar.
 */
export async function extraerTextoDePdfBuffer(buffer: Buffer): Promise<string[]> {
  try {
    const { text: pages } = await extractText(buffer);

    // pages es un array de strings, uno por página
    const rawText = Array.isArray(pages) ? pages.join('\n') : String(pages);

    const lines = rawText
      .split('\n')
      .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((l) => {
        if (l.length < 3) return false;
        // Filtrar encabezados, notas y secciones que no son útiles escolares
        const low = l.toLowerCase();
        if (
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
      });

    return lines;
  } catch (err: any) {
    console.error('[Error parseando PDF en backend]', err.message);
    return [];
  }
}
