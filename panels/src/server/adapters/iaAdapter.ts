// Adapter de Inteligencia Artificial para LibreríaQR (Vision OCR + Parsing)
// Proveedor principal: NVIDIA NIM (NVIDIA Inference Microservices)
// Cascade defensivo: Si un modelo falla o tarda más de 10s, pasa automáticamente al siguiente.

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export interface ModeloPerfil {
  id: string;
  vision: boolean;
  proveedor: 'nvidia' | 'mistral';
  descripcion: string;
  temperature: number;
}

const MODELOS: Record<string, ModeloPerfil> = {
  // === OCR / Vision ===
  LLAMA_VISION: {
    id: 'meta/llama-3.2-11b-vision-instruct',
    vision: true,
    proveedor: 'nvidia',
    descripcion: 'Llama 3.2 11B Vision ultrarrápido (< 1s).',
    temperature: 0.01,
  },
  NEMOTRON_OMNI: {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    vision: true,
    proveedor: 'nvidia',
    descripcion: 'Nemotron omni (fallback con razonamiento).',
    temperature: 0.01,
  },

  // === Chat / Texto ===
  NEMOTRON_ULTRA: {
    id: 'nvidia/nemotron-3-ultra-550b-a55b',
    vision: false,
    proveedor: 'nvidia',
    descripcion: 'Nemotron Ultra 550B. Modelo de texto principal.',
    temperature: 0.01,
  },
  MISTRAL_NEMOTRON: {
    id: 'mistralai/mistral-nemotron',
    vision: false,
    proveedor: 'mistral',
    descripcion: 'Mistral Nemotron. Fallback de texto.',
    temperature: 0.01,
  },
};

// === Orden de cascade ===
const CASCADE_VISION = ['LLAMA_VISION', 'NEMOTRON_OMNI'];
const CASCADE_TEXT = ['NEMOTRON_ULTRA', 'MISTRAL_NEMOTRON'];

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
  maxReintentos = 1 // 1 reintento para no sumar latencia
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
  const apiKey = getApiKey();

  const payload = {
    ...body,
    model: modelo.id,
    temperature: modelo.temperature,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout estricto

  try {
    const response = await fetch(NVIDIA_API_URL, {
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

    const texto = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (texto.length === 0) {
      throw new Error(`${modeloKey} devolvio respuesta vacia`);
    }

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
 * Llama 3.2 Vision acepta 1 imagen por prompt, procesando cada foto en ~0.8s
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

  const lineasValidas = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+\|.+$/.test(l))
    .join('\n');

  return { texto: lineasValidas || content, fuente };
}