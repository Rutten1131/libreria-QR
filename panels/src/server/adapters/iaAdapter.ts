// Adapter de IA — cascade NVIDIA NIM (sin Groq, decisión 2026-08-16)
// Estrategia: 9 modelos distintos de 3 proveedores (Meta, Mistral, NVIDIA)
// Cada modelo es un "Free Endpoint" de build.nvidia.com → costo cero
// Diversificación: si un proveedor/modelo falla, otro lo rescata

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

interface ModeloPerfil {
  id: string;
  vision: boolean;
  proveedor: 'meta' | 'mistral' | 'nvidia' | 'openai';
  descripcion: string;
  temperature: number;
}

const MODELOS: Record<string, ModeloPerfil> = {
  // === OCR / Vision ===
  NEMOTRON_OMNI: {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    vision: true,
    proveedor: 'nvidia',
    descripcion: 'Nemotron omni. Unico modelo vision confirmado funcional.',
    temperature: 0.01,
  },

  // === Chat / Texto ===
  NEMOTRON_ULTRA: {
    id: 'nvidia/nemotron-3-ultra-550b-a55b',
    vision: false,
    proveedor: 'nvidia',
    descripcion: 'Nemotron Ultra 550B. Unico modelo texto confirmado funcional.',
    temperature: 0.01,
  },
  MISTRAL_NEMOTRON: {
    id: 'mistralai/mistral-nemotron',
    vision: false,
    proveedor: 'mistral',
    descripcion: 'Mistral Nemotron. Fallback agentic (no testeado).',
    temperature: 0.01,
  },
};

// === Orden de cascade ===

// Vision: solo nemotron-omni (todos los demas fallaron o no existen)
// Los modelos vision de Llama interpretan el prompt como problema de coding → NO USABLES
const CASCADE_VISION = ['NEMOTRON_OMNI'];

// Texto: nemotron-ultra como primario, mistral-nemotron como fallback
// APRENDIZAJE 2026-08-16:
// - nemotron-ultra: FUNCIONA (inconsistente, razona en voz alta pero post-procesador corrige)
// - nemotron-lighting: 404 (no existe con ese nombre)
// - nemotron-nano: no disponible como texto (vision-only)
// - Llama 8B/70B: tratan el prompt como problema de coding → NO USABLES
// - GPT-OSS 120B: Downloadable (pago), no disponible en free tier → 404
// - step-3.7-flash: respuesta vacia → NO USABLE
const CASCADE_TEXT = [
  'NEMOTRON_ULTRA',      // primario: el unico confirmado que funciona
  'MISTRAL_NEMOTRON',    // fallback: agentic, no testeado todavia
];

export type Fuente = keyof typeof MODELOS;

export interface OCRResult {
  texto: string;
  confianza: 'alta' | 'baja';
  fuente: Fuente;
}

export interface LLMResult {
  texto: string;
  fuente: Fuente;
}

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error('NVIDIA_API_KEY no esta en .env');
  }
  return key;
}

async function backoffRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxReintentos = 1 // 1 reintento por modelo para no tardar mucho
): Promise<T> {
  let lastError: unknown;
  for (let intento = 0; intento <= maxReintentos; intento++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message ?? err);
      const esRateLimit = /429|rate.?limit/i.test(msg);
      const esTransient = /5\d\d|timeout|fetch failed|respuesta vacia/i.test(msg);
      if (!esRateLimit && !esTransient) {
        throw err;
      }
      if (intento < maxReintentos) {
        const espera = 500 * Math.pow(2, intento);
        console.warn(`[iaAdapter] ${label} reintento tras ${espera}ms — ${msg.slice(0, 100)}`);
        await new Promise(r => setTimeout(r, espera));
      }
    }
  }
  throw lastError;
}

async function llamarModelo(
  modeloKey: keyof typeof MODELOS,
  body: any
): Promise<{ content: string; fuente: Fuente }> {
  const modelo = MODELOS[modeloKey];
  const apiKey = getApiKey();

  const payload = {
    ...body,
    model: modelo.id,
    temperature: modelo.temperature,
  };

  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${modeloKey} ${response.status}: ${errorBody.slice(0, 150)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const texto = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (texto.length === 0) {
    throw new Error(`${modeloKey} devolvio respuesta vacia`);
  }

  return { content: texto, fuente: modeloKey };
}

async function cascadaLlamar(
  esVision: boolean,
  body: any
): Promise<{ content: string; fuente: Fuente }> {
  const orden = esVision ? CASCADE_VISION : CASCADE_TEXT;
  let ultimoError: unknown;

  for (const modeloKey of orden) {
    const label = `${modeloKey}-${esVision ? 'vision' : 'text'}`;
    try {
      const resultado = await backoffRetry(
        () => llamarModelo(modeloKey as keyof typeof MODELOS, body),
        label
      );
      if (modeloKey !== orden[0]) {
        console.warn(`[iaAdapter] fallback a ${modeloKey} funciono tras ${orden[0]} fallar`);
      }
      return { content: resultado.content, fuente: resultado.fuente };
    } catch (err: any) {
      ultimoError = err;
      const msg = String(err?.message ?? err).slice(0, 150);
      console.warn(`[iaAdapter] ${modeloKey} fallo: ${msg}`);
    }
  }
  const msg = ultimoError instanceof Error ? ultimoError.message : String(ultimoError);
  throw new Error(`Todos los modelos fallaron. Ultimo: ${msg.slice(0, 200)}`);
}

/**
 * Transcribe una imagen (lista de utiles) a texto plano.
 * Cascade: llama-3.2-11b-vision → 90b-vision → nemotron-omni
 */
export async function transcribirOCR(
  imagenBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/png'
): Promise<OCRResult> {
  const prompt = `Eres un transcriptor de listas de utiles escolares.

Tarea: extraer el texto literal de la imagen, item por item.

REGLAS:
- Una linea por item
- Sin numeracion, sin precios, sin categorias
- Si no se lee, omitelo
- Si es claramente "lapiz", escribe "lapiz"

Devuelve SOLO el texto, una linea por item. Sin explicacion.`;

  const body = {
    messages: [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: prompt },
          {
            type: 'image_url' as const,
            image_url: { url: `data:${mimeType};base64,${imagenBase64}` },
          },
        ],
      },
    ],
    max_tokens: 1024,
  };

  const { content, fuente } = await cascadaLlamar(true, body);
  const lineas = content.split('\n').filter(l => l.trim().length > 0).length;
  const confianza = lineas >= 1 ? 'alta' : 'baja';
  return { texto: content, confianza, fuente };
}

