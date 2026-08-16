// Test e2e del flujo completo WhatsApp -> pedido creado
import 'dotenv/config';
import { procesarListaCliente } from '../orchestrate/whatsappOrchestrator';

async function main() {
  console.log('=== TEST E2E FLUJO WHATSAPP ===\n');

  console.log('CASO 1: lista solo texto, todos matchean');
  console.log('Input: "quiero 1 cuaderno college 100h y 2 boligrafos azules"');
  const r1 = await procesarListaCliente({
    tenantId: 'libreria_el_sol',
    clienteNombre: 'Maria Gonzalez',
    clienteTelefono: '+593999888777',
    textoOriginal: 'quiero 1 cuaderno college 100h y 2 boligrafos azules',
  });
  console.log('Pedido ID:', r1.pedido?.id);
  console.log('Total:', r1.cotizacion?.total);
  console.log('Items matched:', r1.cotizacion?.items.length);
  console.log('Ambigüos:', r1.cotizacion?.ambiguos.length);
  console.log('Advertencia:', r1.advertencia ?? 'ninguna');
  console.log('Accion pendiente:', r1.pedido?.accionPendiente);
  console.log('');

  console.log('CASO 2: lista con item que no existe en el catalogo');
  console.log('Input: "3 unicornios rosas y 1 cuaderno college 100h"');
  const r2 = await procesarListaCliente({
    tenantId: 'libreria_el_sol',
    clienteNombre: 'Carlos Perez',
    clienteTelefono: '+593999111222',
    textoOriginal: '3 unicornios rosas y 1 cuaderno college 100h',
  });
  console.log('Pedido ID:', r2.pedido?.id);
  console.log('Total:', r2.cotizacion?.total);
  console.log('Items matched:', r2.cotizacion?.items.length);
  console.log('Ambigüos:', r2.cotizacion?.ambiguos);
  console.log('Advertencia:', r2.advertencia ?? 'ninguna');
  console.log('Accion pendiente:', r2.pedido?.accionPendiente);
  console.log('');

  console.log('CASO 3: tenantId invalido (cross-tenant attack)');
  try {
    await procesarListaCliente({
      tenantId: 'tenant_inexistente_xxx',
      clienteNombre: 'Atacante',
      clienteTelefono: '+593999000000',
      textoOriginal: 'cuaderno',
    });
    console.log('ERROR: no deberia haber pasado sin error');
  } catch (e: any) {
    console.log('OK: bloqueado con error:', e.message);
  }

  console.log('\n=== VERIFICACION EN BD ===');
  const { getSupabase } = await import('../adapters/supabaseClient');
  const sb = getSupabase();
  const { data: pedidos } = await sb
    .from('pedidos')
    .select('id, cliente_nombre, total, accion_pendiente, estado')
    .eq('tenant_id', 'libreria_el_sol')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Ultimos 5 pedidos de libreria_el_sol:');
  for (const p of pedidos ?? []) {
    console.log(`  - ${p.id} | ${p.cliente_nombre} | $${p.total} | accion="${p.accion_pendiente}" | estado=${p.estado}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
