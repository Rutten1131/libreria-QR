// Test del flujo conversacional completo
import 'dotenv/config';
import { procesarMensajeEntrante } from '../orchestrate/conversationOrchestrator';

const TELEFONO = '+5939' + Math.floor(Math.random() * 90000000 + 10000000);

async function main() {
  console.log('=== TEST FLUJO CONVERSACIONAL COMPLETO ===\n');
  console.log('Telefono de prueba:', TELEFONO, '\n');

  // TURNO 1 — Cliente envia lista
  console.log('--- TURNO 1: cliente envia lista ---');
  let r = await procesarMensajeEntrante({
    tenantId: 'libreria_el_sol',
    clienteTelefono: TELEFONO,
    texto: 'quiero 2 cuadernos college 100h y 1 lapiz 2B',
  });
  console.log('Estado:', r.conversacion.estadoActual);
  console.log('Respuesta al cliente:');
  console.log(r.respuestaAlCliente);
  console.log('Decision IA:', r.decision.decision, 'confianza', r.decision.confianza);
  console.log('');

  // TURNO 2 — Cliente confirma
  console.log('--- TURNO 2: cliente confirma ---');
  r = await procesarMensajeEntrante({
    tenantId: 'libreria_el_sol',
    clienteTelefono: TELEFONO,
    texto: 'si dale, esta bien',
  });
  console.log('Estado:', r.conversacion.estadoActual);
  console.log('Respuesta al cliente:');
  console.log(r.respuestaAlCliente);
  console.log('Decision IA:', r.decision.decision, 'confianza', r.decision.confianza);
  console.log('');

  // TURNO 3 — Cliente elige logistica
  console.log('--- TURNO 3: cliente elige logistica ---');
  r = await procesarMensajeEntrante({
    tenantId: 'libreria_el_sol',
    clienteTelefono: TELEFONO,
    texto: 'voy a retirar en el local',
  });
  console.log('Estado:', r.conversacion.estadoActual);
  console.log('Respuesta al cliente:');
  console.log(r.respuestaAlCliente);
  console.log('Decision IA:', r.decision.decision, 'confianza', r.decision.confianza);
  console.log('');

  // TURNO 4 — Cliente elige pago
  console.log('--- TURNO 4: cliente elige pago ---');
  r = await procesarMensajeEntrante({
    tenantId: 'libreria_el_sol',
    clienteTelefono: TELEFONO,
    texto: 'pago con transferencia',
  });
  console.log('Estado:', r.conversacion.estadoActual);
  console.log('Respuesta al cliente:');
  console.log(r.respuestaAlCliente);
  console.log('Decision IA:', r.decision.decision, 'confianza', r.decision.confianza);
  console.log('Pedido creado:', r.pedidoId ?? 'NO');
  console.log('');

  // TURNO 5 — Cliente frustrado
  console.log('--- TURNO 5: cliente frustrado ---');
  const TELEFONO2 = '+5939' + Math.floor(Math.random() * 90000000 + 10000000);
  let r2 = await procesarMensajeEntrante({
    tenantId: 'libreria_el_sol',
    clienteTelefono: TELEFONO2,
    texto: 'quiero 1 cuaderno',
  });
  console.log('Turno 5a estado:', r2.conversacion.estadoActual);
  r2 = await procesarMensajeEntrante({
    tenantId: 'libreria_el_sol',
    clienteTelefono: TELEFONO2,
    texto: 'ya le explique que quiero un cuaderno, no entiende',
  });
  console.log('Turno 5b estado:', r2.conversacion.estadoActual);
  console.log('Respuesta al cliente:');
  console.log(r2.respuestaAlCliente);
  console.log('Decision IA:', r2.decision.decision, 'razon:', r2.decision.razon);
  console.log('');

  console.log('=== VERIFICACION BD ===');
  const { getSupabase } = await import('../adapters/supabaseClient');
  const sb = getSupabase();
  const { data: convs } = await sb
    .from('conversaciones')
    .select('id, cliente_telefono, estado_actual, requiere_humano')
    .eq('tenant_id', 'libreria_el_sol')
    .in('cliente_telefono', [TELEFONO, TELEFONO2])
    .order('created_at', { ascending: false });
  console.log('Conversaciones en BD:');
  for (const c of convs ?? []) {
    console.log(`  - ${c.id.slice(0, 8)} | ${c.cliente_telefono} | ${c.estado_actual} | requiere_humano=${c.requiere_humano}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
