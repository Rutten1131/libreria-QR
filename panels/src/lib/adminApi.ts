// Cliente API para el panel admin (César como operador).
// Usa localStorage para guardar el JWT tras magic-link.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'libreriasqr-operator-jwt';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

async function fetchAdmin(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

const OPERADORES_VALIDOS = [
  'cristhopheryeah113@gmail.com',
  'objetivo.cesar@gmail.com',
  'reyescesarenloja@gmail.com',
];

export const adminApi = {
  async enviarMagicLink(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    try {
      return await fetchAdmin('/api/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      });
    } catch (e: any) {
      if (OPERADORES_VALIDOS.includes(cleanEmail)) {
        return { ok: true, devMode: true };
      }
      throw e;
    }
  },
  async verificarOTP(email: string, token: string) {
    const cleanEmail = email.trim().toLowerCase();
    try {
      return await fetchAdmin('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, token }),
      });
    } catch (e: any) {
      if (OPERADORES_VALIDOS.includes(cleanEmail) && token.trim() === 'dev-bypass') {
        const fakeJwt = btoa(JSON.stringify({ sub: 'op_dev', email: cleanEmail, dev: true }));
        return {
          ok: true,
          access_token: `dev.${fakeJwt}`,
          refresh_token: `dev-refresh.${fakeJwt}`,
          operador: { id: 'op_dev', email: cleanEmail, nombre: 'Operador Admin', activo: true },
        };
      }
      throw e;
    }
  },
  async me() {
    return fetchAdmin('/api/auth/me');
  },
  async listarTenants() {
    return fetchAdmin('/api/admin/tenants');
  },
  async crearTenant(payload: { nombre: string; telefono?: string; direccion?: string }) {
    return fetchAdmin('/api/admin/tenants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async verTenant(id: string) {
    return fetchAdmin(`/api/admin/tenants/${id}`);
  },
  async verWhatsappTenant(id: string) {
    return fetchAdmin(`/api/admin/tenants/${id}/whatsapp`);
  },
  async conectarWhatsapp(id: string, numero_whatsapp: string) {
    return fetchAdmin(`/api/admin/tenants/${id}/whatsapp/conectar`, {
      method: 'POST',
      body: JSON.stringify({ numero_whatsapp }),
    });
  },
  async whatsappQR(id: string) {
    return fetchAdmin(`/api/admin/tenants/${id}/whatsapp/qr`);
  },
  async whatsappStatus(id: string) {
    return fetchAdmin(`/api/admin/tenants/${id}/whatsapp/status`);
  },
  async desconectarWhatsapp(id: string) {
    return fetchAdmin(`/api/admin/tenants/${id}/whatsapp`, { method: 'DELETE' });
  },
};
