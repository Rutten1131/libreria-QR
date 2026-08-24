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

async function testConsultative() {
  const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');

  console.log('--- TEST 1: Consulta General de Esferos ---');
  const res1 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Quiero un esfero para mi hijo',
    'Cristhopher Reyes',
    '593986962872',
    undefined,
    'Santiago Papelería'
  );
  console.log('Respuesta Bot:\n', res1.textoRespuesta);
  console.log('\nTipo:', res1.tipo);

  console.log('\n--- TEST 2: Consulta de Cuaderno a Espiral (No hay espiral en stock) ---');
  const res2 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Quiero un cuaderno de 100 hojas a espiral',
    'Cristhopher Reyes',
    '593986962872',
    res1.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Respuesta Bot:\n', res2.textoRespuesta);
  console.log('\nTipo:', res2.tipo);
}

testConsultative();
