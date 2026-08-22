const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testGroq() {
  const { interpretarIntencionSemantica } = require('../src/server/adapters/iaAdapter');
  
  const tests = [
    { text: 'necesito un cuaderno', history: '' },
    { text: 'Dame 2 del stitch', history: 'Cliente: necesito un cuaderno\nAsistente: Opciones: 1. Cuaderno Stitch' },
    { text: 'no, mejor 3', history: 'Cliente: Dame 2 del stitch\nAsistente: Cotizacion de 2 cuadernos' },
    { text: 'Sí confirmo el pedido', history: 'Cliente: cuanto llevo en total?\nAsistente: Total: $2.67' }
  ];

  for (const t of tests) {
    const res = await interpretarIntencionSemantica(t.text, t.history, []);
    console.log(`\nInput: "${t.text}"`);
    console.log('Result:', JSON.stringify(res, null, 2));
  }
}

testGroq();
