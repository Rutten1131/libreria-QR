const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function checkExactProducts() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const searchTerms = [
    'Boligrafo Artline',
    'Boligrafo Bic',
    'Boligrafo Faber Trilux',
    'Artline',
    'Bic',
    'Trilux'
  ];

  console.log('=== PRODUCTOS EN SUPABASE (tabla "productos") ===');
  for (const term of searchTerms) {
    const { data } = await sb
      .from('productos')
      .select('id, codigo_sku, nombre, precio, stock_cantidad')
      .eq('tenant_id', 'libreria_prueba')
      .ilike('nombre', `%${term}%`)
      .limit(6);

    console.log(`\n--- Búsqueda: "${term}" (${data?.length || 0} encontrados) ---`);
    data?.forEach(p => {
      console.log(`SKU: ${p.codigo_sku} | Nombre: "${p.nombre}" | Precio: $${p.precio} | Stock: ${p.stock_cantidad}`);
    });
  }
}

checkExactProducts();
