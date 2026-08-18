import { NextRequest, NextResponse } from 'next/server';
import { cotizar } from '@/server/services/matchingService';
import { transcribirOCR } from '@/server/adapters/iaAdapter';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Endpoint /api/cotizar activo. Envía tu petición mediante POST con { tenantId, imageUrls, lista o imagenes }.',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, lista, imageUrls, imagenes, imagenBase64 } = body;
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId es requerido' }, { status: 400 });
    }

    let lineas: string[] = Array.isArray(lista) ? [...lista] : [];

    // 1. Procesar URLs públicas de Supabase Storage (Subida directa desde navegador)
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      for (const url of imageUrls) {
        try {
          const imgRes = await fetch(url);
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
            const mimeType = contentType.includes('png') ? 'image/png' : 'image/jpeg';

            const ocr = await transcribirOCR(base64, mimeType as any);
            if (ocr.texto) {
              const parsed = ocr.texto
                .split('\n')
                .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, '').trim())
                .filter((l) => l.length > 2);
              lineas.push(...parsed);
            }
          }
        } catch (err: any) {
          console.warn('[OCR from Storage URL error]', url, err.message);
        }
      }
    }

    // 2. Procesar imágenes directas en base64 (Fallback)
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
        { error: 'No se encontraron útiles escolares legibles en las fotos o lista. Intenta con fotos más nítidas o escribe los artículos en texto.' },
        { status: 400 }
      );
    }

    const resultado = await cotizar(tenantId, lineas);
    return NextResponse.json({
      ...resultado,
      lineasExtraidas: lineas,
      fotosGuardadas: Array.isArray(imageUrls) ? imageUrls : [],
    });
  } catch (e: any) {
    console.error('[API Cotizar Error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
