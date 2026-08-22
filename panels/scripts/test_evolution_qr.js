const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testInstance() {
  const instanceName = 'qr_libreria_prueba';
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;

  console.log(`Verificando instancia '${instanceName}' en ${baseUrl}...`);

  // 1. Connection state
  try {
    const resState = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      headers: { 'apikey': apiKey }
    });
    const dataState = await resState.json();
    console.log('connectionState:', dataState);
  } catch (e) {
    console.log('Error connectionState:', e.message);
  }

  // 2. Connect / QR
  try {
    const resConnect = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      headers: { 'apikey': apiKey }
    });
    const dataConnect = await resConnect.json();
    console.log('connect result:', {
      pairingCode: dataConnect.pairingCode,
      code: dataConnect.code ? dataConnect.code.substring(0, 30) + '...' : null,
      base64: dataConnect.base64 ? dataConnect.base64.substring(0, 30) + '...' : null,
      count: dataConnect.count
    });
  } catch (e) {
    console.log('Error connect:', e.message);
  }
}

testInstance();
