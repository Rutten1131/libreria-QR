const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function main() {
  const headers = {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
  };

  const resProds = await fetch(`${env.SUPABASE_URL}/rest/v1/productos?tenant_id=eq.libreria_prueba&nombre=ilike.*cartulina*&select=id,nombre,precio,stock_cantidad`, { headers });
  const cartulinas = await resProds.json();
  console.log("Cartulinas in libreria_prueba:", cartulinas);

  const resBond = await fetch(`${env.SUPABASE_URL}/rest/v1/productos?tenant_id=eq.libreria_prueba&nombre=ilike.*bond*&select=id,nombre,precio,stock_cantidad`, { headers });
  const bond = await resBond.json();
  console.log("Bond in libreria_prueba:", bond);

  const resPapel = await fetch(`${env.SUPABASE_URL}/rest/v1/productos?tenant_id=eq.libreria_prueba&nombre=ilike.*papel*&select=id,nombre,precio,stock_cantidad`, { headers });
  const papel = await resPapel.json();
  console.log("Papel in libreria_prueba:", papel);
}

main();
