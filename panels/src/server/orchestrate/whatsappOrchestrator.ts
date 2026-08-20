// Orquestador del flujo WhatsApp de un cliente.
// Pasos del PRD A.4 Canal 1:
//   1. Identificacion de tenant (por QR o numero) -- resuelto fuera de este modulo
//   2. Cliente envia lista (foto, texto o PDF)
//   3. OCR transcribe sin resumir
//   4. Cliente confirma o corrige transcripcion
//   5. Matching: alta vs baja confianza
//   6. Cotizacion preliminar
//   7. Resolucion de ambiguedades; si no, escala a humano
//   8. Cotizacion final + confirmacion de compra
//   9. Cobro (transferencia o efectivo contra entrega)
//   10. Verificacion humana de pago (no automatica -- PRD A.3)
//   11. Verificacion humana de stock
//   12. Direccion de envio
//   13. Despacho (papeleria)
//   14. Cierre
//
// Este modulo cubre pasos 2-8 (input del cliente -> pedido creado en estado
// "necesita_revision"). El resto es accion humana fuera del sistema.

import { interpretarTexto, transcribirOCR } from '../adapters/iaAdapter';
import { getInventarioAsync } from '../adapters/inventarioAdapter';
import { cotizar } from '../services/matchingService';
import { Cotizacion, Pedido } from '../domain/entities';
import { crearPedido } from '../services/pedidoService';

export interface EntradaCliente {
  tenantId: string;
  clienteNombre: string;
  clienteTelefono: string;
  textoOriginal?: string;
  imagenBase64?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
}

export interface ResultadoOrquestacion {
  paso: 'transcripcion' | 'matching' | 'cotizacion' | 'pedido_creado';
  cotizacion?: Cotizacion;
  pedido?: Pedido;
  advertencia?: string; // ej: "Groq no respeto cantidades, revisar"
}

/**
 * Cruza lo que devolvio Groq contra el input del cliente.
 * Si Groq cambio cantidades, marca advertencia para revision humana.
 * No auto-corrige (PRD A.3 regla no negociable).
 */
function validarCantidades(
  textoOriginal: string,
  lineasParseadas: string[]
): string | null {
  // Extraer numeros del input original
  const numerosEnInput = textoOriginal.match(/\b(\d+)\b/g)?.map(Number) ?? [];
  if (numerosEnInput.length === 0) return null; // sin numeros = no se puede validar

  // Extraer numeros del output de Groq
  const numerosEnOutput: number[] = [];
  for (const linea of lineasParseadas) {
    const partes = linea.split('|');
    if (partes.length >= 2) {
      const cant = parseInt(partes[0], 10);
      if (!isNaN(cant)) numerosEnOutput.push(cant);
    }
  }

  // Si Groq invento cantidades, alertar
  if (numerosEnOutput.some(n => n > 5)) {
    return `Groq devolvio cantidades sospechosas (>5): [${numerosEnOutput.join(', ')}]. Revisar.`;
  }

  return null;
}

function parsearLineasGroq(
  output: string,
  textoOriginalFallback?: string
): Array<{ cantidad: number; nombre: string }> {
  const resultado: Array<{ cantidad: number; nombre: string }> = [];

  const lineas = (output || '').split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // 1. Intentar formato estándar: cantidad|nombre
  for (const linea of lineas) {
    if (linea.includes('|')) {
      const partes = linea.split('|');
      const cant = parseInt(partes[0].trim(), 10);
      const nombre = partes.slice(1).join('|').trim();
      if (!isNaN(cant) && nombre.length > 0) {
        resultado.push({ cantidad: Math.max(1, cant), nombre });
      }
    }
  }

  if (resultado.length > 0) return resultado;

  // 2. Fallback inteligente: Parsear viñetas y texto natural (ej. "• 1 cuaderno...", "3 lápices...")
  const fuentes = [lineas, (textoOriginalFallback || '').split('\n')];
  for (const listaLineas of fuentes) {
    for (const linea of listaLineas) {
      const limpia = linea.replace(/^[-*•·\d.)\s]+/, '').trim();
      if (limpia.length < 3 || /^(material|cartuchera|varios|útiles|utiles|lista)/i.test(limpia)) {
        continue;
      }

      // Buscar si empieza con cantidad (ej. "1 cuaderno", "3 lápices", "1x caja")
      const match = linea.match(/^(?:[-*•·\s]*)?(\d+)\s*(?:x|de)?\s+(.+)$/i);
      if (match) {
        const cant = parseInt(match[1], 10);
        const nombre = match[2].trim();
        if (!isNaN(cant) && nombre.length > 0) {
          resultado.push({ cantidad: Math.max(1, cant), nombre });
          continue;
        }
      }

      resultado.push({ cantidad: 1, nombre: limpia });
    }

    if (resultado.length > 0) break;
  }

  return resultado;
}

