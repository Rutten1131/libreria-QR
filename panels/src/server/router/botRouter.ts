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
  esItemEspecifico,
  norm,
  CandidatoProducto,
} from '../services/variantService';
import {
  interpretarIntencionSemantica,
  IntencionSemantica,
  generarRespuestaVentas,
} from '../adapters/iaAdapter';
import { buscarCategoriaParaItem } from '../knowledge/index';
import { limpiarNombreERP, generarSugerenciaVentaCruzada } from '../services/displayService';
import { buscarImagenProducto } from '../services/productImageService';

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

export interface ItemPendiente {
  itemRaw: string;
  cantidad: number;
}

export interface RouterContexto {
  queryAcumulada?: string;
  cantidad?: number;
  opcionesPresentadas?: CandidatoProducto[];
  productoSeleccionado?: CandidatoProducto | null;
  historialMensajes?: MensajeHistorial[];
  pedidoId?: string;
  total?: number;
  itemsCount?: number;
  carrito?: ItemCarrito[];
  colaPendientes?: ItemPendiente[];
  itemEnProceso?: ItemPendiente | null;
}

export interface ResultadoRouter {
  tipo: 'mensaje_directo' | 'pregunta_variante' | 'cotizacion' | 'pedido_confirmado' | 'reset';
  textoRespuesta: string;
  imagenUrl?: string;
  imagenBase64?: string;
  imagenMimeType?: 'image/jpeg' | 'image/png';
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
  contextoPrevio?: RouterContexto,
  nombreNegocio: string = 'Santiago Papelería'
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

  // Saludo puro directo (evita confusión con títulos de productos como "Buenas Noches")
  const textoMin = textoLimpio.toLowerCase().trim().replace(/[.,!¡?¿]/g, '');
  const saludosPuros = ['hola', 'buenas', 'buenas tardes', 'buenos dias', 'buenos días', 'buenas noches', 'que tal', 'saludos'];
  if (saludosPuros.includes(textoMin)) {
    return handleSaludo();
  }

  // 2. Clasificación Semántica por IA
  const semantica = await interpretarIntencionSemantica(
    textoLimpio,
    resumenHistorial,
    opcionesActivas
  );

  // Si hay opciones activas en pantalla y el cliente está seleccionando una de ellas (ej. "stitch", "el 4"), confirmar SELECCION_OPCION
  if (
    opcionesActivas.length > 0 &&
    semantica.intencion !== 'REINICIAR' &&
    semantica.intencion !== 'SALUDO' &&
    semantica.intencion !== 'CONSULTA_PRODUCTO' &&
    semantica.intencion !== 'LISTA_COMPUESTA'
  ) {
    const matchDirecto = resolverSeleccionOpcion(textoLimpio, opcionesActivas);
    if (matchDirecto) {
      semantica.intencion = 'SELECCION_OPCION';
    }
  }

  // ─── REGLAS DETERMINÍSTICAS (corrigen comportamientos de la IA cuando falla) ───

  // R1: Si el producto_principal es null, recuperarlo del contexto previo
  if (!semantica.producto_principal && !semantica.especificaciones_acumuladas && contextoPrevio?.queryAcumulada) {
    semantica.especificaciones_acumuladas = contextoPrevio.queryAcumulada;
  }

  // R1.8: Consulta de total o resumen de carrito activo ("¿cuánto llevo?", "¿cuánto es en total?")
  const textoNormQ = textoMin.replace(/[¿?¡!]/g, '').trim();
  const pideTotal = /^(cu[aá]nto llevo|cu[aá]nto va|cu[aá]nto es (?:en total|el total)|cu[aá]l es el total|total|mi pedido|resumen|cu[aá]nto ser[íi]a en total|total pedido)/i.test(textoNormQ);
  if (pideTotal && contextoPrevio?.carrito?.length) {
    return generarRespuestaCotizacion(tenantId, clienteNombre, clienteTelefono, contextoPrevio.carrito, contextoPrevio, textoCliente);
  }

