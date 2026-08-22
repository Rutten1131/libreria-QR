const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  process.env[k?.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testVentas() {
  const { generarRespuestaVentas } = require('../src/server/adapters/iaAdapter');
  
  const prods = [
    { id: '1', nombre: 'Tijera Escolar Punta Redonda', precio: 1.20 },
    { id: '2', nombre: 'Tijera Maped 13cm', precio: 1.25 }
  ];

  console.log('Testing ventas: "Bueno dame 2 tijeras"');
  const res = await generarRespuestaVentas([], 'Bueno dame 2 tijeras', prods, [], true);
  console.log('Resultado ventas:', res);
}

testVentas();
