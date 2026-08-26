const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const BASE = env.EVOLUTION_BASE_URL || 'http://178.238.238.158:8080';
const KEY = env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';

async function testMediaUrl() {
  console.log('Testing Evolution API sendMedia with Public URL...');

  const payloadUrl = {
    number: '593983237491',
    mediatype: 'image',
    mimetype: 'image/jpeg',
    caption: '📸 Test con URL pública desde Vercel CDN',
    media: 'https://libreria-qr-brown.vercel.app/imagenes/boligrafo-bic-pm-azul.jpg',
    fileName: 'boligrafo-bic-pm-azul.jpg'
  };

  try {
    const res = await fetch(`${BASE}/message/sendMedia/qr_libreria_prueba`, {
      method: 'POST',
      headers: { 'apikey': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadUrl)
    });
    console.log('URL test status:', res.status);
    const data = await res.json().catch(() => res.text());
    console.log('URL test response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('URL test error:', err.message);
  }
}

testMediaUrl().catch(console.error);
