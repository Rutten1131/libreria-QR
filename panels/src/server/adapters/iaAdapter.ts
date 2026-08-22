import * as fs from 'fs';
import * as path from 'path';

// Asegurar carga de variables de entorno si aún no están en process.env
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const [k, ...v] = line.split('=');
      if (k && v && !process.env[k.trim()]) {
        process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (e) {}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export type ProveedorIA = 'gemini' | 'groq' | 'nvidia';

export interface ModeloPerfil {
  id: string;
  vision: boolean;
  proveedor: ProveedorIA;
  descripcion: string;
  temperature: number;
  timeoutMs: number;
}

const MODELOS: Record<string, ModeloPerfil> = {
  // === OCR / Vision (Google Gemini = Ultra-rápido ~1-3s) ===
  GEMINI_FLASH_LITE: {
    id: 'gemini-3.5-flash-lite',
    vision: true,
    proveedor: 'gemini',
    descripcion: 'Google Gemini 3.5 Flash Lite — OCR ultra-rápido (<2s).',
    temperature: 0.1,
    timeoutMs: 12000,
  },
  GEMINI_FLASH: {
    id: 'gemini-3.5-flash',
    vision: true,
    proveedor: 'gemini',
    descripcion: 'Google Gemini 3.5 Flash — OCR de alta precisión.',
    temperature: 0.1,
    timeoutMs: 15000,
  },
  LLAMA_VISION: {
    id: 'meta/llama-3.2-11b-vision-instruct',
    vision: true,
    proveedor: 'nvidia',
    descripcion: 'NVIDIA Llama 3.2 11B Vision (fallback).',
    temperature: 0.01,
    timeoutMs: 15000,
  },

  // === Chat / Parser de Texto ===
  GROQ_TEXT: {
    id: 'openai/gpt-oss-120b',
    vision: false,
    proveedor: 'groq',
    descripcion: 'Groq GPT-OSS 120B — Parsing ultra-rápido en LPUs (~0.2s).',
    temperature: 0.05,
    timeoutMs: 8000,
  },
  GEMINI_TEXT: {
    id: 'gemini-3.5-flash-lite',
    vision: false,
    proveedor: 'gemini',
    descripcion: 'Google Gemini 3.5 Flash Lite (fallback de texto).',
    temperature: 0.01,
    timeoutMs: 10000,
  },
  NVIDIA_LLAMA_TEXT: {
    id: 'meta/llama-3.1-70b-instruct',
    vision: false,
    proveedor: 'nvidia',
    descripcion: 'NVIDIA Llama 3.1 70B Instruct (fallback de texto).',
    temperature: 0.01,
    timeoutMs: 15000,
  },
};

// === Orden de cascada ===
const CASCADE_VISION = ['GEMINI_FLASH_LITE', 'GEMINI_FLASH', 'LLAMA_VISION'];
const CASCADE_TEXT = ['GROQ_TEXT', 'GEMINI_TEXT', 'NVIDIA_LLAMA_TEXT'];

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

let geminiKeyIndex = 0;
let groqKeyIndex = 0;
function getApiKey(proveedor: ProveedorIA): string {
  if (proveedor === 'gemini') {
    const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
    if (keys.length === 0) throw new Error('GEMINI_API_KEY no esta en .env');
    const selected = keys[geminiKeyIndex % keys.length];
    geminiKeyIndex = (geminiKeyIndex + 1) % keys.length;
    return selected;
  }
  if (proveedor === 'groq') {
    const keys = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_BACKUP, process.env.GROQ_API_KEY_3].filter(Boolean) as string[];
    if (keys.length === 0) throw new Error('GROQ_API_KEY no esta en .env');
    const selected = keys[groqKeyIndex % keys.length];
    groqKeyIndex = (groqKeyIndex + 1) % keys.length;
    return selected;
  }
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY no esta en .env');
  return key;
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
        const espera = 300 * Math.pow(2, intento);
        console.warn(`[iaAdapter] ${label} reintento tras ${espera}ms — ${msg.slice(0, 100)}`);
        await new Promise((r) => setTimeout(r, espera));
      }
    }
  }
  throw lastError;
}

