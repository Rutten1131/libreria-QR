// Middleware de auth para rutas /api/admin/* y /api/operador/*.
// El cliente envía Authorization: Bearer <jwt>; nosotros validamos
// contra Supabase Auth y verificamos que el email esté en la tabla
// de operadores.
import { Request, Response, NextFunction } from 'express';
import { getOperadorPorJWT } from '../../services/authService';

export interface AuthedRequest extends Request {
  operador?: { id: string; email: string; nombre: string };
}

const IS_DEV = process.env.NODE_ENV !== 'production';

export async function requireOperador(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match) {
    return res.status(401).json({ error: 'Falta Authorization Bearer <jwt>' });
  }
  const jwt = match[1].trim();

  // ---- Dev bypass: tokens dev.* se decodifican directo (sin Supabase) ----
  if (IS_DEV && jwt.startsWith('dev.')) {
    try {
      const payload = JSON.parse(Buffer.from(jwt.slice(4), 'base64').toString('utf8'));
      req.operador = {
        id: payload.sub,
        email: payload.email,
        nombre: 'Dev User',
      };
      return next();
    } catch {
      return res.status(401).json({ error: 'Token dev inválido' });
    }
  }

  const op = await getOperadorPorJWT(jwt);
  if (!op) {
    return res.status(403).json({ error: 'No autorizado: email no es operador activo' });
  }

  req.operador = op;
  next();
}
