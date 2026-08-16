// Adapter de IA — cascada Groq → NVIDIA
// 1) Intenta Groq (rapido y barato)
// 2) Si Groq falla (429, 5xx, timeout), escala a NVIDIA NIM
// 3) Si ambos fallan, lanza error → orchestrator escala a humano

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_VISION = 'llama-3.2-90b-vision-preview';
const GROQ_MODEL_TEXT = 'llama-3.1-8b-instant';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
// OCR: omni-modal (imagen + texto). Funciona con content multimodal estilo OpenAI
const NVIDIA_MODEL_VISION = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
// Chat: modelo rapido optimizado para tareas agentic
const NVIDIA_MODEL_TEXT = 'stepfun-ai/step-3.7-flash';

export type Fuente = 'groq' | 'nvidia';

export interface OCRResult {
  texto: string;
  confianza: 'alta' | 'baja';
  fuente: Fuente;
}

export interface LLMResult {
  texto: string;
  fuente: Fuente;
}

interface ProveedorConfig {
  url: string;
  visionModel: string;
  textModel: string;
  apiKey: string | undefined;
  nombre: 'groq' | 'nvidia';
  apiKeyEnv: string;
}

function getProveedor(nombre: 'groq' | 'nvidia'): ProveedorConfig {
  if (nombre === 'groq') {
    return {
      url: GROQ_API_URL,
      visionModel: GROQ_MODEL_VISION,
      textModel: GROQ_MODEL_TEXT,
      apiKey: process.env.GROQ_API_KEY,
      nombre: 'groq',
      apiKeyEnv: 'GROQ_API_KEY',
    };
  }
  return {
    url: NVIDIA_API_URL,
    visionModel: NVIDIA_MODEL_VISION,
    textModel: NVIDIA_MODEL_TEXT,
    apiKey: process.env.NVIDIA_API_KEY,
    nombre: 'nvidia',
    apiKeyEnv: 'NVIDIA_API_KEY',
  };
}

const ORDEN_PROVEEDORES: Array<'groq' | 'nvidia'> = ['groq', 'nvidia'];

// Espera exponencial: 500ms, 1000ms, 2000ms (max 3 reintentos dentro del mismo proveedor)
async function backoffRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxReintentos = 2
): Promise<T> {
  let lastError: unknown;
  for (let intento = 0; intento <= maxReintentos; intento++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message ?? err);
      const esRateLimit = /429|rate.?limit/i.test(msg);
      const esTransient = /5\d\d|timeout|fetch failed/i.test(msg);
      if (!esRateLimit && !esTransient) {
        // Error logico (4xx distinto de 429, JSON malformado, etc.) → no reintentar
        throw err;
      }
      if (intento < maxReintentos) {
        const espera = 500 * Math.pow(2, intento);
        console.warn(`[iaAdapter] ${label} reintento ${intento + 1}/${maxReintentos} tras ${espera}ms — ${msg.slice(0, 100)}`);
        await new Promise(r => setTimeout(r, espera));
      }
    }
  }
  throw lastError;
}

