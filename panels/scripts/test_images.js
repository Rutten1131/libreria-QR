const { buscarImagenProducto } = require('../src/server/services/productImageService');

const tests = [
  'esfero bic azul punta fina',
  'Bolígrafo Bic Azul Cristal Blanco Tapa Azul',
  'esfero bic negro punta fina',
  'Bolígrafo Bic Negro Cristal Ultra Fino',
  'borrador blanco de queso Pelikan',
  'borrador pelikan br 40',
  'borrador kuromi figuras de colores',
  'lapiz infinito astronauta hb',
  'cuaderno cosido norma 100 hojas cuadros',
  'cuaderno espiral 200 hojas líneas'
];

console.log('=== TEST DE BÚSQUEDA DE IMÁGENES LOCALES ===\n');
for (const t of tests) {
  const res = buscarImagenProducto(t);
  console.log(`🔍 Query: "${t}"`);
  if (res) {
    console.log(`   📸 Encontrada: ${res.nombreArchivo} (${res.mimeType}, ${res.base64.length} chars)`);
  } else {
    console.log(`   ❌ No encontrada`);
  }
}
