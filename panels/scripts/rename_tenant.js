const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function main() {
  const headers = {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // 1. Update tenant with id or slug 'libreria_prueba'
  const resUpdate = await fetch(`${env.SUPABASE_URL}/rest/v1/tenants?id=eq.libreria_prueba`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ nombre: 'Santiago Papeleria' })
  });
  const updated = await resUpdate.json();
  console.log("Tenant actualizado:", updated);

  // 2. Verify all tenants
  const resTenants = await fetch(`${env.SUPABASE_URL}/rest/v1/tenants?select=id,nombre,telefono`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const allTenants = await resTenants.json();
  console.log("Todos los tenants en DB:", allTenants);
}

main();