async function llamarProveedor(
  prov: ProveedorConfig,
  esVision: boolean,
  body: any
): Promise<{ content: string; fuente: 'groq' | 'nvidia' }> {
  if (!prov.apiKey) {
    throw new Error(`${prov.apiKeyEnv} no esta en .env`);
  }
  const model = esVision ? prov.visionModel : prov.textModel;
  // Ajustar temperature segun proveedor:
  // - Groq acepta temperature=0 (mas determinista, evita que invente productos)
  // - NVIDIA NIM requiere temperature > 0 en algunos modelos
  const tempAjustada = prov.nombre === 'groq' ? 0 : 0.01;
  const payload = { ...body, model, temperature: tempAjustada };

  const response = await fetch(prov.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${prov.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${prov.nombre} API ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const texto = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (texto.length === 0) {
    throw new Error(`${prov.nombre} devolvio respuesta vacia`);
  }
  return { content: texto, fuente: prov.nombre };
}

async function cascadaLlamar(
  esVision: boolean,
  body: any
): Promise<{ content: string; fuente: Fuente }> {
  let ultimoError: unknown;
  for (const provNombre of ORDEN_PROVEEDORES) {
    const prov = getProveedor(provNombre);
    if (!prov.apiKey) {
      console.warn(`[iaAdapter] ${prov.apiKeyEnv} no configurado, salto a siguiente proveedor`);
      continue;
    }
    try {
      const label = `${prov.nombre}-${esVision ? 'vision' : 'text'}`;
      const resultado = await backoffRetry(
        () => llamarProveedor(prov, esVision, body),
        label
      );
      if (provNombre !== ORDEN_PROVEEDORES[0]) {
        console.warn(`[iaAdapter] fallback a ${prov.nombre} funciono tras Groq fallar`);
      }
      return resultado;
    } catch (err: any) {
      ultimoError = err;
      console.warn(`[iaAdapter] ${prov.nombre} fallo definitivamente: ${String(err?.message ?? err).slice(0, 200)}`);
    }
  }
  const msg = ultimoError instanceof Error ? ultimoError.message : String(ultimoError);
  throw new Error(`Todos los proveedores de IA fallaron. Ultimo error: ${msg.slice(0, 200)}`);
}

/**
 * Transcribe una imagen (lista de utiles) a texto plano.
 * Cascada: Groq Vision → NVIDIA nemotron-omni
 */
export async function transcribirOCR(
  imagenBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/png'
): Promise<OCRResult> {
  const prompt = `Eres un transcriptor de listas de utiles escolares. Tu unica tarea es extraer
el texto literal de la imagen, item por item, sin resumir, sin agregar, sin interpretar.

REGLAS ESTRICTAS:
- Una linea por item
- Sin numeracion
- Sin precios
- Sin categorias
- Si no se lee, omitelo (no inventes)
- Si es claramente "lapiz", escribe "lapiz". NO escribas "1 lapiz" ni "lapiz Faber Castell".

Devuelve SOLO el texto, una linea por item, sin introduccion ni conclusion.`;

  // OpenAI-compatible: content es array con text + image_url
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
 * Interpreta texto libre del cliente y devuelve items estructurados.
 * Cascada: Groq llama-3.1-8b → NVIDIA step-3.7-flash
 */
export async function interpretarTexto(
  textoLibre: string,
  inventarioDisponible: string[]
): Promise<LLMResult> {
  const prompt = `Eres un parser de pedidos de utiles escolares.

CATALOGO DISPONIBLE:
${inventarioDisponible.map(n => `- ${n}`).join('\n')}

TEXTO DEL CLIENTE:
"""
${textoLibre}
"""

Tu unica tarea: extraer cada item pedido, mapearlo al nombre EXACTO del catalogo si hay match,
o dejarlo como texto libre si no se puede mapear.

REGLAS:
- Si el cliente dice "3 cuadernos", la cantidad es 3
- Si no dice cantidad, asumí 1
- Si dice "cuaderno" y en el catalogo hay "Cuaderno college 100h", usa el nombre EXACTO del catalogo
- Si no hay match en el catalogo, devuelve el texto original
- NO inventes productos
- NO calcules precios

FORMATO DE SALIDA (uno por linea):
cantidad|nombre_exacto_o_texto_original

Ejemplo:
3|Cuaderno college 100h
1|Boligrafo azul
1|cosa rara no identificada

Devuelve SOLO las lineas, sin explicacion.`;

  // Temperature lo inyecta llamarProveedor segun el proveedor (Groq=0, NVIDIA=0.01)
  const body = {
    messages: [{ role: 'user' as const, content: prompt }],
    max_tokens: 512,
  };

  const { content, fuente } = await cascadaLlamar(false, body);
  return { texto: content, fuente };
}