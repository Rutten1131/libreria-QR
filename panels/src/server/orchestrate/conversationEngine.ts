// Evaluador de estado conversacional — la IA devuelve un JSON estricto
// El switch determinista valida la transicion contra TRANSICIONES_VALIDAS.
import { cargarPrompt } from '../prompts/loader';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

export interface DecisionIA {
  decision:
    | 'CONFIRMAR_LISTA'
    | 'AGREGAR_ITEMS'
    | 'CONFIRMAR_COTIZACION'
    | 'ELEGIR_LOGISTICA'
    | 'ELEGIR_PAGO'
    | 'ESCALAR_HUMANO'
    | 'PREGUNTAR_VARIANTE'
    | 'MANTENER_ESTADO'
    | 'CANCELAR';
  confianza: number;
  razon: string;
  requiere_humano: boolean;
  siguiente_paso: string;
  tono_cliente: 'positivo' | 'neutral' | 'frustrado';
  items_detectados: Array<{ cantidad: number; nombre: string }>;
}

export async function evaluarEstadoConversacion(
  estadoActual: string,
  contexto: Record<string, any>,
  ultimoMensajeCliente: string
): Promise<DecisionIA> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada');

  const promptBase = cargarPrompt('00_sistema_base');
  const promptEval = cargarPrompt('30_evaluar_estado_conversacion');

  const usuario = `ESTADO_ACTUAL: ${estadoActual}
CONTEXTO: ${JSON.stringify(contexto)}
ULTIMO_MENSAJE_CLIENTE: "${ultimoMensajeCliente}"`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: promptBase },
        { role: 'system', content: promptEval },
        { role: 'user', content: usuario },
      ],
      temperature: 0.0,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API ${response.status}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as DecisionIA;

  // Defensa: si la IA devuelve decision invalida, fallback a MANTENER_ESTADO
  const decisionesValidas = [
    'CONFIRMAR_LISTA', 'AGREGAR_ITEMS', 'CONFIRMAR_COTIZACION', 'ELEGIR_LOGISTICA',
    'ELEGIR_PAGO', 'ESCALAR_HUMANO', 'PREGUNTAR_VARIANTE', 'MANTENER_ESTADO', 'CANCELAR',
  ];
  if (!decisionesValidas.includes(parsed.decision)) {
    return {
      decision: 'MANTENER_ESTADO',
      confianza: 0,
      razon: `IA devolvio decision invalida: ${parsed.decision}`,
      requiere_humano: true,
      siguiente_paso: estadoActual,
      tono_cliente: 'neutral',
      items_detectados: [],
    };
  }

  // Defensa: si confianza < 0.7, forzar requiere_humano
  if (parsed.confianza < 0.7 && !parsed.requiere_humano) {
    parsed.requiere_humano = true;
  }

  return parsed;
}

/**
 * Detector rapido de frustration por palabras clave.
 * Complementa al evaluador IA — corre ANTES para reducir costos.
 */
export function detectarFrustracionRapida(mensaje: string): {
  frustrado: boolean;
  intensidad: 'BAJA' | 'MEDIA' | 'ALTA';
  categorias: string[];
} {
  const texto = mensaje.toLowerCase();
  const categorias: string[] = [];

  const directas = ['no me entiende', 'no entiende', 'que no me entiende', 'ya le explique', 'ya le expliqué', 'ya explique'];
  const pedido = ['hablar con alguien', 'persona real', 'quiero un humano', 'comunicame con', 'comuníqueme con'];
  const insultos = ['pesimo', 'pésimo', 'estafa', 'ladrones', 'ladron', 'basura'];
  const abandono = ['ya no quiero', 'olvida', 'cancelar todo', 'me voy a otra parte', 'no me interesa'];

  let intensidad: 'BAJA' | 'MEDIA' | 'ALTA' = 'BAJA';
  for (const k of directas) if (texto.includes(k)) categorias.push('frustracion_directa');
  for (const k of pedido) if (texto.includes(k)) categorias.push('pedido_explicito');
  for (const k of insultos) if (texto.includes(k)) categorias.push('insulto');
  for (const k of abandono) if (texto.includes(k)) categorias.push('abandono_inminente');

  if (categorias.length >= 3) intensidad = 'ALTA';
  else if (categorias.length === 2) intensidad = 'MEDIA';

  return {
    frustrado: categorias.length > 0,
    intensidad,
    categorias,
  };
}
