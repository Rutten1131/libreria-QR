const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function inspectEvolutionExact() {
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;

  console.log('--- Buscando qr_libreria_prueba en Evolution ---');
  const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
    headers: { 'apikey': apiKey }
  });
  const list = await res.json();
  const inst = list.find(i => i.name === 'qr_libreria_prueba' || i.instanceName === 'qr_libreria_prueba');
  console.log('Detalle completo de qr_libreria_prueba en Evolution:', JSON.stringify(inst, null, 2));

  console.log('\n--- connectionState de qr_libreria_prueba ---');
  const resState = await fetch(`${baseUrl}/instance/connectionState/qr_libreria_prueba`, {
    headers: { 'apikey': apiKey }
  });
  console.log(await resState.json());
}

inspectEvolutionExact();
