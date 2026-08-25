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

async function testCompleteCartFlow() {
  const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');

  console.log('=== Turno 1: Lista múltiple ===');
  const res1 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'hola, quiero mi lista de utiles es de 2 esferos, 2 borradores y 2 lapices',
    'Cristhopher Reyes',
    '593986962872',
    undefined,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res1.textoRespuesta);

  console.log('\n=== Turno 2: "Uno azul de punta gruesa" ===');
  const res2 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Uno azul de punta gruesa',
    'Cristhopher Reyes',
    '593986962872',
    res1.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res2.textoRespuesta);

  console.log('\n=== Turno 3: "el 3" ===');
  const res3 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'el 3',
    'Cristhopher Reyes',
    '593986962872',
    res2.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res3.textoRespuesta);
  console.log('Carrito tras Turno 3 (debe tener 1 ítem - esferos):', res3.nuevoContexto.carrito);

  console.log('\n=== Turno 4: "el borrador normal del colegio" ===');
  const res4 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'el borrador normal del colegio',
    'Cristhopher Reyes',
    '593986962872',
    res3.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res4.textoRespuesta);

  console.log('\n=== Turno 5: "el 2" ===');
  const res5 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'el 2',
    'Cristhopher Reyes',
    '593986962872',
    res4.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res5.textoRespuesta);
  console.log('Carrito tras Turno 5 (debe tener 2 ítems - esferos + borradores):', res5.nuevoContexto.carrito);

  console.log('\n=== Turno 6: "El de punta gruesa para pintar" ===');
  const res6 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'El de punta gruesa para pintar',
    'Cristhopher Reyes',
    '593986962872',
    res5.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Bot:\n', res6.textoRespuesta);

  console.log('\n=== Turno 7: "Si porfavor" ===');
  const res7 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'Si porfavor',
    'Cristhopher Reyes',
    '593986962872',
    res6.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Bot Final (PROFORMA COMPLETA):\n', res7.textoRespuesta);
  console.log('Carrito final completo (DEBE TENER LOS 3 ÍTEMS):', res7.nuevoContexto.carrito);
}

testCompleteCartFlow();
