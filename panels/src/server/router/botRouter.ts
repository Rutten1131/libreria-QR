/**
 * botRouter.ts
 * Enrutador Central de WhatsApp para LibreríaQR.
 * Despacha cada mensaje a un Handler Especializado según la intención semántica por IA.
 * Mantiene el historial de la conversación ordenado sin interferencias.
 */

import { getInventarioAsync } from '../adapters/inventarioAdapter';
import { cotizar } from '../services/matchingService';
import { crearPedido } from '../services/pedidoService';
import {
  detectarAmbiguedad,
  filtrarCandidatosPorCategoria,
  resolverSeleccionOpcion,
  CandidatoProducto,
} from '../services/variantService';
import {
  interpretarIntencionSemantica,
  IntencionSemantica,
  generarRespuestaVentas,
} from '../adapters/iaAdapter';
import { buscarCategoriaParaItem } from '../knowledge/index';
import { limpiarNombreERP, generarSugerenciaVentaCruzada } from '../services/displayService';

export interface MensajeHistorial {
  role: 'user' | 'model';
  texto: string;
}

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

export interface RouterContexto {
  historialMensajes?: MensajeHistorial[];
  queryAcumulada?: string;
  opcionesPresentadas?: CandidatoProducto[];
  productoSeleccionado?: CandidatoProducto | null;
  cantidad?: number;
  pedidoId?: string;
  total?: number;
  itemsCount?: number;
  carrito?: ItemCarrito[];
}

export interface ResultadoRouter {
  tipo: 'mensaje_directo' | 'pregunta_variante' | 'cotizacion' | 'pedido_confirmado' | 'reset';
  textoRespuesta: string;
  nuevoContexto: RouterContexto;
  pedidoId?: string;
  total?: number;
}

/**
 * Enrutador principal: clasifica semánticamente y ejecuta el handler adecuado.
 */
export async function despacharMensajeWhatsApp(
  tenantId: string,
  textoCliente: string,
  clienteNombre: string,
  clienteTelefono: string,
  contextoPrevio?: RouterContexto
): Promise<ResultadoRouter> {
  const textoLimpio = textoCliente.trim();
  const inventario = await getInventarioAsync(tenantId);

  // 1. Obtener historial reciente para memoria completa
  const historial: MensajeHistorial[] = contextoPrevio?.historialMensajes || [];
  const resumenHistorial = historial
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Cliente' : 'Asistente'}: ${m.texto}`)
    .join('\n');

  const opcionesActivas = contextoPrevio?.opcionesPresentadas || [];

  // 2. Clasificación Semántica por IA
  const semantica = await interpretarIntencionSemantica(
    textoLimpio,
    resumenHistorial,
    opcionesActivas
  );

  // Si hay opciones activas en pantalla y el texto coincide directamente con una de ellas (ej. "stitch", "avengers", "el 4"), forzar SELECCION_OPCION
  if (opcionesActivas.length > 0 && semantica.intencion !== 'REINICIAR' && semantica.intencion !== 'SALUDO') {
    const matchDirecto = resolverSeleccionOpcion(textoLimpio, opcionesActivas);
    if (matchDirecto) {
      semantica.intencion = 'SELECCION_OPCION';
    }
  }

  console.log(`[BotRouter] Intención: ${semantica.intencion} | Prod: ${semantica.producto_principal} | Cant: ${semantica.cantidad_comprar} | OptIndex: ${semantica.opcion_elegida_index}`);

  let resultado: ResultadoRouter;

  // 3. Despacho modular a handlers según la intención
  switch (semantica.intencion) {
    case 'REINICIAR':
      resultado = handleReset();
      break;

    case 'SALUDO':
      resultado = handleSaludo();
      break;

    case 'CONFIRMACION':
      resultado = await handleConfirmacion(tenantId, clienteNombre, clienteTelefono, contextoPrevio);
      break;

    case 'LISTA_COMPUESTA':
      resultado = await handleListaCompuesta(tenantId, clienteNombre, clienteTelefono, textoLimpio, semantica, contextoPrevio);
      break;

    case 'SELECCION_OPCION':
      resultado = await handleSeleccionOpcion(
        tenantId,
        clienteNombre,
        clienteTelefono,
        textoLimpio,
        semantica,
        contextoPrevio,
        inventario
      );
      break;

    case 'CONSULTA_PRODUCTO':
    default:
      resultado = await handleConsultaProducto(
        tenantId,
        clienteNombre,
        clienteTelefono,
        textoLimpio,
        semantica,
        contextoPrevio,
        inventario
      );
      break;
  }

  // 4. Actualizar historial de mensajes (manteniendo últimos 8)
  const nuevoHistorial: MensajeHistorial[] = [
    ...historial.slice(-7),
    { role: 'user', texto: textoLimpio },
    { role: 'model', texto: resultado.textoRespuesta },
  ];

  resultado.nuevoContexto.historialMensajes = nuevoHistorial;
  return resultado;
}

