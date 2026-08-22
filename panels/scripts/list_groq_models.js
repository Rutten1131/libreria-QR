const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function checkGroq() {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }
  });
  const data = await res.json();
  console.log('Modelos disponibles en Groq:');
  data.data?.forEach(m => console.log(' -', m.id));
}

checkGroq();
