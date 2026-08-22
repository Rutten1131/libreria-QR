const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function verifyGroqCascade() {
  console.log('--- Verificando Cascada de Groq Keys ---');
  
  const keys = [
    { label: 'GROQ_API_KEY (Principal)', key: env.GROQ_API_KEY },
    { label: 'GROQ_API_KEY_BACKUP (Secundaria)', key: env.GROQ_API_KEY_BACKUP },
  ];

  for (const item of keys) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${item.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: 'Di ok' }]
        })
      });
      const data = await res.json();
      if (data.choices) {
        console.log(`✅ ${item.label}: ACTIVA Y FUNCIONANDO`);
      } else {
        console.log(`❌ ${item.label}:`, data.error?.message);
      }
    } catch (e) {
      console.log(`⚠️ Error en ${item.label}:`, e.message);
    }
  }
}

verifyGroqCascade();