/**
 * Transcribe múltiples imágenes (páginas de una lista escolar) en un SOLO llamado a la IA
 * Evita errores 503 ResourceExhausted por concurrencia y procesa todo en ~4 segundos.
 */
export async function transcribirMultiplesImagenesOCR(
  imagenes: Array<{ base64: string; mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' }>
): Promise<OCRResult> {
  if (imagenes.length === 0) {
    return { texto: '', confianza: 'baja', fuente: 'NEMOTRON_OMNI' };
  }

  if (imagenes.length === 1) {
    return transcribirOCR(imagenes[0].base64, imagenes[0].mimeType || 'image/jpeg');
  }

  const prompt = `Eres un transcriptor de listas de utiles escolares.
Tarea: Analiza todas las fotos adjuntas (paginas de la lista de utiles) y extrae todos los utiles escolares que aparecen en ellas.

REGLAS:
- Una linea por cada util escolar
- Sin numeracion, sin precios, sin categorias
- Si no se lee un item, omitelo
- Consolida todos los items de todas las fotos en una sola lista

Devuelve SOLO la lista de utiles, una linea por item. Sin explicaciones ni introduccion.`;

  const contentArray: any[] = [{ type: 'text', text: prompt }];
  for (const img of imagenes) {
    const rawBase64 = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
    const mime = img.mimeType || 'image/jpeg';
    contentArray.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${rawBase64}` },
    });
  }

  const body = {
    messages: [{ role: 'user', content: contentArray }],
    max_tokens: 1500,
  };

  const { content, fuente } = await cascadaLlamar(true, body);
  const lineas = content.split('\n').filter(l => l.trim().length > 0).length;
  const confianza = lineas >= 1 ? 'alta' : 'baja';
  return { texto: content, confianza, fuente };
}

/**
 * Interpreta texto libre del cliente y devuelve items estructurados.
 * Cascade: llama-3.1-8b → 70b → 3.3-70b → mistral-nemotron → nemotron-ultra
 */
export async function interpretarTexto(
  textoLibre: string,
  inventarioDisponible: string[]
): Promise<LLMResult> {
  const catalogoTexto = inventarioDisponible.map(n => `- ${n}`).join('\n');

  const prompt = `Eres un parser de pedidos. Tu trabajo es extraer items de un texto.

CATALOGO (mapea al nombre EXACTO si hay match):
${catalogoTexto}

TEXTO DEL CLIENTE:
"""
${textoLibre}
"""

REGLAS:
- Si el cliente dice "3 cuadernos" → cantidad = 3
- Si no dice cantidad → cantidad = 1
- Si no hay match exacto en el catalogo → devuelve el texto literal
- NUNCA inventes productos
- NUNCA asumas productos que el cliente no menciono

FORMATO DE SALIDA (SOLO estas lineas, una por item, NADA mas):
cantidad|nombre

Ejemplo:
3|Cuaderno college 100h
2|Lapiz 2B`;

  const body = {
    messages: [{ role: 'user' as const, content: prompt }],
    max_tokens: 512,
  };

  const { content, fuente } = await cascadaLlamar(false, body);

  // Post-procesador defensivo: extrae solo lineas con formato "N|texto"
  const textoLimpio = extraerLineasItem(content);
  return { texto: textoLimpio, fuente };
}

/**
 * Extrae solo las lineas validas "cantidad|nombre" del output.
 * Necesario porque algunos modelos (nemotron-ultra, mistral-nemotron)
 * pueden devolver explicaciones mezcladas con la respuesta.
 */
function extraerLineasItem(texto: string): string {
  const items: string[] = [];
  for (const linea of texto.split('\n')) {
    const t = linea.trim();
    if (!t) continue;
    const match = t.match(/^(\d+)\s*\|\s*(.+)$/);
    if (match) {
      items.push(`${match[1]}|${match[2].trim()}`);
    }
  }
  // Si no encontramos NINGUNA linea con formato, devolvemos el texto crudo
  // (mejor eso que nada) y el orchestrator lo mandara a revision humana
  return items.length > 0 ? items.join('\n') : texto.trim();
}