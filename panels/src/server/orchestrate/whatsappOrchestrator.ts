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
import { detectarAmbiguedad } from '../services/variantService';

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

/**
 * Procesa mensajes de texto del cliente buscando si hay ambigüedades en pedidos cortos (1-2 útiles).
 * Si hay variantes que necesitan aclaración, devuelve la pregunta con las opciones reales en stock.
 */
export async function procesarTextoConversacional(
  tenantId: string,
  textoCliente: string,
  clienteNombre: string,
  clienteTelefono: string
): Promise<
  | { tipo: 'pregunta_variante'; textoPregunta: string }
  | { tipo: 'cotizacion'; resultado: ResultadoOrquestacion }
> {
  const inventario = await getInventarioAsync(tenantId);
  const nombresInventario = inventario.map((p) => p.nombre);

  let itemsParseados: Array<{ cantidad: number; nombre: string }> = [];
  try {
    const parseo = await interpretarTexto(textoCliente, nombresInventario);
    itemsParseados = parsearLineasGroq(parseo.texto, textoCliente);
  } catch {
    itemsParseados = parsearLineasGroq('', textoCliente);
  }

  if (itemsParseados.length === 0) {
    itemsParseados = parsearLineasGroq('', textoCliente);
  }

  // Si son 1 o 2 ítems, verificar si alguno tiene ambigüedad y requiere aclaración
  if (itemsParseados.length >= 1 && itemsParseados.length <= 2) {
    for (const item of itemsParseados) {
      const itemNorm = item.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const tokens = itemNorm.split(' ').filter((t) => t.length > 2);

      const candidatos = inventario.filter((p) => {
        const pNorm = p.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return tokens.some((t) => pNorm.includes(t));
      });

      const resAmb = detectarAmbiguedad(item.nombre, candidatos);
      if (resAmb.esAmbiguo && resAmb.preguntaSugerida) {
        return {
          tipo: 'pregunta_variante',
          textoPregunta: `¡Con gusto te cotizamos! 📚✏️\n\n${resAmb.preguntaSugerida}\n\n_Escríbenos tu preferencia o si deseas agregar algún otro útil escolar._`,
        };
      }
    }
  }

  // Si no hay ambigüedades o es una lista más larga, cotizar normalmente
  const resultado = await procesarListaCliente({
    tenantId,
    clienteNombre,
    clienteTelefono,
    textoOriginal: textoCliente,
  });

  return {
    tipo: 'cotizacion',
    resultado,
  };
}
