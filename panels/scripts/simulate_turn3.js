const { despacharMensajeWhatsApp } = require('../src/server/router/botRouter');

async function simulate() {
  const tenantId = 'libreria_prueba';

  console.log('--- TURNO 1: LISTA INICIAL ---');
  let ctx = undefined;
  let r1 = await despacharMensajeWhatsApp(
    tenantId,
    'Hola, quiero 2 esferos, 2 lápices y 2 borradores por favor',
    'Cristhopher',
    '593983237491',
    ctx,
    'Santiago Papelería'
  );
  console.log('R1 Tipo:', r1.tipo);
  console.log('R1 Cola:', JSON.stringify(r1.nuevoContexto.colaPendientes));
  console.log('R1 EnProceso:', JSON.stringify(r1.nuevoContexto.itemEnProceso));
  console.log('R1 Respuesta:\n', r1.textoRespuesta);

  console.log('\n--- TURNO 2: ESPECIFICAR ESFEROS ---');
  let r2 = await despacharMensajeWhatsApp(
    tenantId,
    '1 azul y 1 negro de marca Bic por favor',
    'Cristhopher',
    '593983237491',
    r1.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('R2 Tipo:', r2.tipo);
  console.log('R2 Cola:', JSON.stringify(r2.nuevoContexto.colaPendientes));
  console.log('R2 EnProceso:', JSON.stringify(r2.nuevoContexto.itemEnProceso));
  console.log('R2 Carrito:', JSON.stringify(r2.nuevoContexto.carrito));
  console.log('R2 Opciones:', (r2.nuevoContexto.opcionesPresentadas || []).map(o => o.nombre));
  console.log('R2 Respuesta:\n', r2.textoRespuesta);

  console.log('\n--- TURNO 3: ELEGIR AZUL Y PREGUNTAR POR NEGRO ---');
  let r3 = await despacharMensajeWhatsApp(
    tenantId,
    'Si, ese quiero de azul, de negro cuales tiene?',
    'Cristhopher',
    '593983237491',
    r2.nuevoContexto,
    'Santiago Papelería'
  );
  console.log('R3 Tipo:', r3.tipo);
  console.log('R3 Cola:', JSON.stringify(r3.nuevoContexto.colaPendientes));
  console.log('R3 EnProceso:', JSON.stringify(r3.nuevoContexto.itemEnProceso));
  console.log('R3 Carrito:', JSON.stringify(r3.nuevoContexto.carrito));
  console.log('R3 Imagen adjunta:', !!r3.imagenUrl || !!r3.imagenBase64);
  console.log('R3 Respuesta:\n', r3.textoRespuesta);
}

simulate().catch(console.error);
