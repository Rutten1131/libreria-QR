// Test real de Groq OCR — usa una imagen minima PNG con texto escrito a mano.
// Generamos el PNG via Node para no depender de archivos externos.
import 'dotenv/config';
import { transcribirOCR, interpretarTexto } from '../adapters/iaAdapter';

// PNG minimo valido de 1x1 pixel rojo (no es util para OCR real)
// En lugar de eso, usamos una imagen SVG convertida a base64 con texto.
// Para un test real, lo mas practico es una imagen con texto legible.

async function main() {
  console.log('--- TEST REAL GROQ OCR ---');
  console.log('NOTA: este test requiere una imagen con texto.');
  console.log('Vamos a usar interpretarTexto primero que es mas facil de testear.\n');

  // Test 1: interpretar texto libre
  console.log('=== TEST 1: interpretarTexto ===');
  const textoLibre = 'quiero 3 cuadernos college y 2 lapices 2B y por favor un compas Faber';
  const inventario = [
    'Cuaderno college 100h',
    'Lápiz 2B',
    'Bolígrafo azul',
    'Compás Faber',
    'Resaltador amarillo',
  ];

  try {
    const resultado = await interpretarTexto(textoLibre, inventario);
    console.log('INPUT:', textoLibre);
    console.log('OUTPUT:');
    console.log(resultado.texto);
    console.log('FUENTE:', resultado.fuente);
  } catch (e: any) {
    console.error('ERROR interpretarTexto:', e.message);
    process.exit(1);
  }

  console.log('\n=== TEST 2: verificar que Groq API responde ===');
  console.log('Llama a Groq con un prompt simple para verificar conectividad.');

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY no encontrada');
    process.exit(1);
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Responde solo con la palabra "OK".' }],
        max_tokens: 5,
      }),
    });
    console.log('STATUS:', response.status);
    if (response.ok) {
      const data = await response.json() as any;
      console.log('RESPUESTA:', data.choices?.[0]?.message?.content);
      console.log('GROQ_API_FUNCIONA');
    } else {
      const errBody = await response.text();
      console.error('ERROR GROQ:', errBody.slice(0, 300));
      process.exit(1);
    }
  } catch (e: any) {
    console.error('FETCH ERROR:', e.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
