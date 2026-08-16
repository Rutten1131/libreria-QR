// Test de conexión a Supabase — Hito 2
// NO muestra valores de SUPABASE_SERVICE_ROLE_KEY ni de secretos.
import 'dotenv/config';
import { getSupabase } from '../adapters/supabaseClient';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    console.error('ERROR: falta SUPABASE_URL en .env');
    process.exit(1);
  }
  if (!key) {
    console.error('ERROR: falta SUPABASE_SERVICE_ROLE_KEY en .env');
    process.exit(1);
  }
  console.log('ENV_OK: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY presentes');

  const sb = getSupabase();
  const { count, error } = await sb
    .from('tenants')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('ERROR_CONEXION:', error.message);
    process.exit(1);
  }
  console.log('CONEXION_OK');
  console.log('TENANTS_COUNT:', count);
  process.exit(0);
}

main();
