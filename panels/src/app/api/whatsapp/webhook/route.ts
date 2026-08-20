import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { procesarListaCliente } from '@/server/orchestrate/whatsappOrchestrator';
import { validarWebhookEvolution, enviarMensaje } from '@/server/adapters/evolutionAdapter';
import { limpiarNombreERP, generarSugerenciaVentaCruzada } from '@/server/services/displayService';
import {
  obtenerConversacion,
  crearConversacion,
  actualizarConversacion,
} from '@/server/adapters/conversacionAdapter';
import { despacharMensajeWhatsApp, RouterContexto } from '@/server/router/botRouter';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Números autorizados para pruebas libres del bot en WhatsApp (sin necesidad de escanear QR)
const NUMEROS_TEST_BOT = ['593963410409', '593983237491'];

// Cache de deduplicación de mensajes procesados recientemente (evita duplicados si Evolution reintenta)
const mensajesProcesados = new Map<string, number>();
const ultimosMensajesPorNumero = new Map<string, number>();

function esMensajeDuplicado(messageId?: string): boolean {
  if (!messageId) return false;
  const ahora = Date.now();
  for (const [id, ts] of mensajesProcesados.entries()) {
    if (ahora - ts > 60000) {
      mensajesProcesados.delete(id);
    }
  }
  if (mensajesProcesados.has(messageId)) {
    return true;
  }
  mensajesProcesados.set(messageId, ahora);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = payload?.event || payload?.data?.messageType || 'unknown';
    console.log(
      `[Webhook IN] event=${event} instance=${payload?.instance || 'N/A'} keys=${Object.keys(
        payload?.data || {}
      ).join(',')}`
    );

    const datos = validarWebhookEvolution(payload);

    // Si es un evento no procesable (ej. status, connection_update, typing, fromMe, etc.)
    if (!datos || (!datos.texto && !datos.imagenBase64)) {
      console.log(`[Webhook] Evento ignorado: event=${event} datos=${datos ? 'parsed-but-empty' : 'null'}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Deduplicación por messageId
    if (datos.messageId && esMensajeDuplicado(datos.messageId)) {
      console.log(`[Webhook] Mensaje duplicado ignorado (retry Evolution): messageId=${datos.messageId}`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'mensaje_duplicado' });
    }

    console.log(
      `[Webhook] Procesando: numero=${datos.numero} texto=${
        datos.texto?.substring(0, 40) || '(sin texto)'
      } imagen=${datos.imagenBase64 ? `${datos.imagenBase64.length} chars` : 'NO'} mime=${datos.mimeType}`
    );

    const sb = getSupabase();

    // ─── PASO 1: BUSCAR TENANT ASOCIADO A LA INSTANCIA ────────────────
    let { data: tw } = await sb
      .from('tenant_whatsapp')
      .select('tenant_id, evolution_instance_id, evolution_instance_name')
      .or(`evolution_instance_id.eq.${datos.instanceName},evolution_instance_name.eq.${datos.instanceName}`)
      .maybeSingle();

    if (!tw) {
      const cleanSlug = datos.instanceName.replace(/^qr_/, '');
      const { data: fallbackTw } = await sb
        .from('tenant_whatsapp')
        .select('tenant_id, evolution_instance_id, evolution_instance_name')
        .eq('tenant_id', cleanSlug)
        .maybeSingle();

      tw = fallbackTw;
    }

    if (!tw) {
      console.warn(`[Webhook WhatsApp] Instancia no registrada en DB: ${datos.instanceName}`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'instance no registrada' });
    }

    const tenantIdReal = tw.tenant_id;

    // ─── PASO 2: OBTENER DATOS DEL NEGOCIO ────────────────────────────
    const { data: tenantObj } = await sb
      .from('tenants')
      .select('id, nombre, telefono')
      .eq('id', tenantIdReal)
      .maybeSingle();

    const nombreLibreria = tenantObj?.nombre || 'Librería';
    const telefonoAsesor = tenantObj?.telefono ? tenantObj.telefono.replace(/\D/g, '') : '';
    const textoLimpio = (datos.texto || '').trim();
    const tieneImagen = Boolean(datos.imagenBase64);

    // Identificar si es número de prueba autorizado para interacción libre
    const numeroLimpio = (datos.numero || '').replace(/\D/g, '');
    const esNumeroPrueba = NUMEROS_TEST_BOT.some(
      (num) => numeroLimpio.includes(num) || num.includes(numeroLimpio)
    );

    // ─── PASO 3: CONSULTAR O INICIALIZAR CONVERSACIÓN ─────────────────
    let conv = await obtenerConversacion(tenantIdReal, datos.numero);

    // ─── PASO 4: COMANDO DE PARAR / SILENCIAR BOT ─────────────────────
    const esComandoPausa = /^(parar|stop|pausa|pausar|silencio|asesor|humano|cancelar|apagar)$/i.test(textoLimpio);
    if (esComandoPausa) {
      if (conv) {
        await actualizarConversacion(conv.id, {
          estadoActual: 'DERIVADO_A_HUMANO',
          requiereHumano: true,
        });
      } else {
        const c = await crearConversacion(tenantIdReal, datos.numero);
        await actualizarConversacion(c.id, {
          estadoActual: 'DERIVADO_A_HUMANO',
          requiereHumano: true,
        });
      }

      await enviarMensaje(datos.instanceName, {
        numero: datos.numero,
        texto: `⏸️ *Bot pausado en este chat.* Te hemos transferido con un asesor humano. Escribe *reactivar* o envía una nueva consulta para volver a hablar con el asistente virtual.`,
      });

      return NextResponse.json({ ok: true, tipo: 'bot_pausado_manualmente' });
    }

    // ─── PASO 5: REACTIVAR BOT SI ESTABA PAUSADO ─────────────────────
    const esComandoReactivar = /^(reactivar|activar|iniciar|comenzar|hola|buenas|buenas tardes|buenos dias)$/i.test(textoLimpio);
    if (esComandoReactivar && conv?.requiereHumano && esNumeroPrueba) {
      await actualizarConversacion(conv.id, {
        estadoActual: 'CONFIRMANDO_LISTA',
        requiereHumano: false,
      });
      conv.requiereHumano = false;
    }

    // ─── PASO 6: DETECTAR INICIO DE FLUJO QR ─────────────────────────
    const esMensajeQR = /quiero cotizar mi lista|quiero cotizar/i.test(textoLimpio);

    if (esMensajeQR) {
      if (conv) {
        conv = await actualizarConversacion(conv.id, {
          estadoActual: 'CONFIRMANDO_LISTA',
          requiereHumano: false,
          contexto: {},
        });
      } else {
        conv = await crearConversacion(tenantIdReal, datos.numero);
        await actualizarConversacion(conv.id, {
          estadoActual: 'CONFIRMANDO_LISTA',
          requiereHumano: false,
        });
      }

      if (!tieneImagen) {
        const bienvenida = `¡Hola! 👋 Bienvenido/a a *${nombreLibreria}* 📚✏️\n\nPor favor envíanos la *foto de tu lista escolar* 📸 (puedes enviar una o varias fotos), el archivo *PDF* 📄, o escribe los útiles que necesitas aquí en texto.\n\nTe calcularemos el presupuesto exacto al instante con nuestro inventario en stock.`;

        await enviarMensaje(datos.instanceName, {
          numero: datos.numero,
          texto: bienvenida,
        });

        return NextResponse.json({ ok: true, tipo: 'saludo_bienvenida' });
      }
    }

    // ─── PASO 7: HANDOFF HUMANO → SILENCIO TOTAL ─────────────────────
    if (conv?.requiereHumano && !esMensajeQR && !esNumeroPrueba) {
      console.log(`[Webhook WhatsApp] Chat en handoff humano ignorado: ${datos.numero}`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'en_handoff_humano' });
    }

    // ─── PASO 8: COOLDOWN ANTI-SPAM POR NÚMERO ───────────────────────
    const ultimoProceso = ultimosMensajesPorNumero.get(datos.numero);
    const ahora = Date.now();
    if (ultimoProceso && ahora - ultimoProceso < 6000 && !esMensajeQR && !esNumeroPrueba) {
      console.log(`[Webhook WhatsApp] Ignorado por cooldown anti-spam (${ahora - ultimoProceso}ms): ${datos.numero}`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'cooldown_activo' });
    }
    ultimosMensajesPorNumero.set(datos.numero, ahora);

    // ─── PASO 9: SI NO ES QR NI IMAGEN NI NÚMERO DE PRUEBA → IGNORAR ─
    if (!esMensajeQR && !tieneImagen && !esNumeroPrueba) {
      console.log(`[Webhook WhatsApp] Chat ignorado (no es QR ni lista): "${textoLimpio.substring(0, 40)}"`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'mensaje no escolar' });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ─── PASO 10: PROCESAMIENTO INTELIGENTE ──────────────────────────
    // ═══════════════════════════════════════════════════════════════════
    try {

      // ─── RUTA A: TEXTO CONVERSACIONAL (botRouter con memoria) ──────
      if (!tieneImagen && esNumeroPrueba && textoLimpio.length > 0) {

        // Recuperar contexto previo del router desde la conversación en Supabase
        const contextoPrevio: RouterContexto = (conv?.contexto as RouterContexto) || {};

        // 🧠 DESPACHO AL ROUTER INTELIGENTE (con historial completo del hilo)
        const resultado = await despacharMensajeWhatsApp(
          tenantIdReal,
          textoLimpio,
          datos.pushName || 'Cliente WhatsApp',
          datos.numero,
          contextoPrevio
        );

        console.log(`[BotRouter Result] tipo=${resultado.tipo} pedido=${resultado.pedidoId || 'N/A'} total=${resultado.total || 'N/A'}`);

        // Crear conversación en Supabase si no existe
        if (!conv) {
          conv = await crearConversacion(tenantIdReal, datos.numero);
        }

        // Mapear el tipo de resultado del router al estado de conversación
        let nuevoEstado: string;
        switch (resultado.tipo) {
          case 'reset':
            nuevoEstado = 'INICIAL';
            break;
          case 'pregunta_variante':
            nuevoEstado = 'RESOLVIENDO_VARIANTES';
            break;
          case 'cotizacion':
            nuevoEstado = 'CONFIRMANDO_COTIZACION';
            break;
          case 'pedido_confirmado':
            nuevoEstado = esNumeroPrueba ? 'CONFIRMANDO_LISTA' : 'DERIVADO_A_HUMANO';
            break;
          default:
            nuevoEstado = 'CONFIRMANDO_LISTA';
        }

        // Persistir el nuevo contexto con el historial de mensajes
        await actualizarConversacion(conv.id, {
          estadoActual: nuevoEstado as any,
          requiereHumano: false,
          contexto: resultado.nuevoContexto as Record<string, any>,
        });

        // Si es confirmación de pedido, manejar la lógica de confirmación completa
        if (resultado.tipo === 'pedido_confirmado' && resultado.pedidoId) {
          // Actualizar pedido a estado 'confirmado' en DB
          await sb
            .from('pedidos')
            .update({
              estado: 'confirmado',
              cliente_nombre: datos.pushName || 'Cliente WhatsApp',
              cliente_telefono: datos.numero,
            })
            .eq('id', resultado.pedidoId);

          // Notificar al asesor/dueño
          if (telefonoAsesor && telefonoAsesor !== datos.numero.replace(/\D/g, '')) {
            const pedidoNum = `#${resultado.pedidoId.slice(-6)}`;
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://libreria-qr-brown.vercel.app';
            const linkPublico = `${appUrl}/pedir/${tenantIdReal}?pedido=${resultado.pedidoId}`;
            const msgAsesor = `🔔 *¡Nuevo Pedido Confirmado!* 🔔\n🏪 *${nombreLibreria}* — Pedido ${pedidoNum}\n👤 *Cliente:* ${datos.pushName || 'Cliente WhatsApp'} (+${datos.numero})\n💰 *Total Estimado:* $${(resultado.total || 0).toFixed(2)}\n\n📄 *Ver proforma y pedido:* \n${linkPublico}\n\n👉 _Por favor comunícate con el cliente para coordinar el despacho._`;

            await enviarMensaje(datos.instanceName, {
              numero: telefonoAsesor,
              texto: msgAsesor,
            });
          }
        }

        // Enviar la respuesta del bot al cliente por WhatsApp
        await enviarMensaje(datos.instanceName, {
          numero: datos.numero,
          texto: resultado.textoRespuesta,
        });

        return NextResponse.json({
          ok: true,
          tipo: resultado.tipo,
          pedido_id: resultado.pedidoId,
          total: resultado.total,
        });
      }

      // ─── RUTA B: IMAGEN O PDF (Lista escolar completa) ─────────────
      await enviarMensaje(datos.instanceName, {
        numero: datos.numero,
        texto: `⏳ *¡Recibimos tu lista escolar!* 📚\n\nPor favor espéranos un momento (~2 minutos), estamos cotizando tus útiles escolares con nuestro inventario en stock...`,
      });

      const resultado = await procesarListaCliente({
        tenantId: tenantIdReal,
        clienteNombre: datos.pushName || 'Cliente WhatsApp',
        clienteTelefono: datos.numero,
        textoOriginal: datos.texto,
        imagenBase64: datos.imagenBase64,
        mimeType: datos.mimeType,
      });

      const itemsDisponibles = resultado.cotizacion?.items || [];
      const faltantes = resultado.cotizacion?.ambiguos || [];
      const totalFormateado = resultado.cotizacion?.total ? `$${resultado.cotizacion.total.toFixed(2)}` : '$0.00';
      const pedidoNum = resultado.pedido?.id ? `#${resultado.pedido.id.slice(-6)}` : '';

      if (!conv) {
        conv = await crearConversacion(tenantIdReal, datos.numero);
      }
      await actualizarConversacion(conv.id, {
        estadoActual: 'CONFIRMANDO_COTIZACION',
        requiereHumano: false,
        contexto: {
          pedidoId: resultado.pedido?.id,
          total: resultado.cotizacion?.total || 0,
          itemsCount: itemsDisponibles.length,
          faltantesCount: faltantes.length,
        },
      });

      const nombresItems = itemsDisponibles.map((i: any) => i.nombre);
      const sugerencia = generarSugerenciaVentaCruzada(nombresItems);
      const textoSugerencia = sugerencia ? sugerencia.textoSugerencia : '';

      const resumen = `📋 *Cotización de Útiles Escolares* 📋\n🏪 *${nombreLibreria}* — Pedido ${pedidoNum}\n\n✅ *${itemsDisponibles.length} útiles encontrados en stock*\n⚠️ *${faltantes.length} artículos no disponibles en tienda*\n\n💰 *TOTAL ESTIMADO: ${totalFormateado}*${textoSugerencia}\n\n👉 *¿Deseas confirmar tu pedido con estos útiles?*\nResponde *SÍ* para confirmar tu pedido o envíanos cualquier duda o cambio.`;

      await enviarMensaje(datos.instanceName, {
        numero: datos.numero,
        texto: resumen,
      });

      return NextResponse.json({
        ok: true,
        pedido_id: resultado.pedido?.id,
        total: resultado.cotizacion?.total,
        advertencia: resultado.advertencia,
      });
    } catch (err: any) {
      console.warn('[Procesar Lista Error]', err.message);

      if (tieneImagen || esMensajeQR || esNumeroPrueba) {
        const msgError = `No pudimos leer los útiles en tu mensaje o foto. 📸\n\nPor favor escribe los materiales que necesitas o envía una foto más nítida. ¡Con gusto te cotizamos!`;

        await enviarMensaje(datos.instanceName, {
          numero: datos.numero,
          texto: msgError,
        });
      }

      return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
    }
  } catch (e: any) {
    console.error('[Webhook WhatsApp Error]', e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 200 });
  }
}
