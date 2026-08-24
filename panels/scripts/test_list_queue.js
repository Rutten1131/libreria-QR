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

async function testListQueueFlow() {
  const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');

  console.log('=== PASO 1: Reset ===');
  const res0 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Reset',
    'Cristhopher Reyes',
    '593986962872',
    undefined,
    'Santiago Papelería'
  );
  console.log('Respuesta Reset:\n', res0.textoRespuesta);

  console.log('\n=== PASO 2: Lista Múltiple ("Son 2 esferos, 2 borradores y 2 lapices") ===');
  const res1 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Son 2 esferos, 2 borradores y 2 lapices',
    'Cristhopher Reyes',
    '593986962872',
    res0.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Respuesta Bot:\n', res1.textoRespuesta);
  console.log('Cola pendientes:', res1.nuevoContexto.colaPendientes);
  console.log('Carrito:', res1.nuevoContexto.carrito);

  console.log('\n=== PASO 3: Selección de Esfero ("Quiero los esferos azules punta fina") ===');
  const res2 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Quiero los esferos azules punta fina',
    'Cristhopher Reyes',
    '593986962872',
    res1.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Respuesta Bot:\n', res2.textoRespuesta);
  console.log('Cola pendientes:', res2.nuevoContexto.colaPendientes);
  console.log('Carrito:', res2.nuevoContexto.carrito);
}

testListQueueFlow();
