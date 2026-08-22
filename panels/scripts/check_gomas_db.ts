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

async function checkGomasDB() {
  const inv = await getInventarioAsync('libreria_prueba');
  const gomas = inv.filter(p => {
    const n = p.nombre.toLowerCase();
    return n.includes('goma') || n.includes('silicona') || n.includes('adhesiv') || n.includes('pegament') || n.includes('pega ');
  });
  console.log('Productos en DB que tienen goma/silicona/adhesivo:', gomas.length);
  gomas.forEach(p => console.log(' -', p.nombre, `($${p.precio})`));
}

checkGomasDB();
