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

  // Turno 1: Lista inicial
  await enviar('Hola, dame 2 esferos, dame 2 lapices y 2 borradores porfavor');

  // Turno 2: Desglose de esferos
  await enviar('1 esfero azul y 1 esfero negro porfavor, de bic, si hay con punta gruesa dejame ver cuales tiene');

  // Turno 3: Aceptación del Bic azul
  await enviar('Si');

  // Turno 4: Selección del esfero negro
  await enviar('el 1');

  // Turno 5: Especificación de lápices
  await enviar('quiero lapices hb normales');

  // Turno 6: Selección de lápices
  await enviar('el 1');

  // Turno 7: Selección de borradores
  await enviar('borrador blanco de queso');

  // Turno 8: Confirmación de borrador
  await enviar('1');
}

testUserFlow().catch(console.error);