export async function procesarListaCliente(
  entrada: EntradaCliente
): Promise<ResultadoOrquestacion> {
  if (!entrada.textoOriginal && !entrada.imagenBase64) {
    throw new Error('Se requiere textoOriginal o imagenBase64');
  }

  // Paso 1: Transcripcion (si vino imagen)
  let textoParaParsear = entrada.textoOriginal ?? '';
  if (entrada.imagenBase64) {
    const ocr = await transcribirOCR(
      entrada.imagenBase64,
      entrada.mimeType ?? 'image/jpeg'
    );
    textoParaParsear = ocr.texto;
  }

  if (textoParaParsear.trim().length === 0) {
    throw new Error('No se pudo obtener texto del input (Riesgo #16)');
  }

  // Paso 2: Parseo inteligente con Groq / LLM
  const inventario = await getInventarioAsync(entrada.tenantId);
  const nombresInventario = inventario.map((p) => p.nombre);

  let itemsParseados: Array<{ cantidad: number; nombre: string }> = [];
  try {
    const parseo = await interpretarTexto(textoParaParsear, nombresInventario);
    itemsParseados = parsearLineasGroq(parseo.texto, textoParaParsear);
  } catch (err: any) {
    console.warn('[InterpretarTexto Warning]', err.message);
    itemsParseados = parsearLineasGroq('', textoParaParsear);
  }

  if (itemsParseados.length === 0) {
    itemsParseados = parsearLineasGroq('', textoParaParsear);
  }

  if (itemsParseados.length === 0) {
    throw new Error('No pudimos identificar los útiles escolares en la foto. Por favor envía una foto más nítida.');
  }

  // Validacion cruzada (Riesgo #17)
  const lineasParaValidar = itemsParseados.map((i) => `${i.cantidad}|${i.nombre}`);
  const advertencia = validarCantidades(textoParaParsear, lineasParaValidar);

  // Paso 3: Matching contra catálogo del tenant
  const cotizacion = await cotizar(entrada.tenantId, itemsParseados);


  // Si hay ambiguedades, marcar accion pendiente especifica
  // (el pedido se crea igual, queda en necesita_revision)

  // Paso 4: Crear pedido en estado "necesita_revision"
  const pedido = await crearPedido(
    cotizacion,
    entrada.clienteNombre,
    entrada.clienteTelefono,
    'whatsapp'
  );

  // Registrar evento de auditoria
  // (crearPedido ya registra 'creado'; aqui agregamos metadata del orquestador)

  return {
    paso: 'pedido_creado',
    cotizacion,
    pedido,
    advertencia: advertencia ?? undefined,
  };
}

import {
  detectarAmbiguedad,
  extraerCantidadNatural,
  filtrarCandidatosPorCategoria,
  resolverSeleccionOpcion,
  CandidatoProducto,
} from '../services/variantService';
import { buscarCategoriaParaItem } from '../knowledge/index';
import { interpretarIntencionSemantica } from '../adapters/iaAdapter';

/**
 * Procesa mensajes de texto del cliente utilizando el Clasificador Semántico Neuronal.
 * Es inmune a typos, comas, abreviaturas o formatos inesperados.
 */
export async function procesarTextoConversacional(
  tenantId: string,
  textoCliente: string,
  clienteNombre: string,
  clienteTelefono: string,
  contextoPrevio?: any
): Promise<
  | {
      tipo: 'pregunta_variante';
      textoPregunta: string;
      nuevoContexto: Record<string, any>;
    }
  | {
      tipo: 'cotizacion';
      resultado: ResultadoOrquestacion;
      nuevoContexto: Record<string, any>;
    }
