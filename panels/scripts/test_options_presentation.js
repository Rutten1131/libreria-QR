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

async function testOptionsPresentation() {
  const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');

  console.log('=== Turno 1: Lista múltiple ===');
  const res1 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Son 2 esferos, 2 borradores y 2 lapices',
    'Cristhopher Reyes',
    '593986962872',
    undefined,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res1.textoRespuesta);

  console.log('\n=== Turno 2: "Necesito un azul de punta redonda" ===');
  const res2 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Necesito un azul de punta redonda',
    'Cristhopher Reyes',
    '593986962872',
    res1.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res2.textoRespuesta);
  console.log('\nTipo devuelto:', res2.tipo);
  console.log('¿Tiene opciones presentadas?:', res2.nuevoContexto.opcionesPresentadas?.length > 0);
}

testOptionsPresentation();
