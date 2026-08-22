const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

process.env.EVOLUTION_BASE_URL = env.EVOLUTION_BASE_URL;
process.env.EVOLUTION_API_KEY = env.EVOLUTION_API_KEY;

async function testConsultarDetalle() {
  const { consultarDetalleInstancia } = require('../src/server/adapters/evolutionAdapter');
  const detalle = await consultarDetalleInstancia('qr_libreria_prueba');
  console.log('Detalle de consultarDetalleInstancia:', detalle);
}

testConsultarDetalle();
