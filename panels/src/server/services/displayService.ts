/**
 * displayService.ts
 * Servicio de presentación: limpia nombres de ERP, formatea opciones numeradas,
 * calcula totales por cantidad, corrige typos y genera sugerencias de venta cruzada.
 */

// ─── 1. LIMPIADOR DE NOMBRES CRUDOS DEL ERP ───────────────────────────

/** Códigos y basura de sistemas contables que hay que eliminar del nombre visible */
const PATRONES_BASURA = [
  /\b\d{4,}\b/g,                    // Códigos numéricos largos (950703, 7036, 1610, etc.)
  /\b[A-Za-z]{2,}\d{4,}\b/g,        // Códigos tipo Mcd011033, CYX800100
  /\b[A-Z]{2,3}\.\w+\.\d+\b/g,     // Códigos tipo AC.F.169724, BO.PMLA3532
  /\b[A-Z]{2,}\.\w+\b/g,           // Códigos tipo SH.LN.01
  /\b(pqx\d+|x\d+und|x\d+unid|x\d+unidad|x\d+)\b/gi, // Pqx10, X10und, X5unidad
  /\b\d+x\d+(\.\d+)?\b/gi,         // Dimensiones tipo 21x29.7
  /\b\d+cuaderno\b/gi,             // 30cuaderno
  /\*$/,                             // Asteriscos al final
  /\bCYX\w+/gi,                     // Códigos CYX...
  /\b3D-PP\d+/gi,                   // Códigos 3D-PP013
  /\b909-\d+/g,                     // Códigos 909-143
  /\b\d{3,}-\d+/g,                  // Códigos tipo 561161
];

/** Abreviaturas del ERP → nombre legible */
const ABREVIATURAS_ERP: Record<string, string> = {
  'CA ': 'Cuaderno cosido ',
  'CM ': 'Cuaderno espiral ',
  'CD ': 'cuadros ',
  'CDRS': 'cuadros',
  'CDROS': 'cuadros',
  '1L': 'líneas',
  '4L': '4 líneas',
  'ACAD ': 'académico ',
  'ACAD. ': 'académico ',
  'DB ': 'doble ',
  'MED ': 'mediano ',
  'GDE ': 'grande ',
  'PEQ ': 'pequeño ',
  'ESP ': 'espiral ',
  'ANILL ': 'anillado ',
  'ANILL. ': 'anillado ',
  'C/ESPONJA': 'con esponja',
  'C/SEPARADOR': 'con separador',
  'C/SEPARADORES': 'con separadores',
  'C/LIGA': 'con liga',
  'C/LUZ': 'con luz',
  'C/LLAVERO': 'con llavero',
  'P/PINCHO': 'tipo pincho',
  'P/BALSA': 'de balsa',
  'D/ARTISTA': 'de artista',
  'E/BARRA': 'en barra',
  'T/LIBRETA': 'tipo libreta',
  'P/DURA': 'pasta dura',
  'X12COL': '12 colores',
  'X16COL': '16 colores',
  'X24COL': '24 colores',
  'X36COL': '36 colores',
  'X6COL': '6 colores',
  '100H': '100 hojas',
  '50H': '50 hojas',
  '200H': '200 hojas',
  '160H': '160 hojas',
  '180H': '180 hojas',
  '192 PAG': '192 páginas',
  '320H': '320 hojas',
  '145H': '145 hojas',
  'UNID': 'unidad',
  'BOLIG ': 'Bolígrafo ',
  'BOLIG. ': 'Bolígrafo ',
};

/**
 * Convierte un nombre crudo de ERP a un nombre legible para el cliente.
 * Ejemplo: "CM 100H CD MED FERRARI ESPIRAL 950703 NORMA 7036"
 *       →  "Cuaderno espiral 100 hojas cuadros mediano Ferrari Norma"
 */
