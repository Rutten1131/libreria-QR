const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const baseUrl = env.EVOLUTION_BASE_URL || env.EVOLUTION_API_URL || 'http://178.238.238.158:8080';
const apiKey = env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';

async function testEvolution() {
  console.log(`Conectando a Evolution API: ${baseUrl}`);
  try {
    const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
      headers: {
        'apikey': apiKey
      }
    });
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('Instancias activas:', data);
  } catch (e) {
    console.error('Error conectando a Evolution API:', e.message);
  }
}

testEvolution();
