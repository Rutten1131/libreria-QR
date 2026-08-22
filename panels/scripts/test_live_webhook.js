const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  process.env[k?.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testWebhookPipeline() {
  const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');
  const { enviarMensaje } = require('../src/server/adapters/evolutionAdapter');

  const tenantId = 'libreria_prueba';
  const instanceName = 'qr_libreria_prueba';
  const clienteTelefono = '593963410409'; // César Test
  const textoCliente = 'Buenas tardes, necesito 1 resma de papel bond y 2 cuadernos de 100 hojas a cuadros';

  console.log(`[Simulación] Cliente envía: "${textoCliente}"`);
  console.log(`[1] Procesando en botRouter...`);
  
  const inicio = Date.now();
  const respuesta = await despacharMensajeWhatsApp(
    tenantId,
    textoCliente,
    'César Reyes',
    clienteTelefono,
    undefined
  );

  const duracion = Date.now() - inicio;
  console.log(`[2] Bot respondió en ${duracion}ms:\n----------------------------------`);
  console.log(respuesta.textoRespuesta);
  console.log(`----------------------------------`);
  console.log(`[3] Tipo de respuesta: ${respuesta.tipo}`);
  console.log(`[4] Carrito activo:`, respuesta.nuevoContexto.carrito);
}

testWebhookPipeline();
