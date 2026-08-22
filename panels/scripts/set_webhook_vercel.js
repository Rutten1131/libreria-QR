const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function setWebhookToVercel() {
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;
  const instanceName = 'qr_libreria_prueba';
  const targetWebhook = 'https://libreria-qr-brown.vercel.app/api/whatsapp/webhook';

  console.log(`Configurando Webhook de '${instanceName}' hacia: ${targetWebhook}...`);

  const res = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: targetWebhook,
        byEvents: false,
        base64: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED'
        ]
      }
    })
  });

  console.log('Resultado status:', res.status);
  const data = await res.json();
  console.log('Resultado data:', JSON.stringify(data, null, 2));
}

setWebhookToVercel();
