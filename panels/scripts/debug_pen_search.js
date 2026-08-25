const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

process.env.SUPABASE_URL = env.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function debugPenSearch() {
  const { getInventarioAsync } = require('../src/server/adapters/inventarioAdapter');
  const { filtrarCandidatosPorCategoria } = require('../src/server/services/variantService');
  const { buscarCategoriaParaItem } = require('../src/server/knowledge/index');

  const inventario = await getInventarioAsync('libreria_prueba');
  console.log(`Total inventario: ${inventario.length} items`);

  const queries = [
    'esfero de punta gruesa azul',
    'esfero azul',
    'esfero punta gruesa',
    'boligrafo azul',
    'esfero'
  ];

  for (const q of queries) {
    console.log(`\n========================================`);
    console.log(`QUERY: "${q}"`);
    const categoria = buscarCategoriaParaItem(q);
    console.log(`Categoría encontrada:`, categoria?.familia || 'NINGUNA');

    const candidatos = filtrarCandidatosPorCategoria(categoria, q, inventario);
    console.log(`Candidatos devueltos (${candidatos.length}):`);
    candidatos.slice(0, 8).forEach(c => {
      console.log(`  - [${c.id}] ${c.nombre} ($${c.precio})`);
    });
  }
}

debugPenSearch();