  // R2: Detectar "No, mejor N" / "solo N" / "mejor ponme N" → cambio de cantidad sobre producto activo en contexto
  // NOTA CRÍTICA: Solo se aplica si NO hay opciones activas en pantalla (para no interferir con selecciones tipo "2", "3")
  const matchCambioQty = textoNormQ.match(/^(?:no,?\s*)?(?:mejor|solo|son|dame|quiero|ponme|cambiar?|cambi[aá]me?)\s+(\d+)$|^(\d+)\s*(?:nomas?|no mas?|mejor)$/i);
  const matchCantNum = textoNormQ.match(/^\d+$/);
  if (
    contextoPrevio?.carrito?.length &&
    opcionesActivas.length === 0 &&
    (matchCambioQty || matchCantNum) &&
    semantica.intencion !== 'LISTA_COMPUESTA'
  ) {
    const nuevaCantidad = parseInt(matchCambioQty?.[1] || matchCambioQty?.[2] || textoNormQ, 10);
    if (!isNaN(nuevaCantidad) && nuevaCantidad > 0) {
      // Rehacer cotización con la cantidad cambiada
      const carritoActual = contextoPrevio.carrito;
      const ultimoItem = carritoActual[carritoActual.length - 1];
      if (ultimoItem) {
        const nuevoCarrito = [
          ...carritoActual.slice(0, -1),
          { ...ultimoItem, cantidad: nuevaCantidad }
        ];
        return generarRespuestaCotizacion(tenantId, clienteNombre, clienteTelefono, nuevoCarrito, contextoPrevio, textoCliente);
      }
    }
  }

  // R2.5: Si hay opciones activas en pantalla y el cliente dice "Bueno dame 2 tijeras", "dame 2 cuadernos"
  const matchDirectoQty = textoNormQ.match(/^(?:bueno\s+)?(?:dame|ponme|quiero|llevo|agrega)\s+(\d+)\s+([a-zñáéíóú]+)/i);
  if (matchDirectoQty && opcionesActivas.length > 0) {
    const cantDirecta = parseInt(matchDirectoQty[1], 10);
    const prodMencionado = norm(matchDirectoQty[2]);
    const opcionElegida = opcionesActivas.find(o => norm(o.nombre).includes(prodMencionado.replace(/(es|s)$/, ''))) || opcionesActivas[0];
    if (opcionElegida && !isNaN(cantDirecta) && cantDirecta > 0) {
      const nuevoCarrito = [
        ...(contextoPrevio?.carrito || []),
        {
          productoId: opcionElegida.id,
          nombre: opcionElegida.nombre,
          precioUnitario: opcionElegida.precio,
          cantidad: cantDirecta
        }
      ];
      return generarRespuestaCotizacion(tenantId, clienteNombre, clienteTelefono, nuevoCarrito, contextoPrevio, textoCliente);
    }
  }

  // R3: "¿Cuánto cuesta?" / "¿Qué precio tiene?" con opciones presentadas → responder con precios
  // Solo activa si las opciones coinciden con lo que el cliente preguntó previamente
  const preguntaPrecio = /^(cu[aá]nto cuesta|cu[aá]nto vale|cu[aá]l es el precio|qu[eé] precio|a cu[aá]nto est[aá])/i.test(textoNormQ);
  if (preguntaPrecio && opcionesActivas.length > 0 && contextoPrevio?.queryAcumulada) {
    // Verificar que las opciones activas son relevantes al tema de la conversación
    const queryCtx = norm(contextoPrevio.queryAcumulada);
    const opcionesRelevantes = opcionesActivas.some((o) => {
      const oNorm = norm(o.nombre);
      return queryCtx.split(' ').filter(w => w.length > 3).some(w => oNorm.includes(w));
    });
    if (opcionesRelevantes) {
      const precios = opcionesActivas
        .slice(0, 10)
        .map((o, i) => `${i + 1}️⃣ *${limpiarNombreERP(o.nombre)}* — $${o.precio.toFixed(2)} c/u`)
        .join('\n');
      return {
        tipo: 'pregunta_variante',
        textoRespuesta: `¡Aquí los precios disponibles! 💰\n\n${precios}\n\n¿Cuál te interesa?`,
        nuevoContexto: { ...contextoPrevio, historialMensajes: historial },
      };
    }
  }

