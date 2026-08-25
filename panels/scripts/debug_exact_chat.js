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

async function debugExactChat() {
  const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');

  console.log('=== Turno 1 ===');
  const res1 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'hola, quiero mi lista de utiles 2 esferos, 2 borradores y 2 lapices',
    'Cristhopher Reyes',
    '593986962872',
    undefined,
    'Santiago Papelería'
  );
  console.log('Respuesta 1:\n', res1.textoRespuesta);

  console.log('\n=== Turno 2 ===');
  const res2 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'de esfero quiero uno azul y uno negro de punta gruesa',
    'Cristhopher Reyes',
    '593986962872',
    res1.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Respuesta 2:\n', res2.textoRespuesta);

  console.log('\n=== Turno 3 ===');
  const res3 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'quiero el 4',
    'Cristhopher Reyes',
    '593986962872',
    res2.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Respuesta 3:\n', res3.textoRespuesta);
  console.log('Carrito tras turno 3:', res3.nuevoContexto.carrito);
  console.log('Cola tras turno 3:', res3.nuevoContexto.colaPendientes);

  console.log('\n=== Turno 4 ===');
  const res4 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'el borrador del colegio noraml',
    'Cristhopher Reyes',
    '593986962872',
    res3.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Respuesta 4:\n', res4.textoRespuesta);
  console.log('Opciones en turno 4:', res4.nuevoContexto.opcionesPresentadas?.map(o => o.nombre));

  console.log('\n=== Turno 5 ===');
  const res5 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'el 2',
    'Cristhopher Reyes',
    '593986962872',
    res4.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Respuesta 5:\n', res5.textoRespuesta);
  console.log('Carrito tras turno 5:', res5.nuevoContexto.carrito);
  console.log('Cola tras turno 5:', res5.nuevoContexto.colaPendientes);

  console.log('\n=== Turno 6 ===');
  const res6 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    'el lapiz de pintar putna gruesa diria',
    'Cristhopher Reyes',
    '593986962872',
    res5.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Respuesta 6:\n', res6.textoRespuesta);
  console.log('Opciones en turno 6:', res6.nuevoContexto.opcionesPresentadas?.map(o => o.nombre));

  console.log('\n=== Turno 7 ===');
  const res7 = await despacharMensajeWhatsApp(
    'libreria_prueba',
    '2',
    'Cristhopher Reyes',
    '593986962872',
    res6.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('Respuesta 7 (FINAL):\n', res7.textoRespuesta);
  console.log('Carrito final:', res7.nuevoContexto.carrito);
}

debugExactChat();
