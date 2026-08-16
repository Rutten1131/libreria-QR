// Diagnóstico detallado de conexión
// NO muestra valores de secrets.
import 'dotenv/config';
import { getSupabase } from '../adapters/supabaseClient';

async function main() {
  const sb = getSupabase();
  console.log('--- DIAGNOSTICO ---');
  console.log('Cliente creado OK');

  // 1. Listar tenants (debería devolver [])
  const { data: t1, error: e1 } = await sb.from('tenants').select('*').limit(5);
  console.log('1. SELECT tenants:', { count: t1?.length ?? 'N/A', error: e1?.message ?? 'none' });

  // 2. Insertar un tenant de prueba y borrarlo
  const tenantPrueba = 'diag_test_' + Date.now();
  const { data: t2, error: e2 } = await sb
    .from('tenants')
    .insert({ id: tenantPrueba, nombre: 'Diagnostico Temporal' })
    .select()
    .single();
  console.log('2. INSERT tenant:', { id: t2?.id ?? 'N/A', error: e2?.message ?? 'none' });

  if (t2?.id) {
    const { error: e3 } = await sb.from('tenants').delete().eq('id', tenantPrueba);
    console.log('3. DELETE tenant:', { error: e3?.message ?? 'none' });
  }

  // 3. Listar tablas (sanity check de permisos)
  const { data: t4, error: e4 } = await sb
    .from('pedidos')
    .select('id', { count: 'exact', head: true });
  console.log('4. HEAD pedidos:', { count: t4, error: e4?.message ?? 'none' });

  console.log('--- FIN ---');
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
