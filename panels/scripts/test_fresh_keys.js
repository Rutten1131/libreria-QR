const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function verifyFreshKeys() {
  console.log('--- Verificando Nuevas Keys ---');
  
  // 1. Gemini
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Hola' }] }] })
    });
    const data = await res.json();
    if (data.candidates) {
      console.log('✅ Gemini (Nueva Key): ACTIVA Y FUNCIONANDO');
    } else {
      console.log('❌ Gemini (Nueva Key):', data.error?.message);
    }
  } catch (e) {
    console.log('⚠️ Error Gemini:', e.message);
  }

  // 2. Groq
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'Di ok' }]
      })
    });
    const data = await res.json();
    if (data.choices) {
      console.log('✅ Groq (Nueva Key): ACTIVA Y FUNCIONANDO');
    } else {
      console.log('❌ Groq (Nueva Key):', data.error?.message);
    }
  } catch (e) {
    console.log('⚠️ Error Groq:', e.message);
  }
}

verifyFreshKeys();
