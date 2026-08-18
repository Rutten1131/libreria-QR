// Helper para convertir páginas de un archivo PDF a imágenes JPEG en el navegador

export async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

  return new Promise((resolve, reject) => {
    // Si ya existe el tag del script
    const existing = document.querySelector('script[src*="pdf.min.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).pdfjsLib));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjs);
      } else {
        reject(new Error('PDF.js no disponible'));
      }
    };
    script.onerror = () => reject(new Error('No se pudo cargar el lector de PDFs'));
    document.head.appendChild(script);
  });
}

export interface PdfPageImage {
  blob: Blob;
  previewUrl: string;
  name: string;
}

export async function extractPagesFromPdf(file: File): Promise<PdfPageImage[]> {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) throw new Error('Lector de PDF no inicializado');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPageImage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // Escala nítida para OCR con IA
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    if (blob) {
      const previewUrl = URL.createObjectURL(blob);
      pages.push({
        blob,
        previewUrl,
        name: `Pág_${i}_${file.name.replace(/\.pdf$/i, '')}.jpg`,
      });
    }
  }

  return pages;
}