// ─── HANDLER 0: SALUDO ──────────────────────────────────────────────────
function handleSaludo(): ResultadoRouter {
  return {
    tipo: 'mensaje_directo',
    textoRespuesta: `¡Hola! 👋 Bienvenido/a 📚✏️\n\n¿En qué te podemos ayudar hoy? Puedes enviarnos la *foto o PDF de tu lista de útiles* 📸📄, o escribirnos directamente los materiales que necesitas para cotizártelos con nuestro inventario en stock.`,
    nuevoContexto: {
      historialMensajes: [],
      queryAcumulada: undefined,
      opcionesPresentadas: [],
      productoSeleccionado: null,
      cantidad: 1,
    },
  };
}

// ─── HANDLER 1: RESET ──────────────────────────────────────────────────
function handleReset(): ResultadoRouter {
  return {
    tipo: 'reset',
    textoRespuesta: `🔄 *Conversación reiniciada desde cero.* 📚\n\n¿En qué te podemos ayudar? Escribe el material que buscas o envíanos tu lista escolar en foto/PDF.`,
    nuevoContexto: {
      historialMensajes: [],
      queryAcumulada: undefined,
      opcionesPresentadas: [],
      productoSeleccionado: null,
      cantidad: 1,
    },
  };
}

// ─── HANDLER 2: CONFIRMACIÓN DE PEDIDO ─────────────────────────────────
async function handleConfirmacion(
  tenantId: string,
  clienteNombre: string,
  clienteTelefono: string,
  contextoPrevio?: RouterContexto
): Promise<ResultadoRouter> {
  const pedidoId = contextoPrevio?.pedidoId;
  const total = contextoPrevio?.total || 0;
  const pedidoNum = pedidoId ? `#${pedidoId.slice(-6)}` : '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://libreria-qr-brown.vercel.app';
  const linkPublico = `${appUrl}/pedir/${tenantId}?pedido=${pedidoId || ''}`;

  const texto = `🎉 *¡Pedido Confirmado con Éxito!* 🎉\nPedido ${pedidoNum}\n💰 Total: $${total.toFixed(2)}\n\n📄 *Ver tu proforma y pedido oficial:*\n${linkPublico}\n\n👩‍💼 _Un asesor de nuestra tienda ya fue notificado y coordinará contigo la entrega o retiro. ¡Muchas gracias!_`;

  return {
    tipo: 'pedido_confirmado',
    textoRespuesta: texto,
    nuevoContexto: {
      ...contextoPrevio,
      opcionesPresentadas: [],
      queryAcumulada: undefined,
    },
    pedidoId,
    total,
  };
}

