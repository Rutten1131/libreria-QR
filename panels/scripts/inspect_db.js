const path = require('path');
const { createClient } = require(path.resolve(__dirname, '../node_modules/@supabase/supabase-js'));
const fs = require('fs');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data: tenant } = await supabase.from('tenants').select('id, slug, nombre').limit(5);
  console.log("Tenants:", tenant);
  const targetTenant = tenant[0];

  const { data: prods } = await supabase.from('productos').select('*').eq('tenant_id', targetTenant.id).ilike('nombre', '%cartulina%');
  console.log("Cartulinas:", prods.map(p => ({ id: p.id, nombre: p.nombre, precio: p.precio, stock: p.stock_cantidad })));
  
  const { data: bond } = await supabase.from('productos').select('*').eq('tenant_id', targetTenant.id).ilike('nombre', '%bond%');
  console.log("Bond / Resmas:", bond.map(p => ({ id: p.id, nombre: p.nombre, precio: p.precio, stock: p.stock_cantidad })));
}

main();
