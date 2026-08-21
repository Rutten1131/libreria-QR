const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

console.log('GEMINI_API_KEY presente:', !!env.GEMINI_API_KEY, env.GEMINI_API_KEY ? env.GEMINI_API_KEY.slice(0, 8) + '...' : 'NO');
console.log('GROQ_API_KEY presente:', !!env.GROQ_API_KEY, env.GROQ_API_KEY ? env.GROQ_API_KEY.slice(0, 8) + '...' : 'NO');

async function testGroq() {
  if (!env.GROQ_API_KEY) return console.log('Sin Groq key');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'Di hola en JSON: {"msg":"hola"}' }],
        response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    console.log('Respuesta Groq (gpt-oss-120b):', data.choices ? 'OK Funcionando' : data);
  } catch (e) {
    console.error('Error Groq:', e);
  }
}

async function testGemini() {
  if (!env.GEMINI_API_KEY) return console.log('Sin Gemini key');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Di hola' }] }]
      })
    });
    const data = await res.json();
    console.log('Respuesta Gemini 3.5 flash:', data.candidates ? 'OK Funcionando' : data);
  } catch (e) {
    console.error('Error Gemini:', e);
  }
}

async function run() {
  await testGroq();
  await testGemini();
}

run();
