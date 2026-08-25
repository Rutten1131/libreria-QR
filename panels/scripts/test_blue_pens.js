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

async function testPenFilteringFix() {
  const { getInventarioAsync } = require('../src/server/adapters/inventarioAdapter');
  const { norm, limpiarNombreERP } = require('../src/server/services/displayService');

  const inventario = await getInventarioAsync('libreria_prueba');

  const q = 'esfero de punta gruesa azul';
  const textoNorm = q.toLowerCase();

  // Candidatos de boligrafo
  let boligrafos = inventario.filter(p => {
    const pFam = (p.familia || '').toLowerCase();
    const pNom = p.nombre.toLowerCase();
    return pFam.includes('boligrafo') || pNom.includes('bolig') || pNom.includes('esfero') || pNom.includes('pluma');
  });

  console.log(`Total bolígrafos en inventario: ${boligrafos.length}`);

  // Si busca azul, filtrar bolígrafos azules
  if (textoNorm.includes('azul') || textoNorm.includes('az ')) {
    const azules = boligrafos.filter(p => {
      const pn = p.nombre.toLowerCase();
      return pn.includes('azul') || pn.includes(' az ') || pn.includes('az.');
    });
    console.log(`Bolígrafos azules encontrados: ${azules.length}`);
    console.log('Muestra de bolígrafos azules:');
    azules.slice(0, 10).forEach(b => {
      console.log(`  - ${b.nombre} ($${b.precio})`);
    });
  }
}

testPenFilteringFix();
