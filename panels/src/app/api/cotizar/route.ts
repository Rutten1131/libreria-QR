import { NextRequest, NextResponse } from 'next/server';
import { cotizar } from '@/server/services/matchingService';
import { transcribirOCR } from '@/server/adapters/iaAdapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, lista, imagenes, imagenBase64 } = body;
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId es requerido' }, { status: 400 });
    }

    let lineas: string[] = Array.isArray(lista) ? [...lista] : [];

    // Procesar imágenes (múltiples fotos o foto individual)
    const listaImagenes: Array<{ base64: string; mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' }> = [];
    if (Array.isArray(imagenes) && imagenes.length > 0) {
      for (const img of imagenes) {
        if (typeof img === 'string') {
          listaImagenes.push({ base64: img });
        } else if (img?.base64) {
          listaImagenes.push(img);
        }
      }
    } else if (imagenBase64) {
      listaImagenes.push({ base64: imagenBase64 });
    }

    if (listaImagenes.length > 0) {
      for (const img of listaImagenes) {
        try {
          const rawBase64 = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
          const ocr = await transcribirOCR(rawBase64, img.mimeType || 'image/jpeg');
          if (ocr.texto) {
            const parsedLines = ocr.texto
              .split('\n')
              .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, '').trim())
              .filter((l) => l.length > 2);
            lineas.push(...parsedLines);
          }
        } catch (e: any) {
          console.warn('[OCR /api/cotizar warning]', e.message);
        }
      }
    }

    if (lineas.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron útiles escolares legibles. Intenta con fotos más claras o escribe la lista en texto.' },
        { status: 400 }
      );
    }

    const resultado = await cotizar(tenantId, lineas);
    return NextResponse.json({
      ...resultado,
      lineasExtraidas: lineas,
    });
  } catch (e: any) {
    console.error('[API Cotizar Error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
