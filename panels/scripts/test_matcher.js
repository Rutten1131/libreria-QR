const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function main() {
  const url = `${env.SUPABASE_URL}/rest/v1/productos?tenant_id=eq.libreria_prueba&select=id,nombre,precio,stock_cantidad,familia,categoria`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const prods = await res.json();
  console.log(`Total productos cargados: ${prods.length}`);

  // Test boligrafos
  const { buscarCategoriaParaItem } = require('../src/server/knowledge/index');
  const { filtrarCandidatosPorCategoria } = require('../src/server/services/variantService');

  const queries = ['esferos', 'que marcas de esferos tienen', 'algo para escribir', 'lapiz bicolor norma', 'productos para pegar'];

  for (const q of queries) {
    const cat = buscarCategoriaParaItem(q);
    const results = filtrarCandidatosPorCategoria(cat, q, prods);
    console.log(`\nQuery: "${q}" | Categoria: ${cat?.familia}`);
    console.log(`Encontrados: ${results.length}`);
    results.slice(0, 5).forEach((r, i) => console.log(`  ${i+1}. ${r.nombre} ($${r.precio})`));
  }
}

main();