export function limpiarNombreERP(nombreCrudo: string): string {
  let nombre = nombreCrudo;

  // 1. Reemplazar prefijos de inicio y palabras aisladas del ERP con límites de palabra estrictos
  nombre = nombre
    .replace(/^CA\s+/i, 'Cuaderno cosido ')
    .replace(/\bCA\s+(?=\d|CD|1L|4L|ACAD|UNICO|GRANDE|MED)/gi, 'Cuaderno cosido ')
    .replace(/^CM\s+/i, 'Cuaderno espiral ')
    .replace(/\bCM\s+(?=\d|CD|1L|4L|ACAD|MED|ESP)/gi, 'Cuaderno espiral ')
    .replace(/\bCD\s+/gi, 'cuadros ')
    .replace(/\bCDRS\b/gi, 'cuadros')
    .replace(/\bCDROS\b/gi, 'cuadros')
    .replace(/\b1L\b/gi, 'líneas')
    .replace(/\b4L\b/gi, '4 líneas')
    .replace(/\bACAD\.?\s+/gi, 'académico ')
    .replace(/\bDB\s+/gi, 'doble ')
    .replace(/\bMED\s+/gi, 'mediano ')
    .replace(/\bGDE\s+/gi, 'grande ')
    .replace(/\bPEQ\s+/gi, 'pequeño ')
    .replace(/\bESP\s+/gi, 'espiral ')
    .replace(/\bANILL\.?\s+/gi, 'anillado ')
    .replace(/C\/ESPONJA/gi, 'con esponja')
    .replace(/C\/SEPARADORES?/gi, 'con separadores')
    .replace(/C\/LIGA/gi, 'con liga')
    .replace(/C\/LUZ/gi, 'con luz')
    .replace(/C\/LLAVERO/gi, 'con llavero')
    .replace(/P\/PINCHO/gi, 'tipo pincho')
    .replace(/P\/BALSA/gi, 'de balsa')
    .replace(/D\/ARTISTA/gi, 'de artista')
    .replace(/E\/BARRA/gi, 'en barra')
    .replace(/T\/LIBRETA/gi, 'tipo libreta')
    .replace(/P\/DURA/gi, 'pasta dura')
    .replace(/\bX(\d+)COL\b/gi, '$1 colores')
    .replace(/\b(\d+)H\b/gi, '$1 hojas')
    .replace(/\bBOLIG\.?\s+/gi, 'Bolígrafo ');

  // 2. Eliminar códigos basura
  for (const patron of PATRONES_BASURA) {
    nombre = nombre.replace(patron, '');
  }

  // 3. Capitalizar correctamente (Title Case) excepto conectores
  const conectores = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'para', 'en', 'y', 'o', 'a']);
  nombre = nombre
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0)
    .map((palabra, i) => {
      const low = palabra.toLowerCase();
      if (i === 0) return low.charAt(0).toUpperCase() + low.slice(1);
      if (conectores.has(low)) return low;
      return low.charAt(0).toUpperCase() + low.slice(1);
    })
    .join(' ');

  // 4. Limpiar dobles espacios y puntuación huérfana
  nombre = nombre
    .replace(/\s+/g, ' ')
    .replace(/\s+$/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/,\s*$/g, '')
    .trim();

  return nombre || nombreCrudo;
}


// ─── 2. OPCIONES NUMERADAS CON EMOJIS ──────────────────────────────────

const NUMEROS_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

export interface OpcionFormateada {
  id: string;
  nombre: string;
  nombreLimpio: string;
  precio: number;
  marca?: string;
}

/**
 * Extrae la marca más relevante del nombre de un producto.
 */
function extraerMarca(nombre: string): string {
  const marcasConocidas = [
    'Norma', 'Stanford', 'Faber', 'Faber-Castell', 'Pelikan', 'Artesco',
    'Mongol', 'Staedtler', 'Giotto', 'Crayola', 'Jean Book', 'Lancer',
    'BIC', 'Bic', 'Paper Mate', 'Pentel', 'Coquito', 'Pritt', 'UHU',
  ];
  const nombreLow = nombre.toLowerCase();
  for (const marca of marcasConocidas) {
    if (nombreLow.includes(marca.toLowerCase())) return marca;
  }
  return '';
}

/**
 * Formatea una lista de opciones como mensajes numerados para WhatsApp.
 * Si se provee cantidad, muestra el cálculo por lote (ej. "La docena te sale en $42.00").
 */
export function formatearOpcionesNumeradas(
  opciones: Array<{ id: string; nombre: string; precio: number }>,
  cantidad?: number
): string {
  const lineas = opciones.slice(0, 4).map((opc, i) => {
    const emoji = NUMEROS_EMOJI[i] || `${i + 1}.`;
    const nombreLimpio = limpiarNombreERP(opc.nombre);
    const marca = extraerMarca(opc.nombre);
    const marcaTag = marca ? `*${marca}* — ` : '';

    let linea = `${emoji} ${marcaTag}${nombreLimpio} ($${opc.precio.toFixed(2)} c/u)`;

    if (cantidad && cantidad > 1) {
      const totalLote = opc.precio * cantidad;
      const palabraCantidad = cantidadAPalabra(cantidad);
      linea += `\n     ➔ *${palabraCantidad} te sale en $${totalLote.toFixed(2)}*`;
    }

    return linea;
  });

  let texto = lineas.join('\n\n');
  texto += '\n\n👉 *Responde con el número* (1, 2, 3...) *o el nombre de la marca* para elegir.';
  return texto;
}

