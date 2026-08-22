const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const keys = [env.GEMINI_API_KEY, env.GEMINI_API_KEY_BACKUP].filter(Boolean);
const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash-lite'];

async function testAll() {
  for (let kIdx = 0; kIdx < keys.length; kIdx++) {
    const key = keys[kIdx];
    console.log(`\n--- Probando KEY #${kIdx + 1} (${key.slice(0, 10)}...) ---`);
    for (const m of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Hola' }] }] })
        });
        const data = await res.json();
        if (data.candidates) {
          console.log(`  ✅ ${m}: ACTIVO (200 OK)`);
        } else {
          console.log(`  ❌ ${m}: ${data.error?.message?.slice(0, 60)}`);
        }
      } catch (e) {
        console.log(`  ⚠️ ${m}: ${e.message}`);
      }
    }
  }
}

testAll();
