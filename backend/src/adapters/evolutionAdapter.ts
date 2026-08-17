// Adapter para Evolution API (WhatsApp)
// — Implementa las 6 operaciones del skill evolution-api —
//   A. crearInstancia
//   B. configurarWebhook
//   C. obtenerQR
//   D. consultarEstado
//   E. enviarMensaje (texto)
//   F. eliminarInstancia
//
// Modo stub: si EVOLUTION_API_KEY no está, todas las operaciones
// salvo enviarMensaje(devuelve warning) devuelven mocks para que
// el panel pueda renderizar visualmente. Esto permite que César
// pueda revisar el admin completo sin tener Evolution arriba.

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:3001';

// Detecta placeholder no configurado (ej: "<SET>")
const PLACEHOLDER = (v: string) => !v || v === '<SET>' || v.includes('<SET>');

const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

async function fetchConRetry(url: string, opts: RequestInit = {}, intento = 0): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } catch (e) {
    if (intento < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000));
      return fetchConRetry(url, opts, intento + 1);
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

function headers() {
  return {
    'apikey': EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  };
}

function stubActivo(): boolean {
  return PLACEHOLDER(EVOLUTION_API_KEY) || PLACEHOLDER(EVOLUTION_BASE_URL);
}

/* ============================================================
   Tipos
   ============================================================ */

export type EstadoEvolution = 'desconectado' | 'esperando_qr' | 'conectado' | 'desconocido';

export interface MensajeTexto {
  numero: string;
  texto: string;
}

export interface ResultadoQR {
  base64: string;
  expiresAt: Date;
}

/* ============================================================
   A. CREAR INSTANCIA
   Idempotente: si ya existe, la devolvemos en estado actual.
   ============================================================ */
