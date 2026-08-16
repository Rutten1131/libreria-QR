// Edita .env de forma segura — NO imprime valores
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');

const contenido = fs.readFileSync(envPath, 'utf8');
const lineas = contenido.split('\n').filter(l => l.length > 0);

console.log('--- ESTADO INICIAL ---');
console.log('LINEAS:', lineas.length);
for (let i = 0; i < lineas.length; i++) {
  const l = lineas[i];
  const start = l.substring(0, Math.min(15, l.length));
  const end = l.substring(Math.max(0, l.length - 15));
  console.log(`L${i + 1} len=${l.length} start='${start}' end='${end}'`);
}

// Borrar L1 si es JWT huérfano (empieza con eyJ, sin =)
const nuevaLista: string[] = [];
for (const l of lineas) {
  // Detectar JWT huérfano: empieza con eyJ y NO contiene =
  if (l.startsWith('eyJ') && !l.includes('=')) {
    console.log('BORRANDO JWT huerfano L' + (lineas.indexOf(l) + 1));
    continue;
  }
  nuevaLista.push(l);
}

// Anteponer SUPABASE_DB_URL= si la línea empieza con postgresql://
const finalList: string[] = [];
for (const l of nuevaLista) {
  if (l.startsWith('postgresql://') && !l.startsWith('SUPABASE_DB_URL=')) {
    console.log('AGREGANDO prefijo SUPABASE_DB_URL= a linea postgres');
    finalList.push('SUPABASE_DB_URL=' + l);
  } else {
    finalList.push(l);
  }
}

fs.writeFileSync(envPath, finalList.join('\n') + '\n', 'utf8');

console.log('--- ESTADO FINAL ---');
const nuevo = fs.readFileSync(envPath, 'utf8').split('\n').filter(l => l.length > 0);
console.log('LINEAS:', nuevo.length);
for (let i = 0; i < nuevo.length; i++) {
  const l = nuevo[i];
  const start = l.substring(0, Math.min(20, l.length));
  const end = l.substring(Math.max(0, l.length - 15));
  console.log(`L${i + 1} len=${l.length} start='${start}' end='${end}'`);
}
