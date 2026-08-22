const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function checkLiveInstances() {
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;

  console.log('=== CONSULTANDO EVOLUTION API LIVE ===');
  const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
    headers: { 'apikey': apiKey }
  });
  const list = await res.json();
  
  for (const inst of list) {
    if (inst.name.includes('qr') || inst.name.includes('libreria') || inst.name.includes('prueba') || inst.name.includes('santiago') || inst.connectionStatus === 'open') {
      console.log('Instancia:', {
        name: inst.name,
        connectionStatus: inst.connectionStatus,
        ownerJid: inst.ownerJid,
        profileName: inst.profileName,
        updatedAt: inst.updatedAt
      });
    }
  }

  console.log('\n=== CONSULTANDO /api/tenants/libreria_prueba/whatsapp/status ===');
  const resApi = await fetch('http://localhost:3000/api/tenants/libreria_prueba/whatsapp/status');
  console.log('Status endpoint response:', await resApi.text());
}

checkLiveInstances();
