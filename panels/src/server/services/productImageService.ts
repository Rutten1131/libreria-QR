import fs from 'fs';
import path from 'path';

export interface ImagenProductoInfo {
  nombreArchivo: string;
  rutaAbsoluta: string;
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

const IMAGENES_DIR = path.resolve(process.cwd(), 'public/imagenes');

// Mapeo inteligente de palabras clave a archivos de imagen en public/imagenes
const MAPA_IMAGENES: Array<{
  archivo: string;
  match: (texto: string) => boolean;
}> = [
  {
    archivo: 'boligrafo-bic-pf-azul.jpg',
    match: (t) => t.includes('bic') && t.includes('azul') && (t.includes('fina') || t.includes('0.5') || t.includes('0.7') || t.includes('ultra')),
  },
  {
    archivo: 'boligrafo-bic-pm-azul.jpg',
    match: (t) => (t.includes('bic') && t.includes('azul')) || (t.includes('esfero') && t.includes('azul') && t.includes('bic')),
  },
  {
    archivo: 'boligrafo-bic-pf-negro.jpg',
    match: (t) => t.includes('bic') && t.includes('negro') && (t.includes('fina') || t.includes('0.5') || t.includes('0.7') || t.includes('ultra')),
  },
  {
    archivo: 'boligrafo-bic-pm-negro.jpg',
    match: (t) => (t.includes('bic') && t.includes('negro')) || (t.includes('esfero') && t.includes('negro') && t.includes('bic')),
  },
  {
    archivo: 'Borradores de Queso.jpg',
    match: (t) =>
      (t.includes('borrador') || t.includes('borradores')) &&
      (t.includes('queso') ||
        (t.includes('blanco') && !t.includes('br')) ||
        t.includes('miga') ||
        t.includes('escolar') ||
        t.includes('staedtler')),
  },
  {
    archivo: 'Borradores BR 40 Pelikan.jpg',
    match: (t) =>
      (t.includes('borrador') || t.includes('borradores')) &&
      (t.includes('pelikan') || t.includes('br') || t.includes('40') || t.includes('bicolor') || t.includes('rojo y azul')),
  },
  {
    archivo: 'Borradores de colores.jpg',
    match: (t) => (t.includes('borrador') || t.includes('borradores')) && (t.includes('color') || t.includes('kuromi') || t.includes('corazon') || t.includes('figura') || t.includes('avenger') || t.includes('divertido')),
  },
  {
    archivo: 'Portaminas o Lapiz.jpg',
    match: (t) => t.includes('lapiz') || t.includes('lápiz') || t.includes('portamina') || t.includes('infinito') || t.includes('kiut') || t.includes('hb') || t.includes('grafito') || t.includes('lancer'),
  },
  {
    archivo: 'cuaderno 200h.jpg',
    match: (t) => (t.includes('cuaderno') || t.includes('cuadernos')) && (t.includes('200') || t.includes('doscientas') || t.includes('200h')),
  },
  {
    archivo: 'cuaderno100h.jpg',
    match: (t) => (t.includes('cuaderno') || t.includes('cuadernos')) && (t.includes('100') || t.includes('cien') || t.includes('100h')),
  },
];

/**
 * Busca si existe una imagen relevante para un producto o texto de consulta.
 * Si existe, lee el archivo y lo devuelve en Base64 para enviarlo por WhatsApp.
 */
export function buscarImagenProducto(textoOProducto: string): ImagenProductoInfo | null {
  if (!textoOProducto) return null;
  const norm = textoOProducto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const item of MAPA_IMAGENES) {
    if (item.match(norm)) {
      const ruta = path.join(IMAGENES_DIR, item.archivo);
      if (fs.existsSync(ruta)) {
        try {
          const buffer = fs.readFileSync(ruta);
          const base64 = buffer.toString('base64');
          return {
            nombreArchivo: item.archivo,
            rutaAbsoluta: ruta,
            base64,
            mimeType: item.archivo.endsWith('.png') ? 'image/png' : 'image/jpeg',
          };
        } catch (err) {
          console.warn(`[ProductImageService] Error leyendo imagen ${ruta}:`, err);
        }
      }
    }
  }

  return null;
}