// ─── HELPER: GENERAR COTIZACIÓN CON CARRITO PERSISTENTE ────────────────
async function generarRespuestaCotizacion(
  tenantId: string,
  clienteNombre: string,
  clienteTelefono: string,
  itemsCarrito: ItemCarrito[],
  contextoPrevio?: RouterContexto,
  textoClienteOriginal?: string
): Promise<ResultadoRouter> {
  const cotizacion = await cotizar(
    tenantId,
    itemsCarrito.map((i) => ({
      nombre: i.nombre,
      cantidad: i.cantidad,
      productoId: i.productoId,
    }))
  );

  const pedido = await crearPedido(cotizacion, clienteNombre, clienteTelefono, 'whatsapp');
  const pedidoNum = `#${pedido.id.slice(-6)}`;

  const itemsTexto = cotizacion.items
    .map((i) => `• [${i.cantidad}x] *${limpiarNombreERP(i.nombre)}* ($${i.precioUnitario.toFixed(2)})`)
    .join('\n');

  const sugerencia = generarSugerenciaVentaCruzada(cotizacion.items.map((i) => i.nombre));
  const textoSug = sugerencia ? sugerencia.textoSugerencia : '';

  // Responder preguntas frecuentes si el cliente las incluyó en su mensaje
  let extraNota = '';
  const textoMin = (textoClienteOriginal || '').toLowerCase();
  if (
    textoMin.includes('domicilio') ||
    textoMin.includes('entrega') ||
    textoMin.includes('envio') ||
    textoMin.includes('envían') ||
    textoMin.includes('envian')
  ) {
    extraNota += '\n\n🛵 *Entregas:* ¡Sí realizamos entregas a domicilio y también puedes retirar tu pedido directamente en nuestra tienda!';
  }
  if (
    textoMin.includes('local') ||
    textoMin.includes('direccion') ||
    textoMin.includes('dirección') ||
    textoMin.includes('donde estan') ||
    textoMin.includes('dónde están') ||
    textoMin.includes('ubicacion') ||
    textoMin.includes('ubicación')
  ) {
    extraNota += '\n\n📍 *Atención:* También te atendemos con gusto en nuestro local físico.';
  }

  // Si se cotizaron cuadernos sin especificar formato, agregar nota amigable de opciones
  const hayCuadernos = cotizacion.items.some((i) => i.nombre.toLowerCase().includes('cuaderno'));
  let notaOpciones = '';
  if (hayCuadernos && cotizacion.items.length > 1) {
    notaOpciones =
      '\n\n💡 *Opciones de Cuadernos:* Te cotizamos en modelo cosido económico. Si prefieres con espiral/anillado o de marcas específicas (Norma, Kiut, etc.), ¡avísanos y con gusto te damos las opciones!';
  }

  const texto = `📋 *Cotización de Útiles* 📋\nPedido ${pedidoNum}\n\n${itemsTexto}\n\n💰 *TOTAL ESTIMADO: $${cotizacion.total.toFixed(2)}*${textoSug}${extraNota}${notaOpciones}\n\n👉 *¿Deseas confirmar tu pedido?*\nResponde *SÍ* para confirmar o indícanos si deseas agregar o cambiar algo.`;

  return {
    tipo: 'cotizacion',
    textoRespuesta: texto,
    nuevoContexto: {
      ...contextoPrevio,
      pedidoId: pedido.id,
      total: cotizacion.total,
      itemsCount: cotizacion.items.length,
      carrito: cotizacion.items.map((i) => ({
        productoId: i.productoId,
        nombre: i.nombre,
        precioUnitario: i.precioUnitario,
        cantidad: i.cantidad,
      })),
      productoSeleccionado:
        cotizacion.items.length === 1
          ? {
              id: cotizacion.items[0].productoId,
              nombre: cotizacion.items[0].nombre,
              precio: cotizacion.items[0].precioUnitario,
            }
          : null,
      cantidad: cotizacion.items.length === 1 ? cotizacion.items[0].cantidad : 1,
      opcionesPresentadas: contextoPrevio?.opcionesPresentadas || [],
      queryAcumulada: contextoPrevio?.queryAcumulada,
    },
    pedidoId: pedido.id,
    total: cotizacion.total,
  };
}

// ─── HANDLER 3: LISTA COMPUESTA (Múltiples útiles) ─────────────────────
async function handleListaCompuesta(
  tenantId: string,
  clienteNombre: string,
  clienteTelefono: string,
  textoCliente: string,
  semantica: IntencionSemantica,
  contextoPrevio?: RouterContexto
): Promise<ResultadoRouter> {
  const items = semantica.items_lista || [];
  const cotizacion = await cotizar(tenantId, items);

  const itemsNuevos: ItemCarrito[] = cotizacion.items.map((i) => ({
    productoId: i.productoId,
    nombre: i.nombre,
    precioUnitario: i.precioUnitario,
    cantidad: i.cantidad,
  }));

  // Si ya había un carrito y los items semánticos eran adicionales, combinarlos
  let carritoFinal = itemsNuevos;
  if (contextoPrevio?.carrito && contextoPrevio.carrito.length > 0) {
    // Si la lista de la IA ya contiene los viejos, usarla; si no, fusionar
    const idsNuevos = new Set(itemsNuevos.map((i) => i.productoId));
    const viejosQueNoEstan = contextoPrevio.carrito.filter((v) => !idsNuevos.has(v.productoId));
    if (viejosQueNoEstan.length > 0 && itemsNuevos.length > 0) {
      carritoFinal = [
        ...contextoPrevio.carrito,
        ...itemsNuevos.filter((n) => !contextoPrevio.carrito!.some((c) => c.productoId === n.productoId)),
      ];
    }
  }

  return generarRespuestaCotizacion(tenantId, clienteNombre, clienteTelefono, carritoFinal, contextoPrevio, textoCliente);
}

