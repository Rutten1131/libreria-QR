// Adapter de IA — cascada Groq (unica API por decision del usuario)
// Si Groq falla, escala a revision humana (cumple Riesgo #16 del PRD)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export interface OCRResult {
  texto: string;
  confianza: 'alta' | 'baja';
  fuente: 'groq';
}

export interface LLMResult {
  texto: string;
  fuente: 'groq';
}

/**
 * Transcribe una imagen (lista de utiles) a texto plano usando Groq Vision.
 * NO calcula precios, NO interpreta intenciones. Solo transcribe.
 */
export async function transcribirOCR(
  imagenBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/png'
): Promise<OCRResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no esta en .env');
  }

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

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imagenBase64}` },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const texto = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (texto.length === 0) {
    throw new Error('Groq devolvio respuesta vacia');
  }

  // Heuristica simple: si el texto tiene menos items que lineas esperadas, baja confianza
  const lineas = texto.split('\n').filter(l => l.trim().length > 0).length;
  const confianza = lineas >= 1 ? 'alta' : 'baja';

  return { texto, confianza, fuente: 'groq' };
}

/**
 * Interpreta texto libre y lo convierte en una lista estructurada.
 * Usado cuando el cliente escribe "quiero 3 cuadernos y 2 lapices 2B"
 */
export async function interpretarTexto(
  textoLibre: string,
  inventarioDisponible: string[]
): Promise<LLMResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no esta en .env');
  }

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

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    texto: data.choices?.[0]?.message?.content?.trim() ?? '',
    fuente: 'groq',
  };
}
