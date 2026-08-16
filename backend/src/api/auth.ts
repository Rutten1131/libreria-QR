// Endpoints de auth para operadores (magic link).
// POST /api/auth/magic-link  { email }  -> envia link
// POST /api/auth/verify      { email, token } -> { jwt, operador }
// GET  /api/auth/me                   -> { operador } (con bearer)
import { Request, Response } from 'express';
import { enviarMagicLink, verificarOperador, getOperadorPorJWT } from '../services/authService';
import { getSupabaseAdmin } from '../adapters/supabaseAdminClient';
import { AuthedRequest, requireOperador } from './middleware/auth';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export async function postMagicLink(req: Request, res: Response) {
  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email requerido' });
  }

  const op = await verificarOperador(email);
  if (!op) {
    return res.status(404).json({ error: 'email no registrado como operador' });
  }

  try {
    await enviarMagicLink(email, `${APP_URL}/admin/verify`);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

export async function postVerifyOTP(req: Request, res: Response) {
  const { email, token } = req.body ?? {};
  if (!email || !token) {
    return res.status(400).json({ error: 'email y token requeridos' });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.verifyOtp({
    email,
    token,
    type: 'magiclink',
  });

  if (error || !data?.session) {
    return res.status(401).json({ error: error?.message ?? 'token inválido' });
  }

  const op = await verificarOperador(email);
  if (!op) {
    return res.status(403).json({ error: 'email no es operador activo' });
  }

  return res.json({
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    operador: op,
  });
}

export async function getMe(req: AuthedRequest, res: Response) {
  return res.json({ operador: req.operador });
}

export { requireOperador };
