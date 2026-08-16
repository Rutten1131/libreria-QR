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
  const sb = getSupabase();
  const { data, error } = await sb
    .from('operadores')
    .select('id, email, nombre, activo')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) return null;
  if (!data.activo) return null;

  return data;
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
