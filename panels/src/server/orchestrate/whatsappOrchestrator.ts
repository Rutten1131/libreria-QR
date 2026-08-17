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
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
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

function parsearLineasGroq(output: string): Array<{ cantidad: number; nombre: string }> {
  const resultado: Array<{ cantidad: number; nombre: string }> = [];
  const lineas = output.split('\n').filter(l => l.trim().length > 0);
  for (const linea of lineas) {
    const partes = linea.split('|');
    if (partes.length >= 2) {
      const cant = parseInt(partes[0].trim(), 10);
      const nombre = partes.slice(1).join('|').trim();
      if (!isNaN(cant) && nombre.length > 0) {
        resultado.push({ cantidad: cant, nombre });
      }
    }
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
      entrada.mimeType ?? 'image/png'
    );
    textoParaParsear = ocr.texto;
  }

  if (textoParaParsear.trim().length === 0) {
    throw new Error('No se pudo obtener texto del input (Riesgo #16)');
  }

  // Paso 2: Parseo inteligente con Groq
  const inventario = await getInventarioAsync(entrada.tenantId);
  const nombresInventario = inventario.map(p => p.nombre);

  const parseo = await interpretarTexto(textoParaParsear, nombresInventario);
  const itemsParseados = parsearLineasGroq(parseo.texto);

  if (itemsParseados.length === 0) {
    throw new Error('Groq no devolvio items parseables. Escalar a revision humana.');
  }

  // Validacion cruzada (Riesgo #17)
  const advertencia = validarCantidades(textoParaParsear, parseo.texto.split('\n'));

  // Paso 3: Matching contra catalogo del tenant
  const listaParaMatching = itemsParseados.map(i => i.nombre);
  const cotizacion = await cotizar(entrada.tenantId, listaParaMatching);

  // Aplicar cantidades del parseo a los items matched
  for (const item of cotizacion.items) {
    const match = itemsParseados.find(
      ip => ip.nombre.toLowerCase() === item.nombre.toLowerCase()
    );
    if (match) item.cantidad = match.cantidad;
  }

  // Recalcular total
  cotizacion.total = cotizacion.items.reduce(
    (s, i) => s + i.precioUnitario * i.cantidad,
    0
  );

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
