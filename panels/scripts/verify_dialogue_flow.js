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

async function testDialogueFlow() {
  const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');
  console.log('=== TEST SIMULACIÓN DE FLUJO CONVERSACIONAL WHATSAPP ===\n');
  const tenantId = 'libreria_prueba';
  const clienteNombre = 'Cristhopher Reyes';
  const clienteTelefono = '593986962872';

  let contexto = undefined;

  async function enviar(texto) {
    console.log(`\n👤 [CLIENTE]: "${texto}"`);
    const res = await despacharMensajeWhatsApp(
      tenantId,
      texto,
      clienteNombre,
      clienteTelefono,
      contexto,
      'Santiago Papelería'
    );
    contexto = res.nuevoContexto;
    console.log(`🤖 [BOT (${res.tipo})]:\n${res.textoRespuesta}\n`);
    console.log(`📊 [ESTADO]: Carrito (${contexto?.carrito?.length || 0} items) | Cola (${contexto?.colaPendientes?.length || 0} pend) | En Proceso: ${contexto?.itemEnProceso?.itemRaw || 'ninguno'}`);
    return res;
  }

  // 1. Inicio de lista
  await enviar('hola quiero mi lista de utiles 2 esferos, 2 borradores y 2 lapices');

  // 2. Especificación de esferos
  await enviar('de esfero quiero uno azul y uno negro de punta gruesa');

  // 3. Selección número "4" para el azul
  await enviar('4');

  // 4. Selección número "1" para el borrador
  await enviar('1');

  // 5. Multi-selección para los lápices
  await enviar('quiero uno de cada uno');

  // 6. Selección adicional si aplica
  await enviar('el 2');

  console.log('\n=== CARRITO FINAL ===');
  console.log(JSON.stringify(contexto?.carrito, null, 2));
}

testDialogueFlow().catch(console.error);
