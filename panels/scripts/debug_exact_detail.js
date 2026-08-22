const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function debugExactDetail() {
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;

  console.log('1. Llamando a /instance/fetchInstances...');
  const resFetch = await fetch(`${baseUrl}/instance/fetchInstances`, {
    headers: { 'apikey': apiKey }
  });
  const list = await resFetch.json();
  const inst = list.find(i => i.name === 'qr_libreria_prueba' || i.instanceName === 'qr_libreria_prueba');
  console.log('inst.ownerJid:', inst?.ownerJid);
  console.log('inst.connectionStatus:', inst?.connectionStatus);
  console.log('inst.state:', inst?.state);

  console.log('\n2. Llamando a /instance/connectionState/qr_libreria_prueba...');
  const resState = await fetch(`${baseUrl}/instance/connectionState/qr_libreria_prueba`, {
    headers: { 'apikey': apiKey }
  });
  const stateData = await resState.json();
  console.log('stateData:', stateData);
}

debugExactDetail();
