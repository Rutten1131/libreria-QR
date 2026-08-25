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

async function testExactUserFlow() {
  const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');

  console.log('=== Turno 1: Lista múltiple ===');
  const res1 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Quiero 2 esferos, 2 borradores, 2 lapices',
    'Cristhopher Reyes',
    '593986962872',
    undefined,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res1.textoRespuesta);

  console.log('\n=== Turno 2: "Azul, bic, me dijeron de putna gruesa si hay=?" ===');
  const res2 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Azul, bic, me dijeron de putna gruesa si hay=?',
    'Cristhopher Reyes',
    '593986962872',
    res1.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res2.textoRespuesta);

  console.log('\n=== Turno 3: "Si porfavor" ===');
  const res3 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Si porfavor',
    'Cristhopher Reyes',
    '593986962872',
    res2.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res3.textoRespuesta);
  console.log('Carrito actual:', res3.nuevoContexto.carrito);
  console.log('Cola pendientes:', res3.nuevoContexto.colaPendientes);
}

testExactUserFlow();
