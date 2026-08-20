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
import { esListaCompuestaUtil } from '../services/displayService';

/**
 * Procesa mensajes de texto del cliente manteniendo memoria del contexto conversacional.
 * Resuelve ambigüedades, selecciones de opciones (por precio, orden o marca) y cantidades naturales ("docena", etc.).
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

  // 0. Detectar si es una lista compuesta con múltiples útiles escolares
  // (ej. "media docena de esferos, 2 cuadernos... y una goma")
  const esListaCompuesta = esListaCompuestaUtil(textoLimpio);

  if (esListaCompuesta) {
    const resultado = await procesarListaCliente({
      tenantId,
      clienteNombre,
      clienteTelefono,
      textoOriginal: textoLimpio,
    });

    return {
      tipo: 'cotizacion',
      resultado,
      nuevoContexto: {
        pedidoId: resultado.pedido?.id,
        total: resultado.cotizacion?.total || 0,
        itemsCount: resultado.cotizacion?.items?.length || 0,
        // Limpiar consultas anteriores para no arrastrar contexto viejo
        queryAcumulada: undefined,
        opcionesPresentadas: [],
      },
    };
  }

  // 1. Verificar si el usuario está respondiendo a opciones presentadas anteriormente
  const opcionesPrevias: CandidatoProducto[] = contextoPrevio?.opcionesPresentadas || [];
  const cantidadPrevia = contextoPrevio?.cantidad || 1;
  const cantEnTexto = extraerCantidadNatural(textoLimpio);
  const cantidadFinal = cantEnTexto || cantidadPrevia || 1;

  if (opcionesPrevias.length > 0) {
    const seleccion = resolverSeleccionOpcion(textoLimpio, opcionesPrevias);

    if (seleccion) {
      // El cliente seleccionó una opción concreta (ej. "el de 3.50", "el primero", "1", "Stanford")
      const cotizacion = await cotizar(tenantId, [
        { nombre: seleccion.nombre, cantidad: cantidadFinal },
      ]);

      const pedido = await crearPedido(
        cotizacion,
        clienteNombre,
        clienteTelefono,
        'whatsapp'
      );

      return {
        tipo: 'cotizacion',
        resultado: {
          paso: 'pedido_creado',
          cotizacion,
          pedido,
        },
        nuevoContexto: {
          pedidoId: pedido.id,
          total: cotizacion.total,
          itemsCount: cotizacion.items.length,
          productoConfirmado: seleccion.nombre,
          cantidad: cantidadFinal,
          // Limpiar opciones previas una vez seleccionada
          queryAcumulada: undefined,
          opcionesPresentadas: [],
        },
      };
    }
  }

  // 2. Detectar si el cliente cambió de producto/categoría (ej. antes cuadernos, ahora pinturas)
  const catActual = buscarCategoriaParaItem(textoLimpio);
  const catPrevia = contextoPrevio?.categoriaFamilia;
  const esCambioDeCategoria = Boolean(catActual && catPrevia && catActual.familia !== catPrevia);

  // Si cambió de categoría, empezar con query limpia; si no, acumular especificaciones (ej. "a cuadros", "espiral")
  const queryBase = (contextoPrevio?.queryAcumulada && !esCambioDeCategoria)
    ? `${contextoPrevio.queryAcumulada} ${textoLimpio}`
    : textoLimpio;

  const categoria = catActual || buscarCategoriaParaItem(queryBase);

  // Filtrar candidatos estrictamente de la categoría y atributos mencionados
  const candidatos = filtrarCandidatosPorCategoria(categoria, queryBase, inventario);

  // Detectar si aún hay ambigüedad entre las opciones encontradas (pasando cantidadFinal para formatear lotes)
  const resAmb = detectarAmbiguedad(queryBase, candidatos, cantidadFinal);

  if (resAmb.esAmbiguo && resAmb.opcionesDisponibles.length > 1) {
    return {
      tipo: 'pregunta_variante',
      textoPregunta: `¡Con gusto te cotizamos! 📚✏️\n\n${resAmb.preguntaSugerida}\n\n_Escríbenos tu preferencia o si deseas agregar algún otro útil escolar._`,
      nuevoContexto: {
        queryAcumulada: queryBase,
        categoriaFamilia: categoria?.familia,
        cantidad: cantidadFinal,
        opcionesPresentadas: resAmb.opcionesDisponibles,
      },
    };
  }

  // Si ya no hay ambigüedad o hay una opción clara, cotizar el producto
  let itemsParaCotizar: Array<{ cantidad: number; nombre: string }> = [];

  if (candidatos.length >= 1) {
    itemsParaCotizar = [{ cantidad: cantidadFinal, nombre: candidatos[0].nombre }];
  } else {
    // Parser Groq estándar para listas compuestas
    const nombresInventario = inventario.map((p) => p.nombre);
    try {
      const parseo = await interpretarTexto(textoLimpio, nombresInventario);
      itemsParaCotizar = parsearLineasGroq(parseo.texto, textoLimpio);
    } catch {
      itemsParaCotizar = parsearLineasGroq('', textoLimpio);
    }

    if (itemsParaCotizar.length === 0) {
      // Fallback: si tenía cantidad y producto previo
      if (contextoPrevio?.opcionesPresentadas?.length > 0 && cantEnTexto) {
        itemsParaCotizar = [
          { cantidad: cantEnTexto, nombre: contextoPrevio.opcionesPresentadas[0].nombre },
        ];
      } else {
        itemsParaCotizar = [{ cantidad: cantidadFinal, nombre: textoLimpio }];
      }
    }
  }

  const cotizacion = await cotizar(tenantId, itemsParaCotizar);
  const pedido = await crearPedido(
    cotizacion,
    clienteNombre,
    clienteTelefono,
    'whatsapp'
  );

  return {
    tipo: 'cotizacion',
    resultado: {
      paso: 'pedido_creado',
      cotizacion,
      pedido,
    },
    nuevoContexto: {
      pedidoId: pedido.id,
      total: cotizacion.total,
      itemsCount: cotizacion.items.length,
      // Limpiar query acumulada al cerrar la cotización
      queryAcumulada: undefined,
      opcionesPresentadas: [],
      cantidad: cantidadFinal,
    },
  };
}
