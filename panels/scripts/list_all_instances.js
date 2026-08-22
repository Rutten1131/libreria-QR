const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function listAllOpenInstances() {
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;

  const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
    headers: { 'apikey': apiKey }
  });
  const list = await res.json();
  
  console.log('=== TODAS LAS INSTANCIAS EN EVOLUTION ===');
  for (const inst of list) {
    console.log(`Nombre: "${inst.name}" | Estado: ${inst.connectionStatus} | Owner: ${inst.ownerJid} | Perfil: ${inst.profileName}`);
  }
}

listAllOpenInstances();
