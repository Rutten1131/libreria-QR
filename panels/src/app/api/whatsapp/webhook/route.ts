import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { procesarListaCliente, procesarTextoConversacional } from '@/server/orchestrate/whatsappOrchestrator';
import { validarWebhookEvolution, enviarMensaje } from '@/server/adapters/evolutionAdapter';
import { limpiarNombreERP, generarSugerenciaVentaCruzada } from '@/server/services/displayService';
import {
  obtenerConversacion,
  crearConversacion,
  actualizarConversacion,
} from '@/server/adapters/conversacionAdapter';

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

    // 1. Buscar tenant asociado a la instancia
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

    // 2. Obtener datos del negocio
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

    // 3. Consultar o inicializar estado de la conversación con este cliente
    let conv = await obtenerConversacion(tenantIdReal, datos.numero);

    // 4. Comando de PARAR / SILENCIAR BOT en este chat
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

    // 5. Comando para reactivar bot si estaba pausado
    const esComandoReactivar = /^(reactivar|activar|iniciar|comenzar|hola|buenas|buenas tardes|buenos dias)$/i.test(textoLimpio);
    if (esComandoReactivar && conv?.requiereHumano && esNumeroPrueba) {
      await actualizarConversacion(conv.id, {
        estadoActual: 'CONFIRMANDO_LISTA',
        requiereHumano: false,
      });
      conv.requiereHumano = false;
    }

    // 6. Detectar si el mensaje es el inicio del flujo QR
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

    // 7. Si la conversación está en HANDOFF humano y no es número de prueba -> SILENCIO TOTAL
    if (conv?.requiereHumano && !esMensajeQR && !esNumeroPrueba) {
      console.log(`[Webhook WhatsApp] Chat en handoff humano ignorado: ${datos.numero}`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'en_handoff_humano' });
    }

    // 8. Cooldown anti-spam por número
    const ultimoProceso = ultimosMensajesPorNumero.get(datos.numero);
    const ahora = Date.now();
    if (ultimoProceso && ahora - ultimoProceso < 6000 && !esMensajeQR && !esNumeroPrueba) {
      console.log(`[Webhook WhatsApp] Ignorado por cooldown anti-spam (${ahora - ultimoProceso}ms): ${datos.numero}`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'cooldown_activo' });
    }
    ultimosMensajesPorNumero.set(datos.numero, ahora);

    // 9. Si el cliente está respondiendo para CONFIRMAR la cotización
    const esConfirmacionAfirmativa =
      /^(s[ií]|si confirmo|confirmo|confirmar|de acuerdo|listo|dale|ok|si por favor|si deseo|si quiero|deseo confirmar|por favor|claro)$/i.test(
        textoLimpio
      );

    if (conv?.estadoActual === 'CONFIRMANDO_COTIZACION' && esConfirmacionAfirmativa) {
      const pedidoId = conv.contexto?.pedidoId;
      const totalNum = conv.contexto?.total || 0;
      const pedidoNum = pedidoId ? `#${pedidoId.slice(-6)}` : '';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://libreria-qr-brown.vercel.app';
      const linkPublico = `${appUrl}/pedir/${tenantIdReal}?pedido=${pedidoId}`;

      // A) Actualizar pedido a estado 'confirmado'
      if (pedidoId) {
        await sb
          .from('pedidos')
          .update({
            estado: 'confirmado',
            cliente_nombre: datos.pushName || 'Cliente WhatsApp',
            cliente_telefono: datos.numero,
          })
          .eq('id', pedidoId);
      }

      // B) Marcar conversación en HANDOFF humano (o seguir activo si es número de prueba)
      await actualizarConversacion(conv.id, {
        estadoActual: esNumeroPrueba ? 'CONFIRMANDO_LISTA' : 'DERIVADO_A_HUMANO',
        requiereHumano: !esNumeroPrueba,
        contexto: { ...conv.contexto, confirmado: true },
      });

      // C) Mensaje de confirmación al cliente con enlace a proforma
      const msgConfirmacionCliente = `🎉 *¡Pedido Confirmado con Éxito!* 🎉\n🏪 *${nombreLibreria}* — Pedido ${pedidoNum}\n\n📄 *Ver cotización o descargar proforma en PDF:*\n${linkPublico}\n\n👩‍💼 _Un asesor de nuestra tienda ya fue notificado y se comunicará contigo para coordinar la entrega o retiro. ¡Muchas gracias por tu preferencia!_`;

      await enviarMensaje(datos.instanceName, {
        numero: datos.numero,
        texto: msgConfirmacionCliente,
      });

      // D) Notificar al asesor/dueño
      if (telefonoAsesor && telefonoAsesor !== datos.numero.replace(/\D/g, '')) {
        const msgAsesor = `🔔 *¡Nuevo Pedido Confirmado!* 🔔\n🏪 *${nombreLibreria}* — Pedido ${pedidoNum}\n👤 *Cliente:* ${datos.pushName || 'Cliente WhatsApp'} (+${datos.numero})\n💰 *Total Estimado:* $${totalNum.toFixed(2)}\n\n📄 *Ver proforma y pedido:* \n${linkPublico}\n\n👉 _Por favor comunícate con el cliente para coordinar el despacho._`;

        await enviarMensaje(datos.instanceName, {
          numero: telefonoAsesor,
          texto: msgAsesor,
        });
      }

      return NextResponse.json({ ok: true, tipo: 'pedido_confirmado' });
    }

    // 10. Si NO es QR, NI imagen/PDF, NI número de prueba autorizado -> IGNORAR
    if (!esMensajeQR && !tieneImagen && !esNumeroPrueba) {
      console.log(`[Webhook WhatsApp] Chat ignorado (no es QR ni lista): "${textoLimpio.substring(0, 40)}"`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'mensaje no escolar' });
    }

    // 11. Detección de saludos para números de prueba (sin imagen)
    const esSaludoSimple = /^(hola|buenas|buenos dias|buenas tardes|buenas noches|saludos|que tal|q tal)$/i.test(textoLimpio);
    if (esSaludoSimple && !tieneImagen && esNumeroPrueba) {
      const saludoMsg = `¡Hola ${datos.pushName || ''}! 👋 Bienvenido/a a *${nombreLibreria}* 📚✏️\n\n¿En qué te podemos ayudar hoy? Puedes enviarnos la *foto o PDF de tu lista de útiles* 📸📄, o escribirnos directamente los materiales que necesitas para cotizártelos con nuestro inventario en stock.`;
      
      await enviarMensaje(datos.instanceName, {
        numero: datos.numero,
        texto: saludoMsg,
      });

      return NextResponse.json({ ok: true, tipo: 'saludo_conversacional_test' });
    }

    // 12. PROCESAMIENTO INTELIGENTE (Conversacional / Variantes / Lista escolar)
    try {
      // Si es solo texto corto de prueba, revisar variantes conversacionales
      if (!tieneImagen && esNumeroPrueba && textoLimpio.length > 0) {
        const convRes = await procesarTextoConversacional(
          tenantIdReal,
          textoLimpio,
          datos.pushName || 'Cliente WhatsApp',
          datos.numero,
          conv?.contexto
        );

        if (!conv) {
          conv = await crearConversacion(tenantIdReal, datos.numero);
        }

        if (convRes.tipo === 'pregunta_variante') {
          await actualizarConversacion(conv.id, {
            estadoActual: 'RESOLVIENDO_VARIANTES',
            requiereHumano: false,
            contexto: { ...(conv?.contexto || {}), ...(convRes.nuevoContexto || {}) },
          });

          await enviarMensaje(datos.instanceName, {
            numero: datos.numero,
            texto: convRes.textoPregunta,
          });

          return NextResponse.json({ ok: true, tipo: 'pregunta_variante_enviada' });
        }

        // Si devolvió cotización directa
        const cot = convRes.resultado.cotizacion;
        const ped = convRes.resultado.pedido;
        const totalFormateado = cot?.total ? `$${cot.total.toFixed(2)}` : '$0.00';
        const pedidoNum = ped?.id ? `#${ped.id.slice(-6)}` : '';

        await actualizarConversacion(conv.id, {
          estadoActual: 'CONFIRMANDO_COTIZACION',
          requiereHumano: false,
          contexto: {
            ...(conv?.contexto || {}),
            ...(convRes.nuevoContexto || {}),
            pedidoId: ped?.id,
            total: cot?.total || 0,
            itemsCount: cot?.items?.length || 0,
          },
        });

        const itemsTexto = (cot?.items || [])
          .map((i) => `• [${i.cantidad}x] *${limpiarNombreERP(i.nombre)}* ($${i.precioUnitario.toFixed(2)})`)
          .join('\n');

        const nombresItems = (cot?.items || []).map((i) => i.nombre);
        const sugerencia = generarSugerenciaVentaCruzada(nombresItems);
        const textoSugerencia = sugerencia ? sugerencia.textoSugerencia : '';

        const resumenTexto = `📋 *Cotización de Útiles* 📋\n🏪 *${nombreLibreria}* — Pedido ${pedidoNum}\n\n${itemsTexto}\n\n💰 *TOTAL ESTIMADO: ${totalFormateado}*${textoSugerencia}\n\n👉 *¿Deseas confirmar tu pedido?*\nResponde *SÍ* para confirmar o indícanos si deseas agregar algo más.`;

        await enviarMensaje(datos.instanceName, {
          numero: datos.numero,
          texto: resumenTexto,
        });

        return NextResponse.json({ ok: true, tipo: 'cotizacion_texto_enviada' });
      }

      // Si tiene imagen o PDF: aviso de cotización en progreso
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
