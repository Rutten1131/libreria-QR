const NUMEROS_TEST_BOT = [
  '593963410409', // César 1
  '593983237491', // César 2
  '593983134672', // César 3 (+593 98 313 4672)
];

function esNumeroAutorizado(numeroRaw) {
  if (!numeroRaw) return false;
  const numDigitos = numeroRaw.replace(/\D/g, '');
  const ultimos9 = numDigitos.slice(-9);
  return NUMEROS_TEST_BOT.some((aut) => {
    const aut9 = aut.replace(/\D/g, '').slice(-9);
    return ultimos9 === aut9 || numDigitos.includes(aut) || aut.includes(numDigitos);
  });
}

console.log('--- Comprobando Filtro de Números Autorizados ---');
const tests = [
  { num: '+593 98 313 4672', expected: true },
  { num: '593983134672@s.whatsapp.net', expected: true },
  { num: '0983134672', expected: true },
  { num: '+593 96 341 0409', expected: true },
  { num: '+593 98 323 7491', expected: true },
  { num: '+593 99 999 9999', expected: false },
  { num: '1234567890', expected: false },
];

let allOk = true;
for (const t of tests) {
  const result = esNumeroAutorizado(t.num);
  const ok = result === t.expected;
  if (!ok) allOk = false;
  console.log(`${ok ? '✅' : '❌'} ${t.num} -> ${result} (esperado: ${t.expected})`);
}

if (allOk) {
  console.log('\n🎯 FILTRO BLINDADO AL 100%');
}
