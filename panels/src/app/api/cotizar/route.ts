import { NextRequest, NextResponse } from 'next/server';
import { cotizar } from '@/server/services/matchingService';
import { transcribirMultiplesImagenesOCR } from '@/server/adapters/iaAdapter';
import { extraerTextoDePdfBuffer } from '@/server/services/pdfService';

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

    // 1. Descargar en paralelo todos los archivos desde Supabase Storage
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      const downloadTasks = imageUrls.map(async (url: string) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s max download
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Detectar si el archivo es un PDF
            const isPdf = buffer.slice(0, 5).toString() === '%PDF-' || url.toLowerCase().includes('.pdf');

            if (isPdf) {
              // Extraer texto nativo del PDF en milisegundos
              const pdfLines = await extraerTextoDePdfBuffer(buffer);
              return { type: 'pdf' as const, lines: pdfLines };
            } else {
              // Es una imagen (JPG, PNG, WebP)
              const base64 = buffer.toString('base64');
              const contentType = res.headers.get('content-type') || 'image/jpeg';
              const mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = contentType.includes('png') ? 'image/png' : 'image/jpeg';
              return { type: 'image' as const, base64, mimeType };
            }
          }
        } catch (err: any) {
          console.warn('[Error descargando archivo de Storage]', url, err.message);
        }
        return null;
      });

      const downloaded = await Promise.allSettled(downloadTasks);
      for (const item of downloaded) {
        if (item.status === 'fulfilled' && item.value) {
          if (item.value.type === 'pdf') {
            lineas.push(...item.value.lines);
          } else if (item.value.type === 'image') {
            imagenesParaOCR.push({ base64: item.value.base64, mimeType: item.value.mimeType });
          }
        }
      }
    }

    // 2. Fallback de imágenes directas en base64
    if (Array.isArray(imagenes) && imagenes.length > 0) {
      for (const img of imagenes) {
        if (typeof img === 'string') {
          if (img.startsWith('JVBERi0')) { // Base64 de %PDF-
            const pdfBuffer = Buffer.from(img, 'base64');
            const pdfLines = await extraerTextoDePdfBuffer(pdfBuffer);
            lineas.push(...pdfLines);
          } else {
            imagenesParaOCR.push({ base64: img });
          }
        } else if (img?.base64) {
          if (img.base64.startsWith('JVBERi0')) {
            const pdfBuffer = Buffer.from(img.base64, 'base64');
            const pdfLines = await extraerTextoDePdfBuffer(pdfBuffer);
            lineas.push(...pdfLines);
          } else {
            imagenesParaOCR.push(img);
          }
        }
      }
    } else if (imagenBase64) {
      if (imagenBase64.startsWith('JVBERi0')) {
        const pdfBuffer = Buffer.from(imagenBase64, 'base64');
        const pdfLines = await extraerTextoDePdfBuffer(pdfBuffer);
        lineas.push(...pdfLines);
      } else {
        imagenesParaOCR.push({ base64: imagenBase64 });
      }
    }

    // 3. Ejecutar OCR consolidado para las imágenes en UN SOLO llamado a la IA
    if (imagenesParaOCR.length > 0) {
      try {
        const ocrResult = await transcribirMultiplesImagenesOCR(imagenesParaOCR);
        if (ocrResult?.texto) {
          const parsed = ocrResult.texto
            .split('\n')
            .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, '').trim())
            .filter((l) => l.length > 2);
          lineas.push(...parsed);
        }
      } catch (err: any) {
        console.error('[OCR Multi-Image Error]', err.message);
      }
    }

    // Limpiar duplicados y vacíos
    lineas = Array.from(new Set(lineas.map((l) => l.trim()).filter((l) => l.length > 2)));

    if (lineas.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron útiles escolares legibles en el documento o fotos. Intenta con fotos más nítidas o escribe los artículos en texto.' },
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