// ─── HANDLER 4: SELECCIÓN O CORRECCIÓN DE OPCIÓN ───────────────────────
async function handleSeleccionOpcion(
  tenantId: string,
  clienteNombre: string,
  clienteTelefono: string,
  textoCliente: string,
  semantica: IntencionSemantica,
  contextoPrevio: RouterContexto | undefined,
  inventario: CandidatoProducto[]
): Promise<ResultadoRouter> {
  const opciones = contextoPrevio?.opcionesPresentadas || [];
  let seleccion: CandidatoProducto | null = null;

  // 1. Intentar por índice numérico de la IA
  if (semantica.opcion_elegida_index && semantica.opcion_elegida_index <= opciones.length) {
    seleccion = opciones[semantica.opcion_elegida_index - 1];
  }

  // 2. Intentar por nombre/marca/personaje en las opciones presentadas
  if (!seleccion && opciones.length > 0) {
    seleccion = resolverSeleccionOpcion(textoCliente, opciones);
  }

  const cantidad = semantica.cantidad_comprar || 1;
  const textoMin = textoCliente.toLowerCase().trim();
  const esAdicion =
    textoMin.startsWith('y ') ||
    textoMin.startsWith('también ') ||
    textoMin.startsWith('tambien ') ||
    textoMin.startsWith('agrega ') ||
    textoMin.startsWith('mas ') ||
    textoMin.includes('y tienes') ||
    textoMin.includes('y 3') ||
    textoMin.includes('y 2') ||
    textoMin.includes('y 1');

  let nuevoCarrito: ItemCarrito[] = contextoPrevio?.carrito ? [...contextoPrevio.carrito] : [];

  if (seleccion) {
    if (esAdicion && nuevoCarrito.length > 0) {
      // Agregar al carrito existente o actualizar si ya está
      const idxExistente = nuevoCarrito.findIndex((i) => i.productoId === seleccion!.id);
      if (idxExistente >= 0) {
        nuevoCarrito[idxExistente].cantidad += cantidad;
      } else {
        nuevoCarrito.push({
          productoId: seleccion.id,
          nombre: seleccion.nombre,
          precioUnitario: seleccion.precio,
          cantidad,
        });
      }
    } else {
      // Primer ítem o reemplazo directo
      nuevoCarrito = [
        {
          productoId: seleccion.id,
          nombre: seleccion.nombre,
          precioUnitario: seleccion.precio,
          cantidad: semantica.cantidad_comprar || contextoPrevio?.cantidad || 1,
        },
      ];
    }

    return generarRespuestaCotizacion(tenantId, clienteNombre, clienteTelefono, nuevoCarrito, contextoPrevio, textoCliente);
  }

  // 3. Si no hay selección nueva pero el usuario está corrigiendo cantidad (ej. "pero una docena")
  if (
    contextoPrevio?.productoSeleccionado &&
    !esAdicion &&
    (semantica.cantidad_comprar || textoMin.includes('docena') || textoMin.includes('ciento'))
  ) {
    const prod = contextoPrevio.productoSeleccionado;
    nuevoCarrito = [
      {
        productoId: prod.id,
        nombre: prod.nombre,
        precioUnitario: prod.precio,
        cantidad: semantica.cantidad_comprar || cantidad,
      },
    ];
    return generarRespuestaCotizacion(tenantId, clienteNombre, clienteTelefono, nuevoCarrito, contextoPrevio, textoCliente);
  }

  // Si no se encontró la opción, derivar a consulta general
  return handleConsultaProducto(
    tenantId,
    clienteNombre,
    clienteTelefono,
    textoCliente,
    semantica,
    contextoPrevio,
    inventario
  );
}

