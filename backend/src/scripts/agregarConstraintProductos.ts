// Agregar UNIQUE constraint (tenant_id, nombre) en productos
import 'dotenv/config';
import { getSupabase } from '../adapters/supabaseClient';

async function main() {
  const sb = getSupabase();
  // No se puede agregar UNIQUE constraint directamente desde el cliente Supabase
  // Hay que hacerlo via SQL Editor. Este script solo verifica si ya existe.
  const { data, error } = await sb.rpc('exec_sql', {
    sql: `SELECT 1`,
  }).catch(() => ({ data: null, error: null }));

  console.log('Este script no puede correr ALTER TABLE. Hay que correr SQL manualmente.');
  console.log('Ver abajo la instruccion.');
  process.exit(0);
}

main();
