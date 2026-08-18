import { PDFParse } from 'pdf-parse';

export async function extraerTextoDePdfBuffer(buffer: Buffer): Promise<string[]> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const rawText = result.text || '';

    const lines = rawText
      .split('\n')
      .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((l) => {
        if (l.length < 3) return false;
        // Filtrar encabezados comunes que no son útiles
        const low = l.toLowerCase();
        if (low.startsWith('lista de') || low.startsWith('año lectivo') || low.startsWith('material') || low.startsWith('cartuchera') || low.startsWith('notas:') || low.startsWith('útiles de') || low.includes('--') || low.includes('u.e.') || low.includes('dirección') || low.includes('académica')) {
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