// ─── HANDLER 5: CONSULTA DE PRODUCTO Y VARIANTES CON AGENTE INTELIGENTE ───
async function handleConsultaProducto(
  tenantId: string,
  clienteNombre: string,
  clienteTelefono: string,
  textoCliente: string,
  semantica: IntencionSemantica,
  contextoPrevio: RouterContexto | undefined,
  inventario: CandidatoProducto[]
): Promise<ResultadoRouter> {
  const queryBusqueda =
    semantica.especificaciones_acumuladas ||
    semantica.producto_principal ||
    (contextoPrevio?.queryAcumulada ? `${contextoPrevio.queryAcumulada} ${textoCliente}` : textoCliente);

  const cantidad = semantica.cantidad_comprar || contextoPrevio?.cantidad || 1;
  const categoria = buscarCategoriaParaItem(queryBusqueda);
  const candidatosExactosRaw = filtrarCandidatosPorCategoria(categoria, queryBusqueda, inventario);
  const hayCoincidenciaExacta = candidatosExactosRaw.length > 0;

  // Si no hay coincidencia exacta de la búsqueda específica (ej. 200 hojas), buscar alternativas de la misma categoría
  let alternativasRaw: CandidatoProducto[] = [];
  if (!hayCoincidenciaExacta && categoria) {
    alternativasRaw = filtrarCandidatosPorCategoria(categoria, categoria.familia, inventario).slice(0, 10);
  }

  // IMPORTANTE: Ordenar por precio ANTES de pasarlos a la IA para que el índice
  // que la IA muestra (1️⃣, 2️⃣, 3️⃣) coincida EXACTAMENTE con el orden guardado en opcionesPresentadas.
  const candidatosExactos = [...candidatosExactosRaw].sort((a, b) => a.precio - b.precio);
  const alternativas = [...alternativasRaw].sort((a, b) => a.precio - b.precio);

  // Limpiar nombres de los candidatos para que la IA los vea impecables
  const candidatosLimpios = candidatosExactos.map((c) => ({
    id: c.id,
    nombre: limpiarNombreERP(c.nombre),
    precio: c.precio,
  }));

  const alternativasLimpias = alternativas.map((c) => ({
    id: c.id,
    nombre: limpiarNombreERP(c.nombre),
    precio: c.precio,
  }));

  const historial = contextoPrevio?.historialMensajes || [];

  // Llamar al Agente de Ventas con verificación de stock real y alternativas
  const respVentas = await generarRespuestaVentas(
    historial,
    textoCliente,
    candidatosLimpios,
    alternativasLimpias,
    hayCoincidenciaExacta
  );

  const listaOpciones = hayCoincidenciaExacta ? candidatosExactos : alternativas;

  // Si el agente detecta que el cliente ya eligió una opción clara
  if (
    respVentas.accion === 'COTIZAR_PEDIDO' &&
    respVentas.producto_elegido_index &&
    respVentas.producto_elegido_index <= listaOpciones.length
  ) {
    const itemElegido = listaOpciones[respVentas.producto_elegido_index - 1] || listaOpciones[0];
    const cantFinal = respVentas.cantidad || cantidad;
    const itemCarrito: ItemCarrito = {
      productoId: itemElegido.id,
      nombre: itemElegido.nombre,
      precioUnitario: itemElegido.precio,
      cantidad: cantFinal,
    };

    return generarRespuestaCotizacion(tenantId, clienteNombre, clienteTelefono, [itemCarrito], {
      ...contextoPrevio,
      opcionesPresentadas: listaOpciones,
    });
  }

  // Si es conversación, duda o pregunta sobre opciones
  // Guardar TODAS las opciones para que el índice del usuario coincida con el orden de la IA
  return {
    tipo: 'pregunta_variante',
    textoRespuesta: respVentas.mensaje_whatsapp,
    nuevoContexto: {
      queryAcumulada: queryBusqueda,
      cantidad,
      opcionesPresentadas: listaOpciones,
      productoSeleccionado: null,
      carrito: contextoPrevio?.carrito,
    },
  };
}