> {
  const inventario = await getInventarioAsync(tenantId);
  const textoLimpio = textoCliente.trim();

  // 1. Interpretar semánticamente el mensaje con IA (contexto + historial + opciones)
  const opcionesPrevias: CandidatoProducto[] = contextoPrevio?.opcionesPresentadas || [];
  const semantica = await interpretarIntencionSemantica(
    textoLimpio,
    contextoPrevio?.resumenHistorial || contextoPrevio?.queryAcumulada,
    opcionesPrevias
  );

  console.log(`[Semántica IA] Intención: ${semantica.intencion}, Prod: ${semantica.producto_principal}, Specs: ${semantica.especificaciones_acumuladas}, Cant: ${semantica.cantidad_comprar}, OptIndex: ${semantica.opcion_elegida_index}`);

  // 2. Si el cliente envió una lista compuesta con varios útiles
  if (semantica.intencion === 'LISTA_COMPUESTA' && semantica.items_lista && semantica.items_lista.length > 0) {
    const cotizacion = await cotizar(tenantId, semantica.items_lista);
    const pedido = await crearPedido(cotizacion, clienteNombre, clienteTelefono, 'whatsapp');

    return {
      tipo: 'cotizacion',
      resultado: { paso: 'pedido_creado', cotizacion, pedido },
      nuevoContexto: {
        pedidoId: pedido.id,
        total: cotizacion.total,
        itemsCount: cotizacion.items.length,
        queryAcumulada: undefined,
        opcionesPresentadas: [],
        resumenHistorial: undefined,
      },
    };
  }

  // 3. Si el cliente está seleccionando una opción presentada
  if (
    (semantica.intencion === 'SELECCION_OPCION' || opcionesPrevias.length > 0) &&
    opcionesPrevias.length > 0
  ) {
    let seleccion: CandidatoProducto | null = null;

    if (semantica.opcion_elegida_index && semantica.opcion_elegida_index <= opcionesPrevias.length) {
      seleccion = opcionesPrevias[semantica.opcion_elegida_index - 1];
    } else {
      seleccion = resolverSeleccionOpcion(textoLimpio, opcionesPrevias);
    }

    if (seleccion) {
      const cantidad = semantica.cantidad_comprar || contextoPrevio?.cantidad || 1;
      const cotizacion = await cotizar(tenantId, [{ nombre: seleccion.nombre, cantidad }]);
      const pedido = await crearPedido(cotizacion, clienteNombre, clienteTelefono, 'whatsapp');

      return {
        tipo: 'cotizacion',
        resultado: { paso: 'pedido_creado', cotizacion, pedido },
        nuevoContexto: {
          pedidoId: pedido.id,
          total: cotizacion.total,
          itemsCount: cotizacion.items.length,
          productoConfirmado: seleccion.nombre,
          cantidad,
          queryAcumulada: undefined,
          opcionesPresentadas: [],
          resumenHistorial: undefined,
        },
      };
    }
  }

  // 4. Consulta de producto o variantes
  const queryBusqueda =
    semantica.especificaciones_acumuladas ||
    semantica.producto_principal ||
    (contextoPrevio?.queryAcumulada ? `${contextoPrevio.queryAcumulada} ${textoLimpio}` : textoLimpio);

  const cantidad = semantica.cantidad_comprar || contextoPrevio?.cantidad || 1;
  const categoria = buscarCategoriaParaItem(queryBusqueda);
  const candidatos = filtrarCandidatosPorCategoria(categoria, queryBusqueda, inventario);
  const resAmb = detectarAmbiguedad(queryBusqueda, candidatos, cantidad);

  if (resAmb.esAmbiguo && resAmb.opcionesDisponibles.length > 1) {
    return {
      tipo: 'pregunta_variante',
      textoPregunta: `¡Con gusto te cotizamos! 📚✏️\n\n${resAmb.preguntaSugerida}\n\n_Escríbenos tu preferencia o si deseas agregar algún otro útil escolar._`,
      nuevoContexto: {
        queryAcumulada: queryBusqueda,
        resumenHistorial: `Cliente busca ${queryBusqueda}. Bot preguntó opciones.`,
        cantidad,
        opcionesPresentadas: resAmb.opcionesDisponibles,
      },
    };
  }

  // Si ya no es ambiguo, cotizar el producto
  const itemNombre = candidatos.length > 0 ? candidatos[0].nombre : queryBusqueda;
  const cotizacion = await cotizar(tenantId, [{ cantidad, nombre: itemNombre }]);
  const pedido = await crearPedido(cotizacion, clienteNombre, clienteTelefono, 'whatsapp');

  return {
    tipo: 'cotizacion',
    resultado: { paso: 'pedido_creado', cotizacion, pedido },
    nuevoContexto: {
      pedidoId: pedido.id,
      total: cotizacion.total,
      itemsCount: cotizacion.items.length,
      queryAcumulada: undefined,
      opcionesPresentadas: [],
      resumenHistorial: undefined,
    },
  };
}
