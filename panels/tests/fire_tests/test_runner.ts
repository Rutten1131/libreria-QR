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
import { despacharMensajeWhatsApp, RouterContexto } from '../../src/server/router/botRouter';
import { getInventarioAsync } from '../../src/server/adapters/inventarioAdapter';
import { FIRE_TEST_DATASET, TestCase } from './test_dataset';
import { CHAOS_DATASET } from './chaos_dataset';
import { generateHtmlReport, SummaryReport, TestResultItem } from './html_reporter';

const TENANT_ID = 'libreria_prueba'; // Santiago Papeleria
const CLIENTE_NOMBRE = 'César Test';
const CLIENTE_TELEFONO = '593999999999';

async function runFireTests() {
  console.log(`\n===============================================================`);
  console.log(`🔥 INICIANDO TEST DE FUEGO AUTOMATIZADO — SANTIAGO PAPELERÍA 🔥`);
  console.log(`===============================================================\n`);

  const inventario = await getInventarioAsync(TENANT_ID);
  console.log(`📦 Inventario cargado desde Supabase: ${inventario.length} productos reales.\n`);

  const results: TestResultItem[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let criticalFailures = 0;
  let highFailures = 0;
  let mediumFailures = 0;
  let lowFailures = 0;
  let hallucinations = 0;
  let securityLeaks = 0;

  for (let i = 0; i < FIRE_TEST_DATASET.length; i++) {
    const test = FIRE_TEST_DATASET[i];
    const startTime = Date.now();
    let context: RouterContexto | undefined = undefined;
    const botResponses: string[] = [];
    let testPassed = true;
    let failureReason = '';

    process.stdout.write(`[${i + 1}/100] ${test.id}: ${test.name.padEnd(50)} `);

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

      // 1. Validar must_include_any
      if (exp.must_include_any && exp.must_include_any.length > 0) {
        const hasMatch = exp.must_include_any.some((term) =>
          lastResponse.toLowerCase().includes(term.toLowerCase())
        );
        if (!hasMatch) {
          testPassed = false;
          failureReason = `No incluyó ninguno de los términos esperados: [${exp.must_include_any.join(', ')}]`;
        }
      }

      // 2. Validar must_not_include_any (Anti-alucinaciones)
      if (testPassed && exp.must_not_include_any && exp.must_not_include_any.length > 0) {
        const foundBad = exp.must_not_include_any.find((term) =>
          lastResponse.toLowerCase().includes(term.toLowerCase())
        );
        if (foundBad) {
          testPassed = false;
          failureReason = `Alucinación o término prohibido detectado: "${foundBad}"`;
          hallucinations++;
        }
      }

      // 3. Validar Security Leaks
      if (testPassed && exp.forbid_sensitive_data) {
        const sensitivePatterns = ['eyJhbGci', 'A1RnvD8H85Z5bgn9', 'postgresql://', 'SUPABASE_SERVICE_ROLE_KEY'];
        const leaked = sensitivePatterns.find((p) => lastResponse.includes(p));
        if (leaked) {
          testPassed = false;
          failureReason = `Fuga crítica de seguridad / credenciales detectada`;
          securityLeaks++;
        }
      }
    } catch (err: any) {
      testPassed = false;
      failureReason = `Error técnico de ejecución: ${err.message}`;
    }

    const duration = Date.now() - startTime;

    if (testPassed) {
      passedCount++;
      console.log(`\x1b[32m✔ PASS\x1b[0m (${duration}ms)`);
    } else {
      failedCount++;
      if (test.severity === 'CRITICAL') criticalFailures++;
      else if (test.severity === 'HIGH') highFailures++;
      else if (test.severity === 'MEDIUM') mediumFailures++;
      else lowFailures++;

      console.log(`\x1b[31m✖ FAIL [${test.severity}]\x1b[0m (${duration}ms)`);
      console.log(`   └─ Motivo: \x1b[33m${failureReason}\x1b[0m`);
    }

    results.push({
      id: test.id,
      category: test.category,
      name: test.name,
      status: testPassed ? 'PASS' : 'FAIL',
      severity: test.severity,
      user_messages: test.user_messages,
      bot_responses: botResponses,
      failure_reason: failureReason || undefined,
      duration_ms: duration,
    });

    // Pequeño delay de 250ms para no saturar rate limit de Gemini
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  // ─── EJECUCIÓN DE CONVERSACIONES CAÓTICAS ─────────────────────────────
  console.log(`\n===============================================================`);
  console.log(`🌪️ EJECUTANDO ${CHAOS_DATASET.length} CONVERSACIONES CAÓTICAS MULTI-TURNO 🌪️`);
  console.log(`===============================================================\n`);

  for (let i = 0; i < CHAOS_DATASET.length; i++) {
    const chaos = CHAOS_DATASET[i];
    const startTime = Date.now();
    let context: RouterContexto | undefined = undefined;
    const botResponses: string[] = [];
    let chaosPassed = true;
    let chaosReason = '';

    process.stdout.write(`[CHAOS ${i + 1}/${CHAOS_DATASET.length}] ${chaos.name.padEnd(50)} `);

    try {
      for (const step of chaos.dialogue) {
        const res = await despacharMensajeWhatsApp(
          TENANT_ID,
          step.user,
          CLIENTE_NOMBRE,
          CLIENTE_TELEFONO,
          context
        );
        botResponses.push(res.textoRespuesta);
        context = res.nuevoContexto;

        if (step.expected_check && !step.expected_check(res.textoRespuesta)) {
          chaosPassed = false;
          chaosReason = step.failure_reason || `Fallo en el turno: "${step.user}" -> Respuesta inesperada`;
          break;
        }
      }
    } catch (err: any) {
      chaosPassed = false;
      chaosReason = `Error técnico: ${err.message}`;
    }

    const duration = Date.now() - startTime;

    if (chaosPassed) {
      passedCount++;
      console.log(`\x1b[32m✔ PASS\x1b[0m (${duration}ms)`);
    } else {
      failedCount++;
      highFailures++;
      console.log(`\x1b[31m✖ FAIL\x1b[0m (${duration}ms)`);
      console.log(`   └─ Motivo: \x1b[33m${chaosReason}\x1b[0m`);
    }

    results.push({
      id: chaos.id,
      category: 'CONVERSACION_CAOTICA',
      name: chaos.name,
      status: chaosPassed ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      user_messages: chaos.dialogue.map((d) => d.user),
      bot_responses: botResponses,
      failure_reason: chaosReason || undefined,
      duration_ms: duration,
    });
  }

  const totalTests = results.length;
  const score = (passedCount / totalTests) * 100;

  const summary: SummaryReport = {
    tenant: 'Santiago Papeleria (libreria_prueba)',
    timestamp: new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }),
    total_tests: totalTests,
    passed: passedCount,
    failed: failedCount,
    errors: 0,
    score_percentage: score,
    critical_failures: criticalFailures,
    high_failures: highFailures,
    medium_failures: mediumFailures,
    low_failures: lowFailures,
    hallucinations_detected: hallucinations,
    security_leaks_detected: securityLeaks,
    results,
  };

  // Guardar reportes JSON y HTML
  const reportsDir = path.resolve(__dirname, '../../reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, 'fire_test_report.json'), JSON.stringify(summary, null, 2), 'utf-8');
  generateHtmlReport(summary, path.join(reportsDir, 'fire_test_report.html'));

  console.log(`\n===============================================================`);
  console.log(`📊 RESUMEN FINAL DEL TEST DE FUEGO 📊`);
  console.log(`===============================================================`);
  console.log(`Total de pruebas ejecutadas: ${totalTests}`);
  console.log(`Aprobadas:                   \x1b[32m${passedCount}\x1b[0m`);
  console.log(`Fallidas:                    \x1b[31m${failedCount}\x1b[0m`);
  console.log(`Puntuación Global:           \x1b[1m${score.toFixed(1)}%\x1b[0m`);
  console.log(`---------------------------------------------------------------`);
  console.log(`Fallos Críticos:             ${criticalFailures}`);
  console.log(`Fallos Altos:                ${highFailures}`);
  console.log(`Fallos Medios:               ${mediumFailures}`);
  console.log(`Fallos Bajos:                ${lowFailures}`);
  console.log(`Alucinaciones Detectadas:    ${hallucinations}`);
  console.log(`Fugas de Seguridad:          ${securityLeaks}`);
  console.log(`===============================================================`);
  console.log(`📄 Reporte JSON guardado en: reports/fire_test_report.json`);
  console.log(`🌐 Reporte HTML guardado en: reports/fire_test_report.html\n`);
}

runFireTests();
