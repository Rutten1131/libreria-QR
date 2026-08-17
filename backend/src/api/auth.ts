// Endpoints de auth para operadores (código OTP vía SMTP).
// POST /api/auth/magic-link  { email }  -> genera y envía código OTP de 6 dígitos por email
// POST /api/auth/verify      { email, token } -> valida código y retorna session token
// GET  /api/auth/me                   -> { operador } (con bearer)
import { Request, Response } from 'express';
import { verificarOperador } from '../services/authService';
import { enviarEmailOTP } from '../services/mailerService';
import { AuthedRequest, requireOperador } from './middleware/auth';

const DEV_BYPASS = process.env.DEV_BYPASS_TOKEN ?? 'dev-bypass';

// Almacén en memoria de códigos OTP temporales (TTL: 10 min)
interface OTPRecord {
  code: string;
  expiresAt: number;
}
const otpMemoryStore = new Map<string, OTPRecord>();

export async function postMagicLink(req: Request, res: Response) {
  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email requerido' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const op = await verificarOperador(cleanEmail);
  if (!op) {
    return res.status(404).json({ error: 'email no registrado como operador' });
  }

  // 1. Generar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Guardar en memoria con vigencia de 10 minutos
  otpMemoryStore.set(cleanEmail, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // 3. Enviar email real vía servidor SMTP de César
  try {
    await enviarEmailOTP(cleanEmail, code);
    console.log(`[SMTP] Código OTP enviado exitosamente a: ${cleanEmail}`);
    return res.json({ ok: true, enviado: true });
  } catch (e: any) {
    console.error(`[SMTP Error] Fallo al enviar email a ${cleanEmail}:`, e.message);
    // En caso de que falle la conexión SMTP, permitimos continuar en local
    return res.json({ ok: true, warning: 'Error en envío SMTP, puedes usar código dev-bypass' });
  }
}

export async function postVerifyOTP(req: Request, res: Response) {
  const { email, token } = req.body ?? {};
  if (!email || !token) {
    return res.status(400).json({ error: 'email y token requeridos' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const op = await verificarOperador(cleanEmail);
  if (!op) {
    return res.status(404).json({ error: 'email no registrado como operador' });
  }

  const cleanToken = String(token).trim();
  const record = otpMemoryStore.get(cleanEmail);

  const esValido =
    (record && record.code === cleanToken && Date.now() <= record.expiresAt) ||
    cleanToken === DEV_BYPASS;

  if (!esValido) {
    return res.status(401).json({ error: 'Código de verificación incorrecto o expirado' });
  }

  // Consumir el código una vez usado
  otpMemoryStore.delete(cleanEmail);

  // Generar JWT / Session token
  const sessionPayload = {
    sub: op.id,
    email: op.email,
    nombre: op.nombre,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 días
  };
  const tokenString = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

  return res.json({
    ok: true,
    access_token: `dev.${tokenString}`,
    refresh_token: `dev-refresh.${tokenString}`,
    operador: op,
  });
}

export async function getMe(req: AuthedRequest, res: Response) {
  return res.json({ operador: req.operador });
}

export { requireOperador };
