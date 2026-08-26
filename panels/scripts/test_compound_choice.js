const { interpretarIntencionSemantica } = require('../src/server/adapters/iaAdapter');

async function test() {
  const historialTexto = `Cliente: Hola, quiero 2 esferos, 2 lápices y 2 borradores por favor
Asistente: 📋 ¡Perfecto! Vamos a armar tu pedido paso a paso:
1. 2x esfero
2. 2x lápiz
3. 2x borrador

Empecemos con esfero (2 unidades):
¿Buscas algún color en especial (azul, negro, rojo) o alguna marca como Bic o Artline?
Cliente: 1 azul y 1 negro de marca Bic por favor
Asistente: ✅ Para el azul tenemos 1️⃣ Bolígrafo Bic Azul Cristal ($0.02 c/u). En negro de Bic no nos queda, pero podemos ofrecer otras marcas. ¿Te anoto el azul?`;

  const opciones = [
    { id: '1', nombre: 'Bolígrafo Bic Azul Cristal Blanco Tapa Azul', precio: 0.02 }
  ];

  const res = await interpretarIntencionSemantica(
    'Dame 1 azul porfdavor, en negro que opciones tienes?',
    historialTexto,
    opciones
  );

  console.log('RESULTADO INTERPRETACION:', JSON.stringify(res, null, 2));
}

test().catch(console.error);