  // R4: Confirmación determinística si el cliente responde "sí", "confirmo", "confirmado", "confirmar", "dale", "listo", "de acuerdo", etc. teniendo una cotización activa Y sin ítems pendientes
  const esConfirmacion = /^(s[ií]|confirmo|confirmado|confirmada|confirmar|si confirmo|s[ií] confirmo|s[ií] confirmado|confirmo el pedido|confirmado el pedido|confirmo mi compra|confirmado mi pedido|dale|de acuerdo|listo|perfecto|de una|ok|proceder|quiero comprar|hagan el pedido|hacer pedido|si deseo confirmar|deseo confirmar)/i.test(textoNormQ);
  if (esConfirmacion && (contextoPrevio?.pedidoId || (contextoPrevio?.carrito && contextoPrevio.carrito.length > 0)) && (!contextoPrevio?.colaPendientes || contextoPrevio.colaPendientes.length === 0)) {
    return await handleConfirmacion(tenantId, clienteNombre, clienteTelefono, contextoPrevio);
  }

  // R5: Multi-selección determinística ("uno de cada uno", "ambos", "los dos", "el 1 y el 2")
  const esMultiSeleccion = /\b(uno de cada uno|uno de cada|ambos|los dos|las dos|1 de cada uno|1 de cada|el 1 y el 2|la 1 y la 2|dame los dos|dame ambos|dame las dos|los 2|las 2)\b/i.test(textoNormQ);
  if (esMultiSeleccion && opcionesActivas.length >= 2) {
    // Forzar SELECCION_OPCION con opciones_elegidas para todas las opciones presentadas
    semantica.intencion = 'SELECCION_OPCION';
    semantica.opciones_elegidas = opcionesActivas.map((_, i) => ({ index: i + 1, cantidad: 1 }));
    semantica.opcion_elegida_index = null;
  }

  // R6: Reclamación de ítems pendientes ("faltan los lápices", "y los lápices?", "no me cotizaste los borradores")
  // Si hay cola pendiente y el LLM quiere reiniciar como LISTA_COMPUESTA, mejor continuar la cola
  if (
    semantica.intencion === 'LISTA_COMPUESTA' &&
    contextoPrevio?.colaPendientes &&
    contextoPrevio.colaPendientes.length > 0
  ) {
    // No reiniciar — continuar procesando la cola existente
    const cola = contextoPrevio.colaPendientes;
    const [siguiente, ...restoCola] = cola;
    return procesarSiguienteOFinalizar(
      tenantId, clienteNombre, clienteTelefono,
      contextoPrevio.carrito || [],
      { ...contextoPrevio, colaPendientes: restoCola },
      inventario, nombreNegocio,
      undefined, undefined
    );
  }

  // ─── FIN REGLAS DETERMINÍSTICAS ───────────────────────────────────────────────

  console.log(`[BotRouter] Intención: ${semantica.intencion} | Prod: ${semantica.producto_principal} | Cant: ${semantica.cantidad_comprar} | OptIndex: ${semantica.opcion_elegida_index}`);

  let resultado: ResultadoRouter;

  // 3. Despacho modular a handlers según la intención
  switch (semantica.intencion) {
    case 'REINICIAR':
      resultado = handleReset(nombreNegocio);
      break;

    case 'SALUDO':
      resultado = handleSaludo(nombreNegocio);
      break;

    case 'CONFIRMACION':
      if (contextoPrevio?.colaPendientes && contextoPrevio.colaPendientes.length > 0) {
        resultado = await handleSeleccionOpcion(
          tenantId,
          clienteNombre,
          clienteTelefono,
          textoLimpio,
          {
            ...semantica,
            intencion: 'SELECCION_OPCION',
            opcion_elegida_index: semantica.opcion_elegida_index || 1,
          },
          contextoPrevio,
          inventario,
          nombreNegocio
        );
      } else if (contextoPrevio?.pedidoId || (contextoPrevio?.carrito && contextoPrevio.carrito.length > 0)) {
        resultado = await handleConfirmacion(tenantId, clienteNombre, clienteTelefono, contextoPrevio);
      } else {
        resultado = handleSaludo(nombreNegocio);
      }
      break;

    case 'LISTA_COMPUESTA':
      resultado = await handleListaCompuesta(tenantId, clienteNombre, clienteTelefono, textoLimpio, semantica, contextoPrevio, inventario, nombreNegocio);
      break;

    case 'SELECCION_OPCION':
      resultado = await handleSeleccionOpcion(
        tenantId,
        clienteNombre,
        clienteTelefono,
        textoLimpio,
        semantica,
        contextoPrevio,
        inventario,
        nombreNegocio
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
        inventario,
        nombreNegocio
      );
      break;
  }

