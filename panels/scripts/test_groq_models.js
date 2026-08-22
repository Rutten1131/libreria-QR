const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const models = ['qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'allam-2-7b'];

async function testModels() {
  for (const m of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'Di hola' }]
        })
      });
      const data = await res.json();
      if (data.choices) {
        console.log(`✅ Groq ${m}: FUNCIONANDO OK`);
      } else {
        console.log(`❌ Groq ${m}:`, data.error?.message?.slice(0, 70));
      }
    } catch (e) {
      console.log(`⚠️ Groq ${m}:`, e.message);
    }
  }
}

testModels();
