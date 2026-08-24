const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function checkPricesInDB() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('--- Buscando esferos / bolígrafos en Supabase ---');
  const { data: items, error } = await sb
    .from('inventario')
    .select('*')
    .ilike('nombre', '%Boligrafo%')
    .limit(15);

  if (error) {
    console.log('Error buscando en inventario:', error);
    // Intentar en productos_libreria
    const { data: prod } = await sb.from('productos_libreria').select('*').ilike('nombre', '%Boligrafo%').limit(15);
    console.log('En productos_libreria:', prod);
  } else {
    console.log('Items encontrados en inventario:');
    items.forEach(i => {
      console.log(`- ID: ${i.id} | Nombre: "${i.nombre}" | Precio: $${i.precio} | Stock: ${i.stock}`);
    });
  }
}

checkPricesInDB();
