import { NextRequest, NextResponse } from 'next/server';
import { cotizar } from '@/server/services/matchingService';
import { transcribirMultiplesImagenesOCR } from '@/server/adapters/iaAdapter';

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
    const imagenesParaOCR: Array<{ base64: string; mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' }> = [];

    // 1. Descargar en paralelo todas las fotos desde Supabase Storage
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      const downloadTasks = imageUrls.map(async (url: string) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s max download
          const imgRes = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
            const mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = contentType.includes('png') ? 'image/png' : 'image/jpeg';
            return { base64, mimeType };
          }
        } catch (err: any) {
          console.warn('[Error descargando foto de Storage]', url, err.message);
        }
        return null;
      });

      const downloaded = await Promise.allSettled(downloadTasks);
      for (const res of downloaded) {
        if (res.status === 'fulfilled' && res.value) {
          imagenesParaOCR.push(res.value);
        }
      }
    }

    // 2. Fallback de imágenes directas en base64
    if (Array.isArray(imagenes) && imagenes.length > 0) {
      for (const img of imagenes) {
        if (typeof img === 'string') {
          imagenesParaOCR.push({ base64: img });
        } else if (img?.base64) {
          imagenesParaOCR.push(img);
        }
      }
    } else if (imagenBase64) {
      imagenesParaOCR.push({ base64: imagenBase64 });
    }

    // 3. Ejecutar OCR consolidado en UN SOLO llamado a la IA (evita límites de concurrencia)
    if (imagenesParaOCR.length > 0) {
      try {
        const ocrResult = await transcribirMultiplesImagenesOCR(imagenesParaOCR);
        if (ocrResult?.texto) {
          const parsed = ocrResult.texto
            .split('\n')
            .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, '').trim())
            .filter((l) => l.length > 2);
          lineas.push(...parsed);
        }
      } catch (err: any) {
        console.error('[OCR Multi-Image Error]', err.message);
      }
    }

    // Limpiar duplicados vacíos
    lineas = Array.from(new Set(lineas.map((l) => l.trim()).filter((l) => l.length > 2)));

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
