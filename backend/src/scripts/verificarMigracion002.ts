import 'dotenv/config';
import { getSupabase } from '../adapters/supabaseClient';

async function main() {
  const sb = getSupabase();
  const { error: e1 } = await sb.from('conversaciones').select('id').limit(0);
  console.log('conversaciones:', e1?.message ?? 'OK');
  const { error: e2 } = await sb.from('clientes').select('lugar_trabajo').limit(0);
  console.log('clientes.lugar_trabajo:', e2?.message ?? 'OK');
  const { error: e3 } = await sb.from('pedidos').select('conversacion_id').limit(0);
  console.log('pedidos.conversacion_id:', e3?.message ?? 'OK');
}

main();
