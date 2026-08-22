import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v && !process.env[k.trim()]) {
    process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

import { getInventarioAsync } from '../src/server/adapters/inventarioAdapter';
import { filtrarCandidatosPorCategoria } from '../src/server/services/variantService';
import { GOMAS_Y_ADHESIVOS } from '../src/server/knowledge/manualidades';

async function checkGomas() {
  const inv = await getInventarioAsync('libreria_prueba');
  const candidatos = filtrarCandidatosPorCategoria(GOMAS_Y_ADHESIVOS, 'gomas o pegamentos', inv);
  console.log('Candidatos encontrados para gomas:', candidatos.length);
  candidatos.slice(0, 10).forEach(c => console.log(' -', c.nombre, `($${c.precio})`));
}

checkGomas();
