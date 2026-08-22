const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  process.env[k?.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function checkGomas() {
  const { getInventarioAsync } = require('../src/server/adapters/inventarioAdapter');
  const { filtrarCandidatosPorCategoria } = require('../src/server/services/variantService');
  const { GOMAS_Y_ADHESIVOS } = require('../src/server/knowledge/manualidades');
  
  const inv = await getInventarioAsync('libreria_prueba');
  const candidatos = filtrarCandidatosPorCategoria(GOMAS_Y_ADHESIVOS, 'gomas o pegamentos', inv);
  console.log('Candidatos encontrados para gomas:', candidatos.length);
  candidatos.slice(0, 10).forEach(c => console.log(' -', c.nombre, `($${c.precio})`));
}

checkGomas();
