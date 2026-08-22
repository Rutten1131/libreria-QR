const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function checkEvolutionWebhook() {
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;

  console.log('--- Consultando Webhook de qr_libreria_prueba ---');
  try {
    const res = await fetch(`${baseUrl}/webhook/find/qr_libreria_prueba`, {
      headers: { 'apikey': apiKey }
    });
    console.log('Status webhook find:', res.status);
    const data = await res.json();
    console.log('Configuracion actual del Webhook:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Error consultando webhook:', e.message);
  }
}

checkEvolutionWebhook();
