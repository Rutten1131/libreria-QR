const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY_BACKUP = env.GEMINI_API_KEY_BACKUP;
process.env.GEMINI_API_KEY_3 = env.GEMINI_API_KEY_3;
process.env.GROQ_API_KEY = env.GROQ_API_KEY;
process.env.GROQ_API_KEY_BACKUP = env.GROQ_API_KEY_BACKUP;
process.env.SUPABASE_URL = env.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');

async function testUserFlow() {
  console.log('=== TEST SIMULACIÓN EXACTA DEL CASO REAL ===\n');
  const tenantId = 'libreria_prueba';
  const clienteNombre = 'Cristhopher Reyes';
  const clienteTelefono = '593986962872';

  let contexto = undefined;

  async function enviar(texto) {
    console.log(`\n========================================`);
    console.log(`👤 [CLIENTE]: "${texto}"`);
    const res = await despacharMensajeWhatsApp(
      tenantId,
      texto,
      clienteNombre,
      clienteTelefono,
      contexto,
      'Santiago Papelería'
    );
    contexto = res.nuevoContexto;
    console.log(`🤖 [BOT (${res.tipo})]:\n${res.textoRespuesta}`);
    console.log(`📊 [ESTADO]: Carrito (${contexto?.carrito?.length || 0} items) | Cola (${contexto?.colaPendientes?.length || 0} pend: ${contexto?.colaPendientes?.map(p => p.itemRaw).join(', ')}) | En Proceso: ${contexto?.itemEnProceso?.itemRaw || 'ninguno'}`);
    if (contexto?.carrito?.length) {
      console.log(`🛒 [CARRITO ACTUAL]:`, contexto.carrito.map(c => `${c.cantidad}x ${c.nombre} ($${c.precioUnitario})`));
    }
    return res;
  }

  // Turno 1
  await enviar('Hola, quiero 2 esferos 2 borradores y 2 lapices');

  // Turno 2
  await enviar('Uno azul y uno negro quisiera de marca bic de punta gruesa');

  // Turno 3
  await enviar('Okey azul, pero no tinees ningun esfero negro? sin que swea punta gruesa');

  // Turno 4
  await enviar('Si, anotame el azul y quiero la opcion 3');

  // Turno 5
  await enviar('uno para pintar nada mas');

  // Turno 6
  await enviar('no lapiz de grafito no pintura porfavor, solo lapiz de colegio punta gruesa');

  // Turno 7
  await enviar('quiero uno del 1 y uno del 2');
}

testUserFlow().catch(console.error);
