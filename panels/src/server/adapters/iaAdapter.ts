// Adapter de Inteligencia Artificial para LibreríaQR (Vision OCR + Parsing)
// Proveedores: NVIDIA NIM (Vision) + Groq (Parsing ultra-rápido)

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ModeloPerfil {
  id: string;
  vision: boolean;
  proveedor: 'nvidia' | 'groq';
  descripcion: string;
  temperature: number;
  timeoutMs: number;
}

const MODELOS: Record<string, ModeloPerfil> = {
  // === OCR / Vision ===
  LLAMA_VISION: {
    id: 'meta/llama-3.2-11b-vision-instruct',
    vision: true,
    proveedor: 'nvidia',
    descripcion: 'NVIDIA Llama 3.2 11B Vision — Transcripción OCR de alta precisión.',
    temperature: 0.01,
    timeoutMs: 25000,
  },
  NEMOTRON_OMNI: {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    vision: true,
    proveedor: 'nvidia',
    descripcion: 'NVIDIA Nemotron Omni Vision (fallback).',
    temperature: 0.01,
    timeoutMs: 25000,
  },

  // === Chat / Parser de Texto ===
  GROQ_TEXT: {
    id: 'openai/gpt-oss-120b',
    vision: false,
    proveedor: 'groq',
    descripcion: 'Groq GPT-OSS 120B — Parser de texto ultra-rápido (<1s).',
    temperature: 0.01,
    timeoutMs: 15000,
  },
  NVIDIA_LLAMA_TEXT: {
    id: 'meta/llama-3.1-70b-instruct',
    vision: false,
    proveedor: 'nvidia',
    descripcion: 'NVIDIA Llama 3.1 70B Instruct (fallback de texto).',
    temperature: 0.01,
    timeoutMs: 20000,
  },
};

// === Orden de cascade ===
const CASCADE_VISION = ['LLAMA_VISION', 'NEMOTRON_OMNI'];
const CASCADE_TEXT = ['GROQ_TEXT', 'NVIDIA_LLAMA_TEXT'];

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

function getApiKey(proveedor: 'nvidia' | 'groq'): string {
  if (proveedor === 'groq') {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY no esta en .env');
    return key;
  }
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY no esta en .env');
  return key;
}

function getApiUrl(proveedor: 'nvidia' | 'groq'): string {
  return proveedor === 'groq' ? GROQ_API_URL : NVIDIA_API_URL;
}

async function backoffRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxReintentos = 1
): Promise<T> {
  let lastError: unknown;
  for (let intento = 0; intento <= maxReintentos; intento++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message ?? err);
      const esRateLimit = /429|rate.?limit/i.test(msg);
      const esTransient = /5\d\d|timeout|abort|fetch failed|respuesta vacia/i.test(msg);
      if (!esRateLimit && !esTransient) {
        throw err;
      }
      if (intento < maxReintentos) {
        const espera = 400 * Math.pow(2, intento);
        console.warn(`[iaAdapter] ${label} reintento tras ${espera}ms — ${msg.slice(0, 100)}`);
        await new Promise((r) => setTimeout(r, espera));
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
  const apiKey = getApiKey(modelo.proveedor);
  const apiUrl = getApiUrl(modelo.proveedor);

  const payload = {
    ...body,
    model: modelo.id,
    temperature: modelo.temperature,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), modelo.timeoutMs);

  try {
    const inicio = Date.now();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`${modeloKey} ${response.status}: ${errorBody.slice(0, 150)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawTexto = data.choices?.[0]?.message?.content?.trim() ?? '';
    // Limpiar posibles etiquetas de razonamiento como <think>...</think>
    const texto = rawTexto.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (texto.length === 0) {
      throw new Error(`${modeloKey} devolvio respuesta vacia`);
    }

    const duracion = Date.now() - inicio;
    console.log(`[iaAdapter] ${modeloKey} respondio en ${duracion}ms (${texto.length} chars)`);

    return { content: texto, fuente: modeloKey };
  } finally {
    clearTimeout(timeoutId);
  }
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
 */
export async function transcribirOCR(
  imagenBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/png'
): Promise<OCRResult> {
  const prompt = `Eres un transcriptor de listas de útiles escolares.
Tarea: Analiza la foto y extrae todos los útiles escolares que aparecen en ella.

REGLAS:
- Una sola línea por cada útil escolar (ej. "1 cuaderno de cuadros", "3 lápices HB", "1 borrador blanco")
- Sin numeración de incisos, sin precios, sin categorías
- Devuelve ÚNICAMENTE la lista de útiles, sin introducciones ni explicaciones.`;

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
  const lineas = content.split('\n').filter((l) => l.trim().length > 0).length;
  const confianza = lineas >= 1 ? 'alta' : 'baja';
  return { texto: content, confianza, fuente };
}

/**
 * Transcribe múltiples imágenes (páginas de una lista escolar)
 */
export async function transcribirMultiplesImagenesOCR(
  imagenes: Array<{ base64: string; mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' }>
): Promise<OCRResult> {
  if (imagenes.length === 0) {
    return { texto: '', confianza: 'baja', fuente: 'LLAMA_VISION' };
  }

  const todasLasLineas: string[] = [];
  let ultimaFuente: Fuente = 'LLAMA_VISION';

  for (const img of imagenes) {
    try {
      const rawBase64 = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
      const res = await transcribirOCR(rawBase64, img.mimeType || 'image/jpeg');
      if (res?.texto) {
        todasLasLineas.push(res.texto);
        ultimaFuente = res.fuente;
      }
    } catch (err: any) {
      console.warn('[transcribirMultiplesImagenesOCR foto error]', err.message);
    }
  }

  const textoConsolidado = todasLasLineas.join('\n');
  const totalLineas = textoConsolidado.split('\n').filter((l) => l.trim().length > 0).length;
  return {
    texto: textoConsolidado,
    confianza: totalLineas >= 1 ? 'alta' : 'baja',
    fuente: ultimaFuente,
  };
}

/**
 * Interpreta texto libre del cliente y devuelve items estructurados.
 */
export async function interpretarTexto(
  textoLibre: string,
  inventarioDisponible: string[]
): Promise<LLMResult> {
  const catalogoTexto = inventarioDisponible.map((n) => `- ${n}`).join('\n');

  const prompt = `Eres un parser de pedidos de útiles escolares. Tu trabajo es extraer items y cantidades.

CATALOGO DISPONIBLE EN TIENDA (si hay coincidencia cercana, usa este nombre exacto):
${catalogoTexto}

TEXTO DE LA LISTA:
"""
${textoLibre}
"""

REGLAS OBLIGATORIAS:
- Extrae cada útil con su cantidad.
- Si no dice cantidad, usa 1.
- Formato estricto de salida: cantidad|nombre
- NADA de explicaciones, saludos ni comentarios. Solo las líneas cantidad|nombre.

Ejemplo de salida:
1|Cuaderno parvulario cosido 100 hojas de lineas
1|Cuaderno parvulario cosido 100 hojas de cuadros
1|Carpeta tipo sobre broche plastico duro
3|Lapices delgados triplus HB`;

  const body = {
    messages: [{ role: 'user' as const, content: prompt }],
    max_tokens: 1024,
  };

  const { content, fuente } = await cascadaLlamar(false, body);

  return { texto: content, fuente };
}