function cantidadAPalabra(cantidad: number): string {
  if (cantidad === 12) return 'La docena';
  if (cantidad === 6) return 'La media docena';
  if (cantidad === 24) return 'Las 2 docenas';
  if (cantidad === 2) return 'El par';
  return `Las ${cantidad} unidades`;
}


// ─── 4. CORRECTOR DE TYPOS FRECUENTES ──────────────────────────────────

const TYPOS_COMUNES: Record<string, string> = {
  // Errores de teclado muy comunes en español
  'tiennes': 'tienes',
  'tiens': 'tienes',
  'tienen': 'tienen',
  'dicena': 'docena',
  'dosena': 'docena',
  'dosenas': 'docenas',
  'hijas': 'hojas',
  'ojas': 'hojas',
  'hjas': 'hojas',
  'cuadeno': 'cuaderno',
  'cuadenos': 'cuadernos',
  'cuadrno': 'cuaderno',
  'cuadrenop': 'cuaderno',
  'cuaerno': 'cuaderno',
  'lapises': 'lápices',
  'lapiz': 'lápiz',
  'lapizes': 'lápices',
  'vorradores': 'borradores',
  'borrdor': 'borrador',
  'esfero': 'bolígrafo',
  'esferos': 'bolígrafos',
  'goma liquda': 'goma líquida',
  'goma liquiida': 'goma líquida',
  'tiguera': 'tijera',
  'tijras': 'tijeras',
  'tigueras': 'tijeras',
  'sacapunas': 'sacapuntas',
  'sacapunts': 'sacapuntas',
  'carpera': 'carpeta',
  'carpatas': 'carpetas',
  'carpets': 'carpetas',
  'pintras': 'pinturas',
  'pintruas': 'pinturas',
  'pintura': 'pinturas',
  'resma': 'resma',
  'fomis': 'fomix',
  'fomix': 'fomix',
  'plastilna': 'plastilina',
  'plastilinna': 'plastilina',
  'cartuliina': 'cartulina',
  'cartulna': 'cartulina',
  'marcadro': 'marcador',
  'marcadres': 'marcadores',
  'corector': 'corrector',
  'correcctor': 'corrector',
  'cuadors': 'cuadros',
  'cuadrs': 'cuadros',
  'linias': 'líneas',
  'linea': 'líneas',
  'lineas': 'líneas',
  'espiral': 'espiral',
  'eapiral': 'espiral',
  'cosio': 'cosido',
  'cosdo': 'cosido',
  'tempra': 'témpera',
  'temepra': 'témpera',
  'acuarla': 'acuarela',
};

/**
 * Determina de forma precisa si un mensaje es una lista escolar multi-producto
 * (ej. "3 cuadernos, 2 esferos y 1 goma") o una consulta de un solo producto (ej. "Hola, tienes cuadernos de 100 hojas?").
 */
export function esListaCompuestaUtil(texto: string): boolean {
  let t = corregirTypos(texto || '').toLowerCase();

  // 1. Eliminar saludos iniciales con coma para no falsificar lista
  t = t.replace(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|estimados|saludos)[,.\s]+/i, '').trim();

  // 2. Si tiene saltos de línea con contenido en varias líneas
  const lineas = t.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  if (lineas.length >= 2) return true;

  // 3. Contar sustantivos de papelería distintos mencionados
  const keywordsPapeleria = [
    'cuaderno', 'cuadernos', 'libreta', 'agenda',
    'esfero', 'esferos', 'boligrafo', 'boligrafos', 'lapiz', 'lapices', 'resaltador', 'marcador',
    'goma', 'silicona', 'pegamento', 'tijera', 'tijeras', 'regla', 'juego geometrico', 'compas',
    'borrador', 'sacapuntas', 'corrector',
    'carpeta', 'carpetas', 'archivador', 'funda', 'separador',
    'pintura', 'pinturas', 'tempera', 'acuarela', 'pincel',
    'cartulina', 'papel', 'fomix', 'plastilina', 'escarcha', 'resma'
  ];

  let conteoKeywords = 0;
  for (const kw of keywordsPapeleria) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(t)) {
      conteoKeywords++;
    }
  }

  // Si menciona al menos 2 categorías distintas (ej. "esferos" y "cuadernos"), es lista multi-producto
  if (conteoKeywords >= 2) return true;

  // Si tiene comas separando artículos con cantidades (ej. "2 cuadernos, 3 lápices")
  const partes = t.split(',');
  if (partes.length >= 3) return true;

  return false;
}

