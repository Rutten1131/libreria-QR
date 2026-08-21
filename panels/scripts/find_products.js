const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function main() {
  const query = process.argv[2] || 'bicolor';
  const url = `${env.SUPABASE_URL}/rest/v1/productos?tenant_id=eq.libreria_prueba&nombre=ilike.*${encodeURIComponent(query)}*&select=id,nombre,precio,stock_cantidad&limit=20`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  console.log(`Resultados para "${query}":`, data);
}

main();
