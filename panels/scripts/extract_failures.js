const fs = require('fs');
const r = JSON.parse(fs.readFileSync('reports/fire_test_report.json', 'utf-8'));
const fails = r.results.filter(x => x.status === 'FAIL');

console.log(`TOTAL: ${r.total_tests} | PASS: ${r.passed} | FAIL: ${r.failed} | SCORE: ${r.score_percentage.toFixed(1)}%`);
console.log(`CRITICAL: ${r.critical_failures} | HIGH: ${r.high_failures} | MEDIUM: ${r.medium_failures} | LOW: ${r.low_failures}`);
console.log(`HALLUCINATIONS: ${r.hallucinations_detected} | SECURITY LEAKS: ${r.security_leaks_detected}`);
console.log(`\n${'='.repeat(80)}`);
console.log(`DETALLE DE LOS ${fails.length} FALLOS:`);
console.log(`${'='.repeat(80)}`);

fails.forEach((f, i) => {
  console.log(`\n--- [${i+1}/${fails.length}] ${f.id} [${f.severity}] ---`);
  console.log(`Nombre: ${f.name}`);
  console.log(`Categoría: ${f.category}`);
  console.log(`User msgs:`);
  f.user_messages.forEach(m => console.log(`  > ${m}`));
  console.log(`Bot responses:`);
  f.bot_responses.forEach(r => {
    const txt = r ? r.substring(0, 400) : '(null/vacío)';
    console.log(`  < ${txt}`);
  });
  console.log(`Motivo: ${f.failure_reason}`);
});
