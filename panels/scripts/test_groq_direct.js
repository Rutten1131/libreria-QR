const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testDirect() {
  const systemPrompt = `Clasifica la intención del cliente en JSON:
{
  "intencion": "SALUDO" | "CONSULTA_PRODUCTO" | "SELECCION_OPCION" | "LISTA_COMPUESTA" | "CONFIRMACION" | "REINICIAR" | "OTRO",
  "producto_principal": "cuaderno" | null,
  "especificaciones_acumuladas": "cuaderno" | null,
  "cantidad_comprar": 1,
  "opcion_elegida_index": 1 | null,
  "items_lista": []
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'ÚLTIMO MENSAJE: "necesito un cuaderno". JSON:' }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.05
    })
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

testDirect();
