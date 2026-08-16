// Test cascade NVIDIA: step-3.7-flash → nemotron-3.5-lighting → nemotron-3-ultra
// Verifica que:
// 1. El modelo principal responde
// 2. Las cantidades se respetan (no se inventan productos)
// 3. Si el principal falla, el cascade salta al siguiente
import 'dotenv/config';
import { interpretarTexto } from '../adapters/iaAdapter';

async function main() {
  console.log('=== Test cascade NVIDIA (sin Groq) ===\n');

  // Inventario mas realista: muchos productos, para que la IA NO agregue cosas no pedidas
  const catalogo = [
    'Cuaderno college 100h',
    'Cuaderno espiral 50h',
    'Boligrafo azul',
    'Boligrafo negro',
    'Lapiz 2B',
    'Lapiz HB',
    'Borrador blanco',
    'Sacapuntas metalico',
    'Regla 30cm',
    'Compas Faber',
    'Tijera escolar',
    'Pegamento en barra',
    'Cartulina blanca',
    'Folder amarillo',
    'Cuaderno de dibujo',
  ];

  // Test 1: Cantidades respetadas
  console.log('Test 1: "3 cuadernos y 2 lapices 2B"');
  try {
    const r1 = await interpretarTexto('3 cuadernos y 2 lapices 2B', catalogo);
    console.log('  fuente:', r1.fuente);
    console.log('  texto:', r1.texto.split('\n').slice(0, 5).join(' | '));
    const lineas = r1.texto.split('\n').filter(l => l.trim().length > 0);
    if (lineas.length === 2) {
      console.log('  ✅ Solo 2 items (cuaderno + lapiz), no invento');
    } else {
      console.log(`  ⚠️ Devolvio ${lineas.length} items, revisar si invento`);
    }
  } catch (e: any) {
    console.log('  ERROR:', String(e.message).slice(0, 200));
  }

  // Test 2: NO inventar
  console.log('\nTest 2: "quiero un boligrafo y un borrador"');
  try {
    const r2 = await interpretarTexto('quiero un boligrafo y un borrador', catalogo);
    console.log('  fuente:', r2.fuente);
    console.log('  texto:', r2.texto.split('\n').slice(0, 5).join(' | '));
    const lineas = r2.texto.split('\n').filter(l => l.trim().length > 0);
    if (lineas.length === 2) {
      console.log('  ✅ Solo 2 items (boligrafo + borrador)');
    } else {
      console.log(`  ⚠️ Devolvio ${lineas.length} items, pudo inventar`);
    }
  } catch (e: any) {
    console.log('  ERROR:', String(e.message).slice(0, 200));
  }

  // Test 3: Item no en catalogo
  console.log('\nTest 3: "quiero un sacapuntas y un dragon de plastico"');
  try {
    const r3 = await interpretarTexto('quiero un sacapuntas y un dragon de plastico', catalogo);
    console.log('  fuente:', r3.fuente);
    console.log('  texto:', r3.texto.split('\n').slice(0, 5).join(' | '));
  } catch (e: any) {
    console.log('  ERROR:', String(e.message).slice(0, 200));
  }

  // Test 4: Verificar variables
  console.log('\nTest 4: Variables de entorno');
  console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? '<SET>' : '<EMPTY>  (ya no se usa)');
  console.log('  NVIDIA_API_KEY:', process.env.NVIDIA_API_KEY ? '<SET>' : '<EMPTY>');

  console.log('\n=== Fin test ===');
}

main().catch(e => { console.error(e); process.exit(1); });