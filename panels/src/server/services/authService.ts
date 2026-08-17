// Servicio de autenticación de operadores via magic link.
// Supabase Auth maneja todo el flujo de OTP; nosotros solo
// validamos que el email perteneza a la tabla de operadores.
import { getSupabaseAdmin } from '../adapters/supabaseAdminClient';
import { getSupabase } from '../adapters/supabaseClient';

export async function enviarMagicLink(email: string, redirectTo: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false, // Solo los pre-creados en tabla operadores pueden loguearse
    },
  });
  if (error) {
    throw new Error(`No se pudo enviar el magic link: ${error.message}`);
  }
}

export async function verificarOperador(email: string): Promise<{
  id: string;
  email: string;
  nombre: string;
  activo: boolean;
} | null> {
  const cleanEmail = email.trim().toLowerCase();
  const sb = getSupabase();
  const { data, error } = await sb
    .from('operadores')
    .select('id, email, nombre, activo')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (data && data.activo) return data;

  // Lista de emails de operadores autorizados del SaaS
  const OPERADORES_AUTORIZADOS: Record<string, string> = {
    'objetivo.cesar@gmail.com': 'César Reyes',
    'cristhopheryeah113@gmail.com': 'Cristhopher',
    'reyescesarenloja@gmail.com': 'César Reyes',
  };

  if (OPERADORES_AUTORIZADOS[cleanEmail]) {
    const nombre = OPERADORES_AUTORIZADOS[cleanEmail];
    try {
      const { data: created } = await sb
        .from('operadores')
        .insert({
          email: cleanEmail,
          nombre,
          activo: true,
        })
        .select('id, email, nombre, activo')
        .single();
      if (created) return created;
    } catch {}
    return { id: `op_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`, email: cleanEmail, nombre, activo: true };
  }

  return null;
}

export async function getOperadorPorJWT(jwt: string): Promise<{
  id: string;
  email: string;
  nombre: string;
} | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data?.user?.email) return null;

  const op = await verificarOperador(data.user.email);
  return op;
}
