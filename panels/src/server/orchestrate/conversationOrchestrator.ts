// Orquestador principal — state machine conversacional.
// Recibe un mensaje entrante del cliente + el contexto actual,
// decide el siguiente paso usando el evaluador IA + el switch determinista.
import {
  obtenerConversacion,
  crearConversacion,
  actualizarConversacion,
  Conversacion,
} from '../adapters/conversacionAdapter';
import { obtenerOCrearCliente, actualizarCRMCliente } from '../adapters/clienteAdapter';
import { getInventarioAsync } from '../adapters/inventarioAdapter';
import { interpretarTexto, transcribirOCR } from '../adapters/iaAdapter';
import { cotizar } from '../services/matchingService';
import { crearPedido } from '../services/pedidoService';
import { ConversationState, esTransicionValida } from '../domain/conversationState';
import {
  evaluarEstadoConversacion,
  detectarFrustracionRapida,
  DecisionIA,
} from './conversationEngine';
import { cargarPrompt } from '../prompts/loader';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

export interface EntradaMensaje {
  tenantId: string;
  clienteTelefono: string;
  texto?: string;
  imagenBase64?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ResultadoMensaje {
  conversacion: Conversacion;
  decision: DecisionIA;
  respuestaAlCliente: string;
  pedidoId?: string;
}

export async function procesarMensajeEntrante(
  entrada: EntradaMensaje
): Promise<ResultadoMensaje> {
  // 1. Cargar o crear conversacion
  let conv = await obtenerConversacion(entrada.tenantId, entrada.clienteTelefono);
  if (!conv) {
    conv = await crearConversacion(entrada.tenantId, entrada.clienteTelefono);
  }

  // 2. Extraer el texto del mensaje (si vino imagen, OCR primero)
  let texto = entrada.texto ?? '';
  if (entrada.imagenBase64) {
    try {
      const ocr = await transcribirOCR(entrada.imagenBase64, entrada.mimeType);
      texto = ocr.texto;
    } catch (e) {
      // Riesgo #16: falla OCR, escala directo a humano
      const update = await actualizarConversacion(conv.id, {
        estadoActual: 'DERIVADO_A_HUMANO',
        requiereHumano: true,
        ultimoMensaje: '[imagen no procesable]',
      });
      return {
        conversacion: update,
        decision: {
          decision: 'ESCALAR_HUMANO',
          confianza: 1.0,
          razon: 'OCR fallo, imagen no procesable',
          requiere_humano: true,
          siguiente_paso: 'DERIVADO_A_HUMANO',
          tono_cliente: 'neutral',
          items_detectados: [],
        },
        respuestaAlCliente:
          'No pude leer la imagen. Te comunico con el encargado para que te atienda personalmente. 🤲',
      };
    }
  }

  // 3. Deteccion rapida de frustration (sin gastar API)
  const frustracion = detectarFrustracionRapida(texto);
  if (frustracion.frustrado && frustracion.intensidad !== 'BAJA') {
    const update = await actualizarConversacion(conv.id, {
      estadoActual: 'DERIVADO_A_HUMANO',
      requiereHumano: true,
      ultimoMensaje: texto,
      contadorFrustracion: conv.contadorFrustracion + 1,
    });
    return {
      conversacion: update,
      decision: {
        decision: 'ESCALAR_HUMANO',
        confianza: 0.9,
        razon: `frustracion ${frustracion.intensidad}: ${frustracion.categorias.join(',')}`,
        requiere_humano: true,
        siguiente_paso: 'DERIVADO_A_HUMANO',
        tono_cliente: 'frustrado',
        items_detectados: [],
      },
      respuestaAlCliente:
        'Siento mucho no haber podido ayudarte mejor. Te comunico con el encargado para que termine de atenderte. 🤲 Gracias por tu paciencia.',
    };
  }

  // 4. Si es el primer mensaje y NO tiene texto, pedir la lista
  if (conv.estadoActual === 'INICIAL' && texto.trim().length === 0) {
    const update = await actualizarConversacion(conv.id, {
      ultimoMensaje: texto,
      estadoActual: 'INICIAL',
    });
    return {
      conversacion: update,
      decision: {
        decision: 'MANTENER_ESTADO',
        confianza: 1.0,
        razon: 'primer mensaje vacio',
        requiere_humano: false,
        siguiente_paso: 'INICIAL',
        tono_cliente: 'neutral',
        items_detectados: [],
      },
      respuestaAlCliente:
        'Hola, soy el asistente de la librería. Envíame tu lista de útiles (texto, foto o PDF) y te ayudo a cotizar.',
    };
  }

  // 5. Si estado INICIAL y tenemos texto, parsear la lista con IA
  let contextoActual = { ...conv.contexto };
  if (conv.estadoActual === 'INICIAL' && texto.trim().length > 0) {
    const inventario = await getInventarioAsync(entrada.tenantId);
    const nombres = inventario.map(p => p.nombre);

    const interpretacion = await interpretarTexto(texto, nombres);
    const lineas = interpretacion.texto.split('\n').filter(l => l.trim().length > 0);
    const items: Array<{ cantidad: number; nombre: string; confianza: string }> = [];
    const ambiguos: string[] = [];

    for (const linea of lineas) {
      const partes = linea.split('|').map(p => p.trim());
      if (partes.length >= 3) {
        const cant = parseInt(partes[0], 10);
        const nombre = partes[1];
        const conf = partes[2];
        if (!isNaN(cant) && nombre) {
          items.push({ cantidad: cant, nombre, confianza: conf });
        } else if (nombre) {
          ambiguos.push(nombre);
        }
      } else if (partes.length === 2) {
        const cant = parseInt(partes[0], 10);
        const nombre = partes[1];
        if (!isNaN(cant) && nombre) {
          items.push({ cantidad: cant, nombre, confianza: 'ALTA' });
        }
      }
    }

    contextoActual = {
      ...contextoActual,
      lista_original: texto,
      items_parseados: items,
      ambiguos,
    };

    conv = await actualizarConversacion(conv.id, {
      contexto: contextoActual,
      estadoActual: 'CONFIRMANDO_LISTA',
      ultimoMensaje: texto,
    });

    return {
      conversacion: conv,
      decision: {
        decision: 'MANTENER_ESTADO',
        confianza: 1.0,
        razon: 'lista recibida, esperando confirmacion',
        requiere_humano: false,
        siguiente_paso: 'CONFIRMANDO_LISTA',
        tono_cliente: 'neutral',
        items_detectados: items,
      },
      respuestaAlCliente: await generarMensajeConfirmacionLista(contextoActual),
    };
  }

  // 6. Evaluacion IA del mensaje contra el estado actual
  const decisionIA = await evaluarEstadoConversacion(
    conv.estadoActual,
    contextoActual,
    texto
  );

  // 7. Switch determinista — validar transicion
  const nuevoEstado = decisionIA.siguiente_paso as ConversationState;
  let estadoFinal: ConversationState = conv.estadoActual;

  if (decisionIA.requiere_humano) {
    estadoFinal = 'DERIVADO_A_HUMANO';
  } else if (
    nuevoEstado &&
    nuevoEstado !== conv.estadoActual &&
    esTransicionValida(conv.estadoActual, nuevoEstado)
  ) {
    estadoFinal = nuevoEstado;
  } else if (decisionIA.decision === 'CANCELAR') {
    estadoFinal = 'ABANDONADO';
  }

  // 8. Efectos colaterales segun el estado al que llegamos
  contextoActual = await aplicarEfectosEstado(
    estadoFinal,
    decisionIA,
    contextoActual,
    entrada
  );

  // 9. Si llegamos a CONFIRMANDO_PAGO y la IA confirmo, crear pedido y derivar
  let pedidoId: string | undefined;
  if (estadoFinal === 'COMPLETADO' || (estadoFinal === 'DERIVADO_A_HUMANO' && contextoActual.pedido_id)) {
    // el pedido se crea antes, en CONFIRMANDO_LOGISTICA → CONFIRMANDO_PAGO
    pedidoId = contextoActual.pedido_id;
  }
  if (
    decisionIA.decision === 'ELEGIR_PAGO' &&
    estadoFinal === 'CONFIRMANDO_PAGO' &&
    contextoActual.logistica &&
    contextoActual.metodo_pago
  ) {
    pedidoId = await crearPedidoDesdeContexto(contextoActual, entrada);
    contextoActual.pedido_id = pedidoId;
    estadoFinal = 'DERIVADO_A_HUMANO';
  }

  // 10. Actualizar conversacion
  const convActualizada = await actualizarConversacion(conv.id, {
    estadoActual: estadoFinal,
    contexto: contextoActual,
    ultimoMensaje: texto,
    requiereHumano: decisionIA.requiere_humano || estadoFinal === 'DERIVADO_A_HUMANO',
    contadorFrustracion:
      decisionIA.tono_cliente === 'frustrado'
        ? conv.contadorFrustracion + 1
        : 0,
  });

  // 11. Extraer datos CRM del mensaje (si la IA detecto algo)
  await extraerDatosCRM(contextoActual, decisionIA, entrada.clienteTelefono, entrada.tenantId);

  // 12. Generar respuesta al cliente segun el estado
  const respuestaAlCliente = await generarRespuestaSegunEstado(
    estadoFinal,
    contextoActual,
    decisionIA
  );

  return {
    conversacion: convActualizada,
    decision: decisionIA,
    respuestaAlCliente,
    pedidoId,
  };
}

async function aplicarEfectosEstado(
  estadoFinal: ConversationState,
  decisionIA: DecisionIA,
  contexto: Record<string, any>,
  entrada: EntradaMensaje
): Promise<Record<string, any>> {
  let ctx = { ...contexto };

  // Si el cliente confirmo la lista, cotizamos
  if (estadoFinal === 'CONFIRMANDO_COTIZACION' && decisionIA.decision === 'CONFIRMAR_LISTA') {
    // FIX Bug #1: pasar items con cantidad (no solo nombres)
    const itemsParaCotizar = (ctx.items_parseados ?? []).map((i: any) => ({
      nombre: i.nombre,
      cantidad: Number.isFinite(i.cantidad) && i.cantidad > 0 ? i.cantidad : 1,
    }));
    const cotizacion = await cotizar(entrada.tenantId, itemsParaCotizar);
    ctx.cotizacion = {
      items: cotizacion.items,
      total: cotizacion.total,
      ambiguos: cotizacion.ambiguos,
    };
    ctx.estado_cotizacion = 'pendiente_confirmar';
  }

  // Si la IA detecto agregar items, sumarlos a la lista
  if (decisionIA.decision === 'AGREGAR_ITEMS' && decisionIA.items_detectados.length > 0) {
    const itemsActuales = ctx.items_parseados ?? [];
    ctx.items_parseados = [...itemsActuales, ...decisionIA.items_detectados];
  }

  // Si el cliente eligio logistica
  if (decisionIA.decision === 'ELEGIR_LOGISTICA') {
    const t = (entrada.texto ?? '').toLowerCase();
    if (t.includes('retiro') || t.includes('local')) ctx.logistica = 'retiro';
    else if (t.includes('envio') || t.includes('domicilio')) ctx.logistica = 'envio';
  }

  // Si el cliente eligio pago
  if (decisionIA.decision === 'ELEGIR_PAGO') {
    const t = (entrada.texto ?? '').toLowerCase();
    if (t.includes('transferencia')) ctx.metodo_pago = 'transferencia';
    else if (t.includes('efectivo')) ctx.metodo_pago = 'efectivo';
    else if (t.includes('tarjeta')) ctx.metodo_pago = 'tarjeta';
  }

  return ctx;
}

async function crearPedidoDesdeContexto(
  contexto: Record<string, any>,
  entrada: EntradaMensaje
): Promise<string> {
  const cliente = await obtenerOCrearCliente(entrada.tenantId, entrada.clienteTelefono);
  const cotizacion = contexto.cotizacion ?? { items: [], total: 0, ambiguos: [] };
  const pedido = await crearPedido(
    {
      tenantId: entrada.tenantId,
      items: cotizacion.items,
      total: cotizacion.total,
      ambiguos: cotizacion.ambiguos ?? [],
    },
    cliente.nombre ?? 'Cliente',
    entrada.clienteTelefono,
    'whatsapp'
  );
  return pedido.id;
}

async function extraerDatosCRM(
  contexto: Record<string, any>,
  decisionIA: DecisionIA,
  telefono: string,
  tenantId: string
): Promise<void> {
  // Heuristica simple: si la IA devolvio items_detectados y mencionamos datos del cliente,
  // podriamos actualizar el CRM. Por ahora solo guardamos historial_count y preferencias basicas.
  try {
    const cliente = await obtenerOCrearCliente(tenantId, telefono);
    const cambios: any = {};

    // Si la conversacion tiene preferencias detectadas
    if (decisionIA.decision === 'CONFIRMAR_LISTA' && contexto.cotizacion) {
      cambios.historialCount = cliente.historialCount + 1;
      cambios.ultimoPedidoAt = new Date();
    }

    if (Object.keys(cambios).length > 0) {
      await actualizarCRMCliente(cliente.id, cambios);
    }
  } catch (e) {
    console.warn('[CRM] no se pudo actualizar:', (e as Error).message);
  }
}

async function generarMensajeConfirmacionLista(
  contexto: Record<string, any>
): Promise<string> {
  const items = contexto.items_parseados ?? [];
  const ambiguos = contexto.ambiguos ?? [];

  const lineas = items.map((i: any, idx: number) =>
    `${idx + 1}. ${i.cantidad}x ${i.nombre}`
  );

  let msg = 'Recibí tu lista:\n\n' + lineas.join('\n');
  if (ambiguos.length > 0) {
    msg += `\n\nNo identifiqué: ${ambiguos.join(', ')}. ¿Puedes decirme qué son?`;
  }
  msg += '\n\n¿Me confirmas que está todo bien antes de cotizarte?';

  return msg;
}

async function generarRespuestaSegunEstado(
  estadoFinal: ConversationState,
  contexto: Record<string, any>,
  decisionIA: DecisionIA
): Promise<string> {
  switch (estadoFinal) {
    case 'DERIVADO_A_HUMANO':
      return 'Te comunico con el encargado para que termine de atenderte. 🤲';

    case 'ABANDONADO':
      return 'Entendido, cancelo el pedido. Cuando quieras volver a empezar, escríbeme.';

    case 'CONFIRMANDO_LISTA_CORREGIDA':
      return generarMensajeConfirmacionLista(contexto).then(m => m);

    case 'RESOLVIENDO_VARIANTES':
      return 'Tengo algunas opciones para vos. ¿Cuál prefieres?';

    case 'CONFIRMANDO_COTIZACION': {
      const items = contexto.cotizacion?.items ?? [];
      const total = contexto.cotizacion?.total ?? 0;
      const lineas = items.map((i: any, idx: number) =>
        `${idx + 1}. ${i.cantidad}x ${i.nombre} — $${(i.precioUnitario * i.cantidad).toFixed(2)}`
      );
      return `Tu cotización:\n\n${lineas.join('\n')}\n\nTotal: $${total.toFixed(2)}\n\n¿Confirmas la compra?`;
    }

    case 'CONFIRMANDO_LOGISTICA':
      return 'Tu pedido está listo.\n\n¿Retiras en el local o quieres envío a domicilio?';

    case 'CONFIRMANDO_PAGO':
      return 'Última pregunta: ¿cómo prefieres pagar?\n\n- Transferencia bancaria\n- Efectivo contra entrega';

    case 'COMPLETADO':
      return 'Listo. Tu pedido quedó registrado. En breve te comunicas con el encargado para finalizar. 🤲';

    default:
      return decisionIA.razon ?? 'Disculpa, no entendí bien. ¿Puedes repetirme?';
  }
}

// Helper: llamada a Groq para generar mensajes con prompts
async function _generarConPrompt(promptName: string, variables: Record<string, any>): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return 'Lo siento, no puedo generar el mensaje ahora.';
  const promptBase = cargarPrompt('00_sistema_base');
  const promptOperativo = cargarPrompt(promptName);

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
        { role: 'system', content: promptOperativo },
        { role: 'user', content: JSON.stringify(variables) },
      ],
      temperature: 0.3,
      max_tokens: 256,
    }),
  });
  if (!response.ok) return 'OK';
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? 'OK';
}