/**
 * Limpia frases conversacionales introductorias ("tienes", "quiero", "necesito")
 * para que el título de la pregunta no se vea redundante.
 * Ej: "Tienes cuadernos de 100 hijas" -> "Cuadernos de 100 hojas"
 */
export function limpiarFraseConsulta(texto: string): string {
  let t = corregirTypos(texto || '');
  t = t.replace(/\b(tienes|tiene|hay|habra|vendes|vende|quiero|necesito|busco|quisiera|favor|por favor|cuanto sale|cuanto cuesta|precio|me das|dame)\b/gi, '');
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length > 0) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return texto;
}

/**
 * Corrige typos frecuentes en el texto del cliente.
 * No modifica el texto si no hay typos conocidos.
 */
export function corregirTypos(texto: string): string {
  let resultado = texto;
  const palabras = texto.toLowerCase().split(/\s+/);

  for (let i = 0; i < palabras.length; i++) {
    const palabra = palabras[i];
    if (TYPOS_COMUNES[palabra]) {
      // Reemplazar en el texto original preservando la posición
      const regex = new RegExp(`\\b${palabra}\\b`, 'gi');
      resultado = resultado.replace(regex, TYPOS_COMUNES[palabra]);
    }
  }

  // Correcciones multi-palabra
  for (const [typo, correcto] of Object.entries(TYPOS_COMUNES)) {
    if (typo.includes(' ') && resultado.toLowerCase().includes(typo)) {
      const regex = new RegExp(typo, 'gi');
      resultado = resultado.replace(regex, correcto);
    }
  }

  return resultado;
}


// ─── 5. VENTA CRUZADA / UPSELLING SUTIL ────────────────────────────────

interface SugerenciaVentaCruzada {
  textoSugerencia: string;
  productosRelacionados: string[];
}

/** Reglas de venta cruzada: si compras X, te sugiero Y */
const REGLAS_VENTA_CRUZADA: Array<{
  disparadores: string[];
  sugerencia: string;
  productosRelacionados: string[];
}> = [
  {
    disparadores: ['cuaderno', 'cuadernos', 'libreta'],
    sugerencia: '¿Necesitas también *forros plásticos transparentes* o *membretes/etiquetas* para tus cuadernos?',
    productosRelacionados: ['forro', 'membrete', 'etiqueta'],
  },
  {
    disparadores: ['lápiz', 'lapiz', 'lápices', 'lapices'],
    sugerencia: '¿Te hace falta un *sacapuntas* o *borrador* para acompañar tus lápices?',
    productosRelacionados: ['sacapuntas', 'borrador'],
  },
  {
    disparadores: ['pintura', 'pinturas', 'colores', 'acuarela', 'tempera'],
    sugerencia: '¿Necesitas también *pinceles* o un *mandil/delantal escolar* para proteger la ropa?',
    productosRelacionados: ['pincel', 'mandil', 'delantal'],
  },
  {
    disparadores: ['carpeta', 'carpetas', 'archivador'],
    sugerencia: '¿Deseas agregar *separadores* o *fundas plásticas A4* para organizar tus documentos?',
    productosRelacionados: ['separador', 'funda'],
  },
  {
    disparadores: ['tijera', 'tijeras'],
    sugerencia: '¿Necesitas también *goma/pegamento* o *escarcha/glitter* para tus manualidades?',
    productosRelacionados: ['goma', 'pegamento', 'escarcha'],
  },
  {
    disparadores: ['fomix', 'plastilina', 'manualidades'],
    sugerencia: '¿Te hace falta *barras de silicona* o una *pistola de silicona* para tu trabajo manual?',
    productosRelacionados: ['silicona', 'pistola'],
  },
];

/**
 * Genera una sugerencia de venta cruzada basada en los productos que el cliente acaba de cotizar.
 * Devuelve null si no hay sugerencia relevante.
 */
export function generarSugerenciaVentaCruzada(
  productosComprados: string[]
): SugerenciaVentaCruzada | null {
  const textoCombinado = productosComprados.join(' ').toLowerCase();

  for (const regla of REGLAS_VENTA_CRUZADA) {
    if (regla.disparadores.some((d) => textoCombinado.includes(d))) {
      return {
        textoSugerencia: `\n\n💡 *Sugerencia:* ${regla.sugerencia}`,
        productosRelacionados: regla.productosRelacionados,
      };
    }
  }

  return null;
}
