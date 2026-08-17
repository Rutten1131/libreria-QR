// Cliente Supabase con anon key (el ÚNICO que puede loguearse via magic link).
// Se usa exclusivamente del lado backend para:
//   1. signInWithOtp() — enviar el magic link
//   2. verifyOtp() — verificar el token cuando el usuario hace click
//   3. getUser(jwt) — saber quién es un usuario a partir de un JWT
//
// NUNCA exponer este cliente al frontend. El frontend recibe
// access_token y refresh_token después de verifyOtp() y los guarda
// en localStorage; a partir de ahi el backend solo valida JWT.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL y SUPABASE_ANON_KEY deben estar en .env');
  }

  _client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _client;
}
