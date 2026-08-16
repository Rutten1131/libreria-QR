// Test rapido de la cascada IA: Groq → NVIDIA
// Valida que ambos proveedores respondan con un prompt simple
import 'dotenv/config';
import { interpretarTexto } from '../adapters/iaAdapter';

async function main() {
  console.log('=== Test cascada IA (Groq → NVIDIA) ===\n');

  // Inventario de prueba
  const catalogo = [
    'Cuaderno college 100h',
    'Boligrafo azul',
    'Lapiz 2B',
    'Borrador blanco',
  ];

  // Test 1: Texto simple — debe resolver via Groq (primera opcion)
  console.log('Test 1: "3 cuadernos y 2 lapices"');
  try {
    const r1 = await interpretarTexto('3 cuadernos y 2 lapices', catalogo);
    console.log('  fuente:', r1.fuente);
    console.log('  texto:', r1.texto.split('\n').slice(0, 5).join(' | '));
  } catch (e: any) {
    console.log('  ERROR:', String(e.message).slice(0, 200));
  }

  // Test 2: Texto diferente
  console.log('\nTest 2: "quiero un boligrafo y un borrador"');
  try {
    const r2 = await interpretarTexto('quiero un boligrafo y un borrador', catalogo);
    console.log('  fuente:', r2.fuente);
    console.log('  texto:', r2.texto.split('\n').slice(0, 5).join(' | '));
  } catch (e: any) {
    console.log('  ERROR:', String(e.message).slice(0, 200));
  }

  // Test 3: Verificar variables de entorno
  console.log('\nTest 3: Variables de entorno');
  console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? '<SET>' : '<EMPTY>');
  console.log('  NVIDIA_API_KEY:', process.env.NVIDIA_API_KEY ? '<SET>' : '<EMPTY>');

  console.log('\n=== Fin test ===');
}

main().catch(e => { console.error(e); process.exit(1); });