// Adapter para Evolution API (WhatsApp)
// Por ahora es un stub — cuando llegue la sesion de Evolution del proyecto
// de César, se reemplaza la URL base y el apiKey.

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL ?? 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? '';

export interface MensajeTexto {
  numero: string;
  texto: string;
}

export async function enviarMensaje(instanceName: string, mensaje: MensajeTexto): Promise<void> {
  if (!EVOLUTION_API_KEY) {
    console.warn('[evolution] apiKey no configurada — mensaje NO enviado (modo stub)');
    return;
  }

  const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: mensaje.numero,
      text: mensaje.texto,
    }),
  });

  if (!response.ok) {
    throw new Error(`Evolution ${response.status}: ${await response.text()}`);
  }
}

export function validarWebhookEvolution(payload: any): {
  instanceName: string;
  numero: string;
  texto?: string;
  imagenBase64?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
} | null {
  // Estructura tipica del webhook de Evolution:
  // { event, instance, data: { key: { remoteJid }, message: { conversation, imageMessage } } }
  if (!payload?.data?.key?.remoteJid) return null;
  const instance = payload.instance;
  const remoteJid: string = payload.data.key.remoteJid;
  const numero = remoteJid.split('@')[0];

  if (payload.data.message?.conversation) {
    return {
      instanceName: instance,
      numero,
      texto: payload.data.message.conversation,
    };
  }
  if (payload.data.message?.imageMessage) {
    return {
      instanceName: instance,
      numero,
      imagenBase64: payload.data.message.imageMessage.base64 ?? '',
      mimeType: 'image/jpeg',
    };
  }
  return null;
}
