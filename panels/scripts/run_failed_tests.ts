import fs from 'fs';
import path from 'path';

// Load .env.local manually
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [k, ...v] = line.split('=');
    if (k && v && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {}

import { despacharMensajeWhatsApp, RouterContexto } from '../src/server/router/botRouter';
import { getInventarioAsync } from '../src/server/adapters/inventarioAdapter';
import { FIRE_TEST_DATASET, TestCase } from '../tests/fire_tests/test_dataset';
import { CHAOS_DATASET } from '../tests/fire_tests/chaos_dataset';

const TENANT_ID = 'libreria_prueba';
const CLIENTE_NOMBRE = 'César Test';
const CLIENTE_TELEFONO = '593999999999';

const TARGET_IDS = [
  'TEST-015',
  'TEST-023',
  'TEST-047',
  'TEST-051',
  'TEST-053',
  'TEST-055',
  'TEST-056',
  'TEST-057',
  'TEST-058',
  'TEST-065',
  'TEST-091',
];

async function main() {
  console.log('===============================================================');
  console.log('🎯 EJECUTANDO TEST SELECTIVO DE LOS CASOS PUNTUALES 🎯');
  console.log('===============================================================\n');

  const inventario = await getInventarioAsync(TENANT_ID);
  console.log(`📦 Inventario cargado: ${inventario.length} productos.\n`);

  const testsToRun = FIRE_TEST_DATASET.filter((t) => TARGET_IDS.includes(t.id));

  let passed = 0;
  let failed = 0;

  for (const test of testsToRun) {
    process.stdout.write(`[TEST] ${test.id}: ${test.name.padEnd(50)} `);
    let context: RouterContexto | undefined = undefined;
    const botResponses: string[] = [];
    let testPassed = true;
    let failureReason = '';
    const startTime = Date.now();

    try {
      for (const msg of test.user_messages) {
        const res = await despacharMensajeWhatsApp(
          TENANT_ID,
          msg,
          CLIENTE_NOMBRE,
          CLIENTE_TELEFONO,
          context
        );
        botResponses.push(res.textoRespuesta);
        context = res.nuevoContexto;
      }

      const lastResponse = botResponses[botResponses.length - 1] || '';
      const exp = test.expected_behavior;

      if (exp.must_include_any && exp.must_include_any.length > 0) {
        const found = exp.must_include_any.some((term) =>
          lastResponse.toLowerCase().includes(term.toLowerCase())
        );
        if (!found) {
          testPassed = false;
          failureReason = `No incluyó ninguno de los términos esperados: [${exp.must_include_any.join(', ')}]`;
        }
      }

      if (exp.must_not_include_any && exp.must_not_include_any.length > 0) {
        for (const term of exp.must_not_include_any) {
          if (lastResponse.toLowerCase().includes(term.toLowerCase())) {
            testPassed = false;
            failureReason = `Incluyó término prohibido: "${term}"`;
            break;
          }
        }
      }
    } catch (err: any) {
      testPassed = false;
      failureReason = `Error en ejecución: ${err?.message}`;
    }

    const duration = Date.now() - startTime;

    if (testPassed) {
      passed++;
      console.log(`✔ PASS (${duration}ms)`);
    } else {
      failed++;
      console.log(`✖ FAIL (${duration}ms)`);
      console.log(`   └─ Motivo: ${failureReason}`);
      console.log(`   └─ Respuesta Bot: ${botResponses[botResponses.length - 1]?.slice(0, 140)}...`);
    }
  }

  // 2. Ejecutar los 5 escenarios caóticos
  console.log('\n===============================================================');
  console.log('🌪️ EJECUTANDO 5 ESCENARIOS CAÓTICOS 🌪️');
  console.log('===============================================================\n');

  let chaosPassed = 0;
  let chaosFailed = 0;

  for (let idx = 0; idx < CHAOS_DATASET.length; idx++) {
    const chaos = CHAOS_DATASET[idx];
    console.log(`[CHAOS ${idx + 1}/${CHAOS_DATASET.length}] ${chaos.name}`);
    let context: RouterContexto | undefined = undefined;
    let chaosPassedSingle = true;
    let chaosFailureReason = '';
    const startTime = Date.now();

    try {
      for (const turn of chaos.dialogue) {
        const res = await despacharMensajeWhatsApp(
          TENANT_ID,
          turn.user,
          CLIENTE_NOMBRE,
          CLIENTE_TELEFONO,
          context
        );
        context = res.nuevoContexto;

        if (turn.expected_check) {
          const pass = turn.expected_check(res.textoRespuesta);
          if (!pass) {
            chaosPassedSingle = false;
            chaosFailureReason = `Fallo en el turno: "${turn.user}" -> Respuesta: "${res.textoRespuesta.slice(0, 100)}..."`;
            break;
          }
        }
      }
    } catch (e: any) {
      chaosPassedSingle = false;
      chaosFailureReason = `Excepción: ${e?.message}`;
    }

    const elapsed = Date.now() - startTime;
    if (chaosPassedSingle) {
      chaosPassed++;
      console.log(`✔ PASS (${elapsed}ms)`);
    } else {
      chaosFailed++;
      console.log(`✖ FAIL (${elapsed}ms)`);
      console.log(`   └─ Motivo: ${chaosFailureReason}`);
    }
  }

  console.log('\n===============================================================');
  console.log(`📊 RESUMEN: Tests unitarios: ${passed}/${testsToRun.length} | Caos: ${chaosPassed}/${CHAOS_DATASET.length}`);
  console.log('===============================================================');
}

main().catch(console.error);