  // 4. Actualizar historial de mensajes (manteniendo últimos 8)
  const nuevoHistorial: MensajeHistorial[] = [
    ...historial.slice(-7),
    { role: 'user', texto: textoLimpio },
    { role: 'model', texto: resultado.textoRespuesta },
  ];

  return {
    ...resultado,
    nuevoContexto: {
      ...resultado.nuevoContexto,
      historialMensajes: nuevoHistorial,
    },
  };
}

// ─── HANDLER 0: SALUDO ──────────────────────────────────────────────────
function handleSaludo(nombreNegocio: string = 'Santiago Papelería'): ResultadoRouter {
  return {
    tipo: 'mensaje_directo',
    textoRespuesta: `¡Hola! 👋 Bienvenido/a a *${nombreNegocio}* 📚✏️\n\n¿En qué te podemos ayudar hoy? Puedes enviarnos la *foto o PDF de tu lista de útiles* 📸📄, o escribirnos directamente los materiales que necesitas para cotizártelos con nuestro inventario en stock.`,
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
function handleReset(nombreNegocio: string = 'Santiago Papelería'): ResultadoRouter {
  return {
    tipo: 'reset',
    textoRespuesta: `🔄 *Conversación reiniciada desde cero.* 📚\n\nBienvenido/a a *${nombreNegocio}*. ¿En qué te podemos ayudar? Escribe el material que buscas o envíanos tu lista escolar en foto/PDF.`,
    nuevoContexto: {
      historialMensajes: [],
      queryAcumulada: undefined,
      opcionesPresentadas: [],
      productoSeleccionado: null,
      cantidad: 1,
      colaPendientes: [],
      itemEnProceso: null,
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
  let pedidoId = contextoPrevio?.pedidoId;
  let total = contextoPrevio?.total || 0;

  // Si no había pedidoId pero hay un carrito con productos, crear el pedido en BD
  if (!pedidoId && contextoPrevio?.carrito && contextoPrevio.carrito.length > 0) {
    try {
      const cotizacion = await cotizar(
        tenantId,
        contextoPrevio.carrito.map((i) => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          productoId: i.productoId,
        }))
      );
      const pedido = await crearPedido(cotizacion, clienteNombre, clienteTelefono, 'whatsapp');
      pedidoId = pedido.id;
      total = cotizacion.total;
    } catch (e: any) {
      console.error('[BotRouter] Error al crear pedido en confirmacion:', e?.message);
    }
  }

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

// ─── HANDLER 3: LISTA COMPUESTA (Múltiples útiles — Consultivo Paso a Paso) ─
async function handleListaCompuesta(
  tenantId: string,
  clienteNombre: string,
  clienteTelefono: string,
  textoCliente: string,
  semantica: IntencionSemantica,
  contextoPrevio: RouterContexto | undefined,
  inventario: CandidatoProducto[],
  nombreNegocio: string = 'Santiago Papelería'
): Promise<ResultadoRouter> {
  const items = semantica.items_lista || [];
  if (items.length === 0) {
    return handleSaludo(nombreNegocio);
  }

  // 1. Clasificar ítems en Específicos (match directo a carrito) y Generales (ciclo consultivo)
  let nuevoCarrito: ItemCarrito[] = contextoPrevio?.carrito ? [...contextoPrevio.carrito] : [];
  const itemsGenerales: ItemPendiente[] = [];
  const itemsAutoAgregados: string[] = [];

  for (const item of items) {
    const cat = buscarCategoriaParaItem(item.nombre);
    const esEsp = esItemEspecifico(item.nombre, cat);

    if (esEsp) {
      const candidatos = filtrarCandidatosPorCategoria(cat, item.nombre, inventario);
      if (candidatos.length > 0) {
        const mejorMatch = candidatos[0];
        const idxExistente = nuevoCarrito.findIndex((i) => i.productoId === mejorMatch.id);
        if (idxExistente >= 0) {
          nuevoCarrito[idxExistente].cantidad += item.cantidad;
        } else {
          nuevoCarrito.push({
            productoId: mejorMatch.id,
            nombre: mejorMatch.nombre,
            precioUnitario: mejorMatch.precio,
            cantidad: item.cantidad,
          });
        }
        itemsAutoAgregados.push(`${item.cantidad}x ${limpiarNombreERP(mejorMatch.nombre)}`);
        continue;
      }
    }

    // Es general o no hubo coincidencia unívoca -> entra a la cola consultiva
    itemsGenerales.push({ itemRaw: item.nombre, cantidad: item.cantidad });
  }

  // 2. Si TODOS los ítems eran específicos y se añadieron al carrito:
  if (itemsGenerales.length === 0 && nuevoCarrito.length > 0) {
    return generarRespuestaCotizacion(
      tenantId,
      clienteNombre,
      clienteTelefono,
      nuevoCarrito,
      {
        ...contextoPrevio,
        colaPendientes: [],
        itemEnProceso: null,
      },
      textoCliente
    );
  }

  // 3. Si hay ítems generales pendientes:
  const [primero, ...resto] = itemsGenerales;
  const colaExistente = contextoPrevio?.colaPendientes || [];
  // Preservar la cola existente si el usuario estaba desglosando o corrigiendo un ítem
  const colaPendientes: ItemPendiente[] = [
    ...resto,
    ...colaExistente,
  ];
  const itemEnProceso: ItemPendiente = primero;

  // Construir mensaje introductorio claro y ordenado
  const listaTexto = items.map((i, idx) => `${idx + 1}. ${i.cantidad}x ${i.nombre}`).join('\n');
  const notaAgregados = itemsAutoAgregados.length > 0
    ? `✅ *Agregados directamente al pedido:*\n${itemsAutoAgregados.map((a) => `• ${a}`).join('\n')}\n\n`
    : '';

  const introMsg = `📋 ¡Perfecto! Vamos a armar tu pedido paso a paso:\n${listaTexto}\n\n${notaAgregados}Empecemos con *${primero.itemRaw}* (${primero.cantidad} unidades):`;

  const semanticaPrimero: IntencionSemantica = {
    intencion: 'CONSULTA_PRODUCTO',
    producto_principal: primero.itemRaw,
    especificaciones_acumuladas: primero.itemRaw,
    cantidad_comprar: primero.cantidad,
    opcion_elegida_index: null,
  };

  const resPrimero = await handleConsultaProducto(
    tenantId, clienteNombre, clienteTelefono,
    primero.itemRaw, semanticaPrimero, contextoPrevio, inventario, nombreNegocio
  );

  return {
    ...resPrimero,
    textoRespuesta: `${introMsg}\n\n${resPrimero.textoRespuesta}`,
    nuevoContexto: {
      ...resPrimero.nuevoContexto,
      colaPendientes,
      itemEnProceso,
      carrito: nuevoCarrito,
    },
  };
}

// ─── PROCESAR SIGUIENTE ITEM DE LA COLA O FINALIZAR COTIZACIÓN ─────────
async function procesarSiguienteOFinalizar(
  tenantId: string,
  clienteNombre: string,
  clienteTelefono: string,
  carritoActualizado: ItemCarrito[],
  contextoPrevio: RouterContexto | undefined,
  inventario: CandidatoProducto[],
  nombreNegocio: string = 'Santiago Papelería',
  ultimoItemAgregadoNombre?: string,
  ultimoItemCantidad?: number
): Promise<ResultadoRouter> {
  const cola = contextoPrevio?.colaPendientes || [];

  // Si aún quedan ítems en la cola por resolver:
  if (cola.length > 0) {
    const [siguiente, ...restoCola] = cola;
    const semanticaSig: IntencionSemantica = {
      intencion: 'CONSULTA_PRODUCTO',
      producto_principal: siguiente.itemRaw,
      especificaciones_acumuladas: siguiente.itemRaw,
      cantidad_comprar: siguiente.cantidad,
      opcion_elegida_index: null,
    };

    const resSiguiente = await handleConsultaProducto(
      tenantId,
      clienteNombre,
      clienteTelefono,
      siguiente.itemRaw,
      semanticaSig,
      {
        ...contextoPrevio,
        carrito: carritoActualizado,
        colaPendientes: restoCola,
        itemEnProceso: siguiente,
        queryAcumulada: undefined,
        opcionesPresentadas: [],
      },
      inventario,
      nombreNegocio
    );

    const checkNote = ultimoItemAgregadoNombre
      ? `✅ Agregado: *${limpiarNombreERP(ultimoItemAgregadoNombre)}* (${ultimoItemCantidad || 1} u.) al pedido.\n\nAhora vamos con *${siguiente.itemRaw}* (${siguiente.cantidad} unidades):\n\n`
      : '';

    return {
      ...resSiguiente,
      textoRespuesta: `${checkNote}${resSiguiente.textoRespuesta}`,
      nuevoContexto: {
        ...resSiguiente.nuevoContexto,
        carrito: carritoActualizado,
        colaPendientes: restoCola,
        itemEnProceso: siguiente,
      },
    };
  }

  // Si la cola está vacía, emitir la cotización / proforma final con todo el carrito
  return generarRespuestaCotizacion(
    tenantId,
    clienteNombre,
    clienteTelefono,
    carritoActualizado,
    {
      ...contextoPrevio,
      colaPendientes: [],
      itemEnProceso: null,
    },
    ultimoItemAgregadoNombre || ''
  );
}

// ─── HANDLER 4: SELECCIÓN O CORRECCIÓN DE OPCIÓN ───────────────────────
async function handleSeleccionOpcion(
  tenantId: string,
  clienteNombre: string,
  clienteTelefono: string,
  textoCliente: string,
  semantica: IntencionSemantica,
  contextoPrevio: RouterContexto | undefined,
  inventario: CandidatoProducto[],
  nombreNegocio: string = 'Santiago Papelería'
): Promise<ResultadoRouter> {
  const opciones = contextoPrevio?.opcionesPresentadas || [];
  const textoMin = textoCliente.toLowerCase().trim();

  // ──── 0. MULTI-SELECCIÓN ("uno de cada uno", "ambos", "los dos") ────
  // Detectar por regex local O por opciones_elegidas del LLM
  const esMultiLocal = /\b(uno de cada uno|uno de cada|ambos|los dos|las dos|1 de cada uno|1 de cada|el 1 y el 2|la 1 y la 2|dame los dos|dame ambos|dame las dos|los 2|las 2)\b/i.test(textoMin);
  const multiOpciones = semantica.opciones_elegidas && semantica.opciones_elegidas.length >= 2
    ? semantica.opciones_elegidas
    : esMultiLocal && opciones.length >= 2
      ? opciones.map((_, i) => ({ index: i + 1, cantidad: 1 }))
      : null;

  if (multiOpciones && opciones.length >= 2) {
    let nuevoCarrito: ItemCarrito[] = contextoPrevio?.carrito ? [...contextoPrevio.carrito] : [];
    let totalAgregado = 0;
    const nombresAgregados: string[] = [];

    for (const oe of multiOpciones) {
      if (oe.index >= 1 && oe.index <= opciones.length) {
        const opcion = opciones[oe.index - 1];
        const cantAgregar = oe.cantidad || 1;
        const idxExistente = nuevoCarrito.findIndex((i) => i.productoId === opcion.id);
        if (idxExistente >= 0) {
          nuevoCarrito[idxExistente].cantidad += cantAgregar;
        } else {
          nuevoCarrito.push({
            productoId: opcion.id,
            nombre: opcion.nombre,
            precioUnitario: opcion.precio,
            cantidad: cantAgregar,
          });
        }
        totalAgregado += cantAgregar;
        nombresAgregados.push(limpiarNombreERP(opcion.nombre));
      }
    }

    // Ajustar cola: si itemEnProceso pedía N y se agregaron N, no re-encolar; si menos, re-encolar restante
    let colaActualizada = contextoPrevio?.colaPendientes ? [...contextoPrevio.colaPendientes] : [];
    const cantidadEnProceso = contextoPrevio?.itemEnProceso?.cantidad || totalAgregado;
    if (contextoPrevio?.itemEnProceso && cantidadEnProceso > totalAgregado) {
      const cantRestante = cantidadEnProceso - totalAgregado;
      colaActualizada.unshift({
        itemRaw: contextoPrevio.itemEnProceso.itemRaw,
        cantidad: cantRestante,
      });
    }

    return procesarSiguienteOFinalizar(
      tenantId, clienteNombre, clienteTelefono,
      nuevoCarrito,
      { ...contextoPrevio, colaPendientes: colaActualizada },
      inventario, nombreNegocio,
      nombresAgregados.join(' + '),
      totalAgregado
    );
  }

  // ──── 1. SELECCIÓN INDIVIDUAL ────
  let seleccion: CandidatoProducto | null = null;

  // 1a. Intentar por índice numérico de la IA
  if (semantica.opcion_elegida_index && semantica.opcion_elegida_index <= opciones.length) {
    seleccion = opciones[semantica.opcion_elegida_index - 1];
  }

  // 1b. Intentar por nombre/marca/personaje en las opciones presentadas
  if (!seleccion && opciones.length > 0) {
    seleccion = resolverSeleccionOpcion(textoCliente, opciones);
  }

  // CANTIDAD:
  // Si el usuario confirma o selecciona una opción individual de un ítem que pedía varias unidades
  // (ej. el cliente pidió 2 esferos pero está resolviendo 1 azul y luego 1 negro):
  const textoEsNumeroSolo = /^\d+$/.test(textoCliente.trim());
  let cantidad = 1;
  if (!textoEsNumeroSolo && semantica.cantidad_comprar && semantica.cantidad_comprar > 1) {
    cantidad = semantica.cantidad_comprar;
  } else if (contextoPrevio?.itemEnProceso?.cantidad === 1) {
    cantidad = 1;
  } else if (
    opciones.length === 1 &&
    (/^(si|s[ií]|dale|ese|bueno|claro|por\s*favor|porfavor|an[oó]talo|de una|ok)/i.test(textoMin) ||
      textoMin === '1' ||
      textoMin === 'la 1' ||
      textoMin === 'el 1')
  ) {
    // El bot preguntó por 1 modelo específico (ej. "¿Te llevamos este Bic azul?"), consumir 1 unidad
    cantidad = 1;
  } else if (contextoPrevio?.itemEnProceso?.cantidad) {
    cantidad = contextoPrevio.itemEnProceso.cantidad;
  } else {
    cantidad = 1;
  }

  const esAdicion =
    Boolean(contextoPrevio?.colaPendientes?.length) ||
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
    if (nuevoCarrito.length > 0) {
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
      // Primer ítem del carrito
      nuevoCarrito = [
        {
          productoId: seleccion.id,
          nombre: seleccion.nombre,
          precioUnitario: seleccion.precio,
          cantidad,
        },
      ];
    }

    const cantidadEnProceso = contextoPrevio?.itemEnProceso?.cantidad || cantidad;
    let colaActualizada = contextoPrevio?.colaPendientes ? [...contextoPrevio.colaPendientes] : [];

    // Si el usuario pidió varios (ej. 2 esferos) pero solo seleccionó 1 (ej. el azul),
    // encolar el restante para que el bot pregunte por el otro color/modelo antes de pasar a los siguientes ítems
    if (contextoPrevio?.itemEnProceso && cantidadEnProceso > cantidad) {
      const cantRestante = cantidadEnProceso - cantidad;
      const nombreRestante = contextoPrevio.itemEnProceso.itemRaw;
      colaActualizada.unshift({
        itemRaw: `${nombreRestante}`,
        cantidad: cantRestante,
      });
    }

    return procesarSiguienteOFinalizar(
      tenantId,
      clienteNombre,
      clienteTelefono,
      nuevoCarrito,
      {
        ...contextoPrevio,
        colaPendientes: colaActualizada,
      },
      inventario,
      nombreNegocio,
      seleccion.nombre,
      cantidad
    );
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
    return procesarSiguienteOFinalizar(
      tenantId,
      clienteNombre,
      clienteTelefono,
      nuevoCarrito,
      contextoPrevio,
      inventario,
      nombreNegocio,
      prod.nombre,
      semantica.cantidad_comprar || cantidad
    );
  }

  // Si no se encontró la opción, derivar a consulta general
  return handleConsultaProducto(
    tenantId,
    clienteNombre,
    clienteTelefono,
    textoCliente,
    semantica,
    contextoPrevio,
    inventario,
    nombreNegocio
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
  inventario: CandidatoProducto[],
  nombreNegocio: string = 'Santiago Papelería'
): Promise<ResultadoRouter> {
  const queryBusqueda =
    semantica.especificaciones_acumuladas ||
    semantica.producto_principal ||
    (contextoPrevio?.queryAcumulada ? `${contextoPrevio.queryAcumulada} ${textoCliente}` : textoCliente);

  const cantidad = semantica.cantidad_comprar || contextoPrevio?.itemEnProceso?.cantidad || contextoPrevio?.cantidad || 1;
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

  // Limpiar nombres de los candidatos para que la IA los vea impecables (máximo 5 opciones)
  const candidatosLimpios = candidatosExactos.slice(0, 5).map((c) => ({
    id: c.id,
    nombre: limpiarNombreERP(c.nombre),
    precio: c.precio,
  }));

  const alternativasLimpias = alternativas.slice(0, 5).map((c) => ({
    id: c.id,
    nombre: limpiarNombreERP(c.nombre),
    precio: c.precio,
  }));

  const historial = contextoPrevio?.historialMensajes || [];

  // Si no hay productos ni alternativas en stock, responder directamente sin alucinar
  if (candidatosExactos.length === 0 && alternativas.length === 0) {
    return {
      tipo: 'mensaje_directo',
      textoRespuesta: `Por el momento no disponemos de ese producto en stock 😅. ¿Te gustaría consultar por algún otro material escolar o de oficina?`,
      nuevoContexto: {
        ...contextoPrevio,
        historialMensajes: [
          ...historial.slice(-7),
          { role: 'user', texto: textoCliente },
          { role: 'model', texto: `Por el momento no disponemos de ese producto en stock 😅. ¿Te gustaría consultar por algún otro material escolar o de oficina?` },
        ],
      },
    };
  }

  // Llamar al Agente de Ventas con verificación de stock real y alternativas
  const respVentas = await generarRespuestaVentas(
    historial,
    textoCliente,
    candidatosLimpios,
    alternativasLimpias,
    hayCoincidenciaExacta,
    nombreNegocio
  );

  // 1. Extraer los productos que la IA realmente presentó en su mensaje
  let listaOpciones: CandidatoProducto[] = [];

  if (respVentas.opciones_presentadas_ids && respVentas.opciones_presentadas_ids.length > 0) {
    for (const id of respVentas.opciones_presentadas_ids) {
      const prod = inventario.find((p) => p.id === id);
      if (prod && !listaOpciones.some((p) => p.id === prod.id)) {
        listaOpciones.push(prod);
      }
    }
  }

  // Fallback: extraer por nombres mencionados en mensajeFinal
  if (listaOpciones.length === 0 && respVentas.mensaje_whatsapp) {
    const pool = hayCoincidenciaExacta ? candidatosExactos : alternativas;
    for (const cand of pool) {
      const nomLimpio = norm(limpiarNombreERP(cand.nombre)).slice(0, 14);
      if (norm(respVentas.mensaje_whatsapp).includes(nomLimpio)) {
        if (!listaOpciones.some((o) => o.id === cand.id)) {
          listaOpciones.push(cand);
        }
      }
    }
  }

  if (listaOpciones.length === 0) {
    listaOpciones = (hayCoincidenciaExacta ? candidatosExactos : alternativas).slice(0, 5);
  }

  // Formatear mensaje final garantizando que nunca sea nulo o vacío
  let mensajeFinal = respVentas.mensaje_whatsapp;
  if (!mensajeFinal || mensajeFinal.trim().length === 0) {
    if (listaOpciones.length > 0) {
      const opts = listaOpciones
        .slice(0, 6)
        .map((o, i) => `${i + 1}️⃣ *${limpiarNombreERP(o.nombre)}* — $${o.precio.toFixed(2)} c/u`)
        .join('\n');
      mensajeFinal = `Tenemos estas opciones disponibles en stock:\n\n${opts}\n\n¿Cuál de estas opciones te gustaría llevar?`;
    } else {
      mensajeFinal = `Por el momento no disponemos de ese producto específico en stock 😅. ¿Te gustaría consultar por algún otro material escolar o de oficina?`;
    }
  }

  // Buscar si existe imagen para el producto u opciones consultadas
  const productoParaImagen = listaOpciones[0]?.nombre || queryBusqueda;
  const imagenInfo = buscarImagenProducto(productoParaImagen);

  // Guardar EXACTAMENTE las opciones presentadas para que el índice coincida al 100% con la elección del usuario
  return {
    tipo: 'pregunta_variante',
    textoRespuesta: mensajeFinal,
    imagenUrl: imagenInfo?.url,
    imagenBase64: imagenInfo?.base64,
    imagenMimeType: imagenInfo?.mimeType,
    nuevoContexto: {
      queryAcumulada: queryBusqueda,
      cantidad,
      opcionesPresentadas: listaOpciones,
      productoSeleccionado: null,
      carrito: contextoPrevio?.carrito,
      colaPendientes: contextoPrevio?.colaPendientes,
      itemEnProceso: contextoPrevio?.itemEnProceso,
    },
  };
}

