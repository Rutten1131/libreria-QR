const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testLogoutAndConnect() {
  const instanceName = 'qr_libreria_prueba';
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;

  console.log('1. Intentando logout de qr_libreria_prueba...');
  try {
    const resLogout = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': apiKey }
    });
    console.log('Logout status:', resLogout.status, await resLogout.text());
  } catch (e) {
    console.log('Error logout:', e.message);
  }

  console.log('\n2. Pidiendo QR nuevo en /instance/connect...');
  try {
    const resConnect = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      headers: { 'apikey': apiKey }
    });
    const data = await resConnect.json();
    console.log('Connect status:', resConnect.status);
    console.log('Tiene base64 QR:', Boolean(data.base64 || data.qrcode?.base64 || data.code));
    if (data.base64) {
      console.log('QR base64 preview:', data.base64.substring(0, 50) + '...');
    }
  } catch (e) {
    console.log('Error connect:', e.message);
  }
}

testLogoutAndConnect();