async function llamarGemini(
  modeloKey: keyof typeof MODELOS,
  prompt: string,
  imagenes?: Array<{ base64: string; mimeType: string }>
): Promise<{ content: string; fuente: Fuente }> {
  const modelo = MODELOS[modeloKey];
  const apiKey = getApiKey('gemini');
  const url = `${GEMINI_API_BASE}/${modelo.id}:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: prompt }];

  if (imagenes && imagenes.length > 0) {
    for (const img of imagenes) {
      const cleanB64 = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
      parts.push({
        inline_data: {
          mime_type: img.mimeType || 'image/jpeg',
          data: cleanB64,
        },
      });
    }
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: modelo.temperature,
      maxOutputTokens: 1024,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), modelo.timeoutMs);

  try {
    const inicio = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini ${response.status}: ${errText.slice(0, 150)}`);
    }

    const data = await response.json();
    const rawTexto =
      data.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || '')
        .filter(Boolean)
        .join('\n')
        .trim() || '';

    const texto = rawTexto.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (!texto) {
      throw new Error(`${modeloKey} devolvio respuesta vacia`);
    }

    const duracion = Date.now() - inicio;
    console.log(`[iaAdapter] ${modeloKey} respondio en ${duracion}ms (${texto.length} chars)`);

    return { content: texto, fuente: modeloKey };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function llamarOpenAICompatible(
  modeloKey: keyof typeof MODELOS,
  body: any
): Promise<{ content: string; fuente: Fuente }> {
  const modelo = MODELOS[modeloKey];
  const apiKey = getApiKey(modelo.proveedor);
  const apiUrl = modelo.proveedor === 'groq' ? GROQ_API_URL : NVIDIA_API_URL;

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

export type MimeTypeEntrada = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

/**
 * Transcribe una imagen o documento PDF (lista de utiles) a texto plano.
 */
export async function transcribirOCR(
  imagenBase64: string,
  mimeType: MimeTypeEntrada = 'image/jpeg'
): Promise<OCRResult> {
  return transcribirMultiplesImagenesOCR([{ base64: imagenBase64, mimeType }]);
}

/**
 * Transcribe múltiples imágenes o documentos PDF (páginas de una lista escolar)
 */
export async function transcribirMultiplesImagenesOCR(
  imagenes: Array<{ base64: string; mimeType?: MimeTypeEntrada }>
): Promise<OCRResult> {
  if (imagenes.length === 0) {
    return { texto: '', confianza: 'baja', fuente: 'GEMINI_FLASH_LITE' };
  }

  const prompt = `Eres un transcriptor experto de listas de útiles escolares.
Tarea: Analiza la foto o imágenes y extrae todos los útiles escolares que aparecen en ella.

REGLAS ESTRICTAS:
- Una sola línea por cada útil escolar (ej. "1 cuaderno de cuadros", "3 lápices HB", "1 borrador blanco")
- Sin numeración de incisos, sin precios, sin categorías
- Devuelve ÚNICAMENTE la lista de útiles, sin introducciones ni explicaciones.`;

  let ultimoError: unknown;

  for (const modeloKey of CASCADE_VISION) {
    const modelo = MODELOS[modeloKey];
    const label = `${modeloKey}-vision`;

    try {
      const resultado = await backoffRetry(async () => {
        if (modelo.proveedor === 'gemini') {
          return await llamarGemini(
            modeloKey as keyof typeof MODELOS,
            prompt,
            imagenes.map((img) => ({
              base64: img.base64,
              mimeType: img.mimeType || 'image/jpeg',
            }))
          );
        } else {
          // NVIDIA / OpenAI vision format
          const rawB64 = imagenes[0].base64.includes(',')
            ? imagenes[0].base64.split(',')[1]
            : imagenes[0].base64;
          return await llamarOpenAICompatible(modeloKey as keyof typeof MODELOS, {
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${imagenes[0].mimeType || 'image/jpeg'};base64,${rawB64}` },
                  },
                ],
              },
            ],
            max_tokens: 1024,
          });
        }
      }, label);

      const lineas = resultado.content.split('\n').filter((l) => l.trim().length > 0).length;
      return {
        texto: resultado.content,
        confianza: lineas >= 1 ? 'alta' : 'baja',
        fuente: resultado.fuente,
      };
    } catch (err: any) {
      ultimoError = err;
      const msg = String(err?.message ?? err).slice(0, 150);
      console.warn(`[iaAdapter] ${modeloKey} fallo: ${msg}`);
    }
  }

  const msg = ultimoError instanceof Error ? ultimoError.message : String(ultimoError);
  throw new Error(`Todos los modelos de visión fallaron. Ultimo: ${msg.slice(0, 200)}`);
}

/**
 * Interpreta texto libre del cliente y devuelve items estructurados.
 */
export async function interpretarTexto(
  textoLibre: string,
  _inventarioDisponible?: string[]
): Promise<LLMResult> {
  const prompt = `Eres un parser experto de listas de útiles escolares.
Tu único trabajo es limpiar el texto y extraer cada útil escolar con su cantidad exactamente como el cliente lo escribió.

REGLAS ESTRICTAS:
- NO inventes ni sustituyas ningún producto por otro.
- Conserva el nombre original del útil escolar (ej. "caja de marcadores doble punta de 12 colores", "block de papel iris").
- Si no tiene número de cantidad explícito, usa 1.
- Formato estricto de salida: cantidad|nombre_original
- NADA de explicaciones, saludos ni comentarios. Solo las líneas cantidad|nombre.

TEXTO DE LA LISTA:
"""
${textoLibre}
"""

Ejemplo de salida:
1|cuaderno parvulario cosido 100 hojas de lineas
1|cuaderno parvulario cosido 100 hojas de cuadros
1|carpeta tipo sobre broche plastico duro
3|lapices delgados triplus HB`;

  let ultimoError: unknown;

  for (const modeloKey of CASCADE_TEXT) {
    const modelo = MODELOS[modeloKey];
    const label = `${modeloKey}-text`;

    try {
      const resultado = await backoffRetry(async () => {
        if (modelo.proveedor === 'gemini') {
          return await llamarGemini(modeloKey as keyof typeof MODELOS, prompt);
        } else {
          return await llamarOpenAICompatible(modeloKey as keyof typeof MODELOS, {
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1024,
          });
        }
      }, label);

      return { texto: resultado.content, fuente: resultado.fuente };
    } catch (err: any) {
      ultimoError = err;
      const msg = String(err?.message ?? err).slice(0, 150);
      console.warn(`[iaAdapter] ${modeloKey} fallo: ${msg}`);
    }
  }

  const msg = ultimoError instanceof Error ? ultimoError.message : String(ultimoError);
  throw new Error(`Todos los modelos de texto fallaron. Ultimo: ${msg.slice(0, 200)}`);
}

export interface IntencionSemantica {
  intencion: 'SALUDO' | 'CONSULTA_PRODUCTO' | 'SELECCION_OPCION' | 'LISTA_COMPUESTA' | 'CONFIRMACION' | 'REINICIAR' | 'OTRO';
  producto_principal?: string | null;
  especificaciones_acumuladas?: string | null;
  cantidad_comprar: number;
  opcion_elegida_index?: number | null;
  items_lista?: Array<{ nombre: string; cantidad: number }>;
}

/**
 * Clasificador Semántico Neuronal para WhatsApp.
 * Interpreta la intención real del usuario considerando TODO el historial de la conversación.
 * Es inmune a typos, comas, abreviaturas o modismos ecuatorianos.
 */
export async function interpretarIntencionSemantica(
  textoCliente: string,
  contextoHistorial?: string,
  opcionesActivas?: Array<{ id: string; nombre: string; precio: number }>
): Promise<IntencionSemantica> {
  const opcionesTexto = (opcionesActivas || [])
    .map((o, i) => `  ${i + 1}. ${o.nombre} ($${o.precio.toFixed(2)})`)
    .join('\n');

  const systemPrompt = `Eres el cerebro semántico del chatbot de ventas de una librería/papelería en Ecuador vía WhatsApp.
Tu trabajo es CLASIFICAR la intención del último mensaje del cliente, considerando TODO el historial previo de la conversación.

REGLAS CRÍTICAS:
1. MEMORIA DEL HILO: Si el cliente dice "pero una docena pues", "el que ya te dije", "cambia a 12", o "pero quiero espiral", RECUERDA qué producto estaban discutiendo en mensajes anteriores. Su intención es CORREGIR o ACTUALIZAR el pedido anterior, NO buscar un producto nuevo.

2. CANTIDAD vs ATRIBUTO: "100 hojas" y "12 colores" son ATRIBUTOS del producto (modelo/presentación), NO la cantidad a comprar. La cantidad es 1 a menos que el cliente diga explícitamente: "una docena" (12), "media docena" (6), "2 cuadernos" (2), "quiero 5" (5), etc.

3. CORRECCIÓN DE CANTIDAD: Si el cliente dice "pero una docena pues", "te dije una docena", "ponle 12", es SELECCION_OPCION con cantidad_comprar actualizada. NO es una nueva consulta.

4. REFERENCIA IMPLÍCITA: "El que ya te dije", "ese mismo", "el primero", "el más barato", "el de $3.50" son SELECCION_OPCION con referencia al producto ya discutido.

5. REINICIAR: "reset", "reiniciar", "limpiar", "empezar de nuevo" → REINICIAR.

6. CONFIRMACION: "sí", "confirmo", "dale", "listo", "ok" → CONFIRMACION.

7. SALUDO: ÚNICAMENTE si el mensaje es SOLO un saludo aislado (ej. "hola", "buenas", "buenos días") y NO contiene ninguna pregunta de producto. Si el cliente dice "Hola, tienes cuadernos..." o "Buenas tardes, necesito esferos", es SIEMPRE CONSULTA_PRODUCTO o LISTA_COMPUESTA.

8. SELECCION DE OPCION POR MARCA, PERSONAJE O NUMERO:
   Si se presentaron opciones al cliente (ej. una lista numerada 1, 2, ..., 13) y el cliente responde eligiendo una marca, personaje o número (ej. "Dame 2 del stitch", "el de avengers", "quiero el 4", "la de minnie"):
   - "intencion": "SELECCION_OPCION"
   - "cantidad_comprar": la cantidad que pidió (ej. 2 si dijo "Dame 2 del stitch", 1 por defecto).
   - "opcion_elegida_index": el índice exacto (1-indexed) de ese producto en la lista de "OPCIONES ACTUALMENTE PRESENTADAS AL CLIENTE".

9. AGREGAR A UN PEDIDO EXISTENTE (ACUMULAR LISTA):
   Si el cliente ya tiene una cotización o producto elegido y dice "Y 3 de avengers", "agrégale 1 borrador", "también quiero 2 esferos":
   - "intencion": "LISTA_COMPUESTA"
   - "items_lista": DEBE incluir los productos previos ya cotizados en el historial MÁS el nuevo producto con sus cantidades.

10. PAQUETES vs UNIDADES / CIENTOS / RESMAS (CONVERSIÓN COMERCIAL):
   - "1 ciento de cartulinas" = 100 hojas de cartulina. Si el producto de catálogo es "Paquete de cartulinas ... 25 unidades", cotiza 4 paquetes (100 / 25 = 4). NUNCA cotices 100 paquetes.
   - "1 resma de papel" = 1 unidad de resma (1 paquete de 500 hojas). La cantidad a cotizar es 1.
   - "1 docena" = 12 unidades. "media docena" = 6 unidades. "1 par" = 2 unidades.

11. EXTRACCIÓN EXHAUSTIVA DE LISTAS DE ÚTILES:
   - Cuando el cliente pide múltiples útiles (ej. cuadernos, lápices bicolores, tijeras, borradores), DEBES extraer ABSOLUTAMENTE TODOS los ítems en "items_lista" sin omitir ninguno.
   - Si incluye una pregunta adicional (ej. "¿Hacen entregas a domicilio?"), clasifícalo como "LISTA_COMPUESTA" y asegúrate de no omitir ningún producto.

RESPONDE SIEMPRE en JSON EXACTO:
{
  "intencion": "SALUDO" | "CONSULTA_PRODUCTO" | "SELECCION_OPCION" | "LISTA_COMPUESTA" | "CONFIRMACION" | "REINICIAR" | "OTRO",
  "producto_principal": "cuaderno" | null,
  "especificaciones_acumuladas": "cuaderno 100 hojas cuadros espiral" | null,
  "cantidad_comprar": 1,
  "opcion_elegida_index": 1 | null,
  "items_lista": [{ "nombre": "cuaderno stitch 200 hojas", "cantidad": 2 }, { "nombre": "cuaderno avengers 200 hojas", "cantidad": 3 }]
}`;

  const userPrompt = `HISTORIAL DE CONVERSACIÓN (más reciente al final):
${contextoHistorial || '(Sin historial previo — primer mensaje del cliente)'}

OPCIONES ACTUALMENTE PRESENTADAS AL CLIENTE:
${opcionesTexto || '(Ninguna — no se han mostrado opciones aún)'}

ÚLTIMO MENSAJE DEL CLIENTE: "${textoCliente}"

Clasifica la intención del último mensaje. JSON:`;

  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];

  for (const apiKey of geminiKeys) {
    try {
      const url = `${GEMINI_API_BASE}/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Entendido. Clasificaré la intención del cliente considerando todo el historial del chat y las opciones presentadas. Respondo siempre en JSON.' }] },
            { role: 'user', parts: [{ text: userPrompt }] },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.05,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const parsedText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (parsedText) {
        const result = JSON.parse(parsedText) as IntencionSemantica;
        console.log(`[iaAdapter Semántica] Intención: ${result.intencion}, Prod: ${result.producto_principal}, Specs: ${result.especificaciones_acumuladas}, Cant: ${result.cantidad_comprar}, OptIdx: ${result.opcion_elegida_index}`);
        return result;
      }
    } catch (e: any) {
      console.warn(`[iaAdapter] Gemini semántica key falló (${e?.message?.slice(0, 60)}), intentando siguiente key...`);
    }
  }

  // Fallback con Groq ultra-rápido si Gemini falló o rate-limitó (cascada de llaves + modelos)
  const groqKeys = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_BACKUP, process.env.GROQ_API_KEY_3].filter(Boolean) as string[];
  const groqModelos = ['qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'];

  for (const groqKey of groqKeys) {
    for (const gMod of groqModelos) {
      try {
        const resGroq = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: gMod,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.05,
          }),
        });
        const dataGroq = await resGroq.json();
        const content = dataGroq.choices?.[0]?.message?.content;
        if (content) {
          const result = JSON.parse(content) as IntencionSemantica;
          console.log(`[iaAdapter Groq Fallback Semántica (${gMod})] Intención: ${result.intencion}, Prod: ${result.producto_principal}`);
          return result;
        }
      } catch (err: any) {
        console.warn(`[iaAdapter] Fallback Groq ${gMod} semántica error:`, err?.message);
      }
    }
  }

  // Fallback seguro
  return {
    intencion: 'CONSULTA_PRODUCTO',
    producto_principal: null,
    especificaciones_acumuladas: textoCliente,
    cantidad_comprar: 1,
    opcion_elegida_index: null,
    items_lista: [],
  };
}

export interface RespuestaAgenteVentas {
  accion: 'RESPONDER_CHAT' | 'COTIZAR_PEDIDO';
  mensaje_whatsapp: string;
  producto_elegido_index?: number | null;
  cantidad?: number | null;
}

/**
 * Agente de Ventas Inteligente para WhatsApp.
 * Genera respuestas 100% humanas y comerciales manteniendo el hilo y guiando al cliente con sentido común.
 */
export async function generarRespuestaVentas(
  historial: Array<{ role: 'user' | 'model'; texto: string }>,
  ultimoMensajeCliente: string,
  productosEnStock: Array<{ id: string; nombre: string; precio: number; marca?: string }>,
  alternativasEnStock: Array<{ id: string; nombre: string; precio: number; marca?: string }> = [],
  hayCoincidenciaExacta: boolean = true,
  nombreLibreria: string = 'Santiago Papelería'
): Promise<RespuestaAgenteVentas> {
  const stockTexto = productosEnStock
    .map((p, i) => `${i + 1}. ${p.nombre} — $${p.precio.toFixed(2)} c/u`)
    .join('\n');

  const alternativasTexto = alternativasEnStock
    .map((p, i) => `${i + 1}. ${p.nombre} — $${p.precio.toFixed(2)} c/u`)
    .join('\n');

  const systemPrompt = `Eres el asistente y vendedor estrella de "${nombreLibreria}" en WhatsApp (Ecuador).
Tu personalidad es amable, atenta, rápida, honesta y con sentido común comercial.

VERIFICACIÓN EN TIEMPO REAL DE LA BASE DE DATOS DE STOCK:
- Coincidencias exactas encontradas en stock: ${hayCoincidenciaExacta && productosEnStock.length > 0 ? '\n' + stockTexto : 'NINGUNA (0 unidades de este modelo/medida específica en stock)'}
${!hayCoincidenciaExacta && alternativasEnStock.length > 0 ? '- Alternativas similares disponibles en tienda:\n' + alternativasTexto : ''}

REGLAS DE ORO DE VERACIDAD Y ATENCIÓN:
1. VERACIDAD DE STOCK (ESTRICTA):
   - Si NO hay coincidencia exacta de lo que pide el cliente (ej. pide 200 hojas y hay 0 en stock):
     * NUNCA mientas diciendo "Sí tenemos".
     * NUNCA preguntes "¿cuadros o líneas?" como si lo tuvieras disponible.
     * Di la verdad DE FRENTE en tu primer mensaje con amabilidad: *"Por el momento no disponemos de cuadernos de 200 hojas en stock. Lo que tenemos disponible son opciones de 100 hojas que te pueden servir..."* y ofrece las alternativas disponibles con sus precios.
   - Si SÍ hay coincidencia en stock: sigue el orden natural de atención.

2. ORDEN DE ATENCIÓN EN EL MOSTRADOR (SENTIDO COMÚN DE STOCK):
   - NUNCA PREGUNTES POR OPCIONES QUE NO EXISTEN EN LA LISTA DE STOCK:
     * Si en la lista de stock TODOS son cosidos (no hay espiral), NUNCA preguntes "¿cosidos o con espiral?". Di directamente: *"¡Hola! Sí tenemos cuadernos de 200 hojas en modelo cosido (a cuadros y a líneas en marcas como Stitch, Avengers, Andaluz). ¿Los buscas a cuadros o a líneas?"*.
     * Si en stock solo hay espiral, no preguntes si quieren cosido.
     * Si en stock solo hay a cuadros, no preguntes si quieren a líneas.
     * Solo pregunta u ofrece las características que REALMENTE están presentes en la lista de stock proporcionada.
   - CAMBIOS DE CRITERIO EN LA CONVERSACIÓN: Si venían hablando de que no hay en espiral y el cliente luego pregunta "¿De 200 hojas a cuadros?", RECUERDA que en modelo COSIDO SÍ tienes 200 hojas a cuadros (Andaluz, Stitch, Avengers, etc.). No asumas que sigue insistiendo en espiral; muéstrale de inmediato los modelos cosidos que sí tienes en stock.
   - Si en stock hay pocas opciones (3 a 10 productos), muéstralas directamente numeradas 1️⃣, 2️⃣, 3️⃣ con sus marcas y precios para que el cliente elija rápido.
   - ORDEN DE LA LISTA: Cuando muestres opciones numeradas, SIEMPRE respeta el MISMO orden en que aparecen en la lista de stock (ya están ordenadas por precio de menor a mayor). NUNCA reordenes, filtres ni omitas productos de la lista proporcionada. El item 1 de la lista DEBE ser tu 1️⃣, el item 2 DEBE ser tu 2️⃣, etc.

3. CUÁNDO RESPONDER vs CUÁNDO COTIZAR:
   - "accion": "RESPONDER_CHAT" ➔ Cuando el cliente está preguntando, respondiendo al filtro, pidiendo opciones o si no hay stock de la combinación solicitada.
   - "accion": "COTIZAR_PEDIDO" ➔ ÚNICAMENTE cuando el cliente haya elegido claramente una opción (ej. "la 2", "el de Norma", "el 1 y quiero 12").

4. CANTIDAD vs ATRIBUTO: "100 hojas" es el modelo. "Una docena" = 12 unidades. Si dice "la 2, cuánto sería la docena?", la cantidad es 12 y el producto elegido es el 2.

5. REGLAS DE FORMATO DEL MENSAJE:
   - NUNCA incluyas códigos internos, IDs, UUIDs ni datos técnicos en tu mensaje.
   - NUNCA digas "¡Hola!" ni saludes de nuevo si ya hay historial de conversación previo.
   - Sé directo, natural y transparente.

6. MENCIONES EXPLÍCITAS Y CATEGORÍAS:
   - Al responder por un producto o categoría (ej. cuadernos, esferos, tijeras, papelería), menciona SIEMPRE de forma explícita el nombre del producto en tu respuesta (ej. *"Con gusto te ayudo con los cuadernos..."*).
   - Si el cliente pregunta qué tienes para *oficina* o para *estudiantes / escolares*, menciona de forma destacada los productos esenciales de esas áreas (resmas de papel bond, esferos, carpetas, cuadernos, lápices, tijeras y gomas), además de los ítems en stock.

FORMATO DE SALIDA ESTRICTO EN JSON:
{
  "accion": "RESPONDER_CHAT" | "COTIZAR_PEDIDO",
  "mensaje_whatsapp": string, // Tu mensaje formateado con negritas, emojis y saltos de línea listos para WhatsApp
  "producto_elegido_index": number | null, // 1, 2, 3... o null
  "cantidad": number | null // cantidad a comprar (ej. 12 para docena) o null
}`;

  const promptContents: any[] = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Entendido. Hablaré como el vendedor humano de la librería, respondiendo siempre en JSON estricto.' }] },
  ];

  for (const msg of historial.slice(-6)) {
    promptContents.push({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.texto }],
    });
  }

  promptContents.push({
    role: 'user',
    parts: [{ text: ultimoMensajeCliente }],
  });

  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];

  for (const apiKey of geminiKeys) {
    try {
      const url = `${GEMINI_API_BASE}/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: promptContents,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const parsedText =
        json.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text ||
        json.candidates?.[0]?.content?.parts?.[0]?.text;

      if (parsedText) {
        return JSON.parse(parsedText) as RespuestaAgenteVentas;
      }
    } catch (e: any) {
      console.warn(`[iaAdapter] Gemini ventas key falló (${e?.message?.slice(0, 60)}), intentando siguiente key...`);
    }
  }

  // Fallback con Groq ultra-rápido para ventas (cascada de llaves + modelos)
  const groqKeys = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_BACKUP, process.env.GROQ_API_KEY_3].filter(Boolean) as string[];
  const groqModelos = ['qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...historial.slice(-4).map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.texto })),
    { role: 'user', content: ultimoMensajeCliente },
  ];

  for (const groqKey of groqKeys) {
    for (const gMod of groqModelos) {
      try {
        const resGroq = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: gMod,
            messages: groqMessages,
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        });
        const dataGroq = await resGroq.json();
        const content = dataGroq.choices?.[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as RespuestaAgenteVentas;
        }
      } catch (err: any) {
        console.warn(`[iaAdapter] Fallback Groq ${gMod} ventas error:`, err?.message);
      }
    }
  }

  const fallbackOpciones = productosEnStock
    .map((p, i) => `${i + 1}️⃣ ${p.nombre} ($${p.precio.toFixed(2)} c/u)`)
    .join('\n');
  return {
    accion: 'RESPONDER_CHAT',
    mensaje_whatsapp: `¡Con gusto te ayudamos! Tenemos estas opciones en stock:\n\n${fallbackOpciones}\n\n¿Cuál de estas prefieres?`,
    producto_elegido_index: null,
    cantidad: 1,
  };
}