export async function crearInstancia(instanceName: string): Promise<{ instanceName: string; estado: EstadoEvolution }> {
  if (stubActivo()) {
    return { instanceName, estado: 'esperando_qr' };
  }

  const res = await fetchConRetry(`${EVOLUTION_BASE_URL}/instance/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });

  if (!res.ok && res.status !== 403) {
    // 403 = ya existe (idempotencia OK)
    throw new Error(`Evolution create ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json().catch(() => ({}));
  const estado = mapearEstado(data?.instance?.state);
  return { instanceName, estado };
}

/* ============================================================
   B. CONFIGURAR WEBHOOK
   ============================================================ */
export async function configurarWebhook(
  instanceName: string,
  webhookUrl: string,
): Promise<void> {
  if (stubActivo()) return;

  const eventos = [
    'MESSAGES_UPSERT',
    'MESSAGES_UPDATE',
    'CONNECTION_UPDATE',
    'QRCODE_UPDATED',
  ];

  try {
    const res = await fetchConRetry(`${EVOLUTION_BASE_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: eventos,
        },
      }),
    });

    if (!res.ok) {
      console.warn(`[Evolution Webhook ${res.status}]`, await res.text());
    }
  } catch (e: any) {
    console.warn(`[Evolution Webhook Warning]`, e.message);
  }
}

/* ============================================================
   C. OBTENER QR
   Devuelve base64 listo para <img src="data:image/png;base64,...">.
   Expira cada ~60s; el cliente (frontend) hace polling cada 30s.
   ============================================================ */
export async function obtenerQR(instanceName: string): Promise<ResultadoQR | null> {
  if (stubActivo()) {
    // Mock: devolvemos un QR placeholder (1x1 png transparente base64)
    return {
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      expiresAt: new Date(Date.now() + 60_000),
    };
  }

  const res = await fetchConRetry(`${EVOLUTION_BASE_URL}/instance/connect/${instanceName}`, {
    headers: headers(),
  });
  if (!res.ok) {
    if (res.status === 404) return null; // instancia no existe
    throw new Error(`Evolution qr ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();
  const base64 = data?.base64 ?? data?.qrcode?.base64 ?? data?.qrcode ?? null;
  if (!base64) return null;

  return {
    base64,
    expiresAt: new Date(Date.now() + 60_000),
  };
}

/* ============================================================
   D. CONSULTAR ESTADO
   ============================================================ */
export async function consultarEstado(instanceName: string): Promise<EstadoEvolution> {
  const detalle = await consultarDetalleInstancia(instanceName);
  return detalle.estado;
}

export async function consultarDetalleInstancia(instanceName: string): Promise<{
  estado: EstadoEvolution;
  phoneNumber?: string;
}> {
  if (stubActivo()) return { estado: 'esperando_qr' };

  try {
    let ownerJid = '';
    let state = '';

    // 1. Consultar fetchInstances para obtener metadata completa (incluye ownerJid)
    const resFetch = await fetchConRetry(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      headers: headers(),
    });

    if (resFetch.ok) {
      const list: any = await resFetch.json();
      if (Array.isArray(list)) {
        const inst = list.find((i: any) => i.name === instanceName || i.instanceName === instanceName);
        if (inst) {
          state = inst.connectionStatus || inst.state || '';
          ownerJid = inst.ownerJid || inst.owner || '';
        }
      }
    }

    // 2. Si no obtuvimos estado, verificar connectionState
    if (!state) {
      const resState = await fetchConRetry(`${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
        headers: headers(),
      });
      if (resState.ok) {
        const stateData: any = await resState.json();
        state = stateData?.instance?.state || stateData?.state || '';
        if (!ownerJid) {
          ownerJid = stateData?.instance?.ownerJid || stateData?.instance?.owner || '';
        }
      }
    }

    const estado = mapearEstado(state);
    const phoneNumber = ownerJid
      ? String(ownerJid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
      : undefined;

    return { estado, phoneNumber };
  } catch (e: any) {
    console.warn(`[Evolution Error Detalle ${instanceName}]`, e.message);
    return { estado: 'desconocido' };
  }
}

/* ============================================================
   E. ENVIAR MENSAJE
   ============================================================ */
export async function enviarMensaje(instanceName: string, mensaje: MensajeTexto): Promise<void> {
  if (!EVOLUTION_API_KEY) {
    console.warn('[evolution] apiKey no configurada — mensaje NO enviado (modo stub)');
    return;
  }

  const res = await fetchConRetry(`${EVOLUTION_BASE_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      number: mensaje.numero,
      text: mensaje.texto,
    }),
  });

  if (!res.ok) {
    throw new Error(`Evolution sendText ${res.status}: ${await res.text()}`);
  }
}

/* ============================================================
   F. ELIMINAR INSTANCIA
   ============================================================ */
export async function eliminarInstancia(instanceName: string): Promise<void> {
  if (stubActivo()) return;

  const res = await fetchConRetry(`${EVOLUTION_BASE_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: headers(),
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Evolution delete ${res.status}: ${await res.text()}`);
  }
}

/* ============================================================
   VALIDAR WEBHOOK (compatibilidad con código previo)
   ============================================================ */
export function validarWebhookEvolution(payload: any): {
  instanceName: string;
  numero: string;
  texto?: string;
  imagenBase64?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
} | null {
  if (!payload?.data?.key?.remoteJid) return null;
  const instance = payload.instance;
  const remoteJid: string = payload.data.key.remoteJid;
  const numero = remoteJid.split('@')[0];

  if (payload.data.message?.conversation) {
    return { instanceName: instance, numero, texto: payload.data.message.conversation };
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

/* ============================================================
   MAPPING
   ============================================================ */
function mapearEstado(s: string | undefined): EstadoEvolution {
  if (!s) return 'desconocido';
  if (s === 'open') return 'conectado';
  if (s === 'close') return 'desconectado';
  if (s === 'connecting') return 'esperando_qr';
  if (s === 'espooqrrequired' || s === 'qr') return 'esperando_qr';
  return 'desconocido';
}

export { mapearEstado };
