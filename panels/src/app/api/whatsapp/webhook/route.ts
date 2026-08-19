import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { procesarListaCliente } from '@/server/orchestrate/whatsappOrchestrator';
import { validarWebhookEvolution, enviarMensaje } from '@/server/adapters/evolutionAdapter';
import {
  obtenerConversacion,
  crearConversacion,
  actualizarConversacion,
} from '@/server/adapters/conversacionAdapter';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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
      // Fallback: extraer slug de instancia (ej: qr_libreria_prueba -> libreria_prueba)
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

    // 2. Obtener datos del negocio (nombre y teléfono de notificación del asesor)
    const { data: tenantObj } = await sb
      .from('tenants')
      .select('id, nombre, telefono')
      .eq('id', tenantIdReal)
      .maybeSingle();

    const nombreLibreria = tenantObj?.nombre || 'Librería';
    const telefonoAsesor = tenantObj?.telefono ? tenantObj.telefono.replace(/\D/g, '') : '';
    const textoLimpio = (datos.texto || '').trim();
    const tieneImagen = Boolean(datos.imagenBase64);

    // 3. Consultar o inicializar estado de la conversación con este cliente
    let conv = await obtenerConversacion(tenantIdReal, datos.numero);

    // 4. Detectar si el mensaje es el inicio del flujo QR
    const esMensajeQR = /quiero cotizar mi lista|quiero cotizar/i.test(textoLimpio);

    // Si escanea el QR nuevamente, reiniciamos el handoff y la conversación
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

    // 5. Si la conversación está en HANDOFF (humano activo) y NO es escaneo de QR -> SILENCIO TOTAL
    if (conv?.requiereHumano && !esMensajeQR) {
      console.log(`[Webhook WhatsApp] Chat en handoff humano ignorado: ${datos.numero}`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'en_handoff_humano' });
    }

    // 6. Si el cliente está respondiendo para CONFIRMAR la cotización
    const esConfirmacionAfirmativa =
      /^(s[ií]|si confirmo|confirmo|confirmar|de acuerdo|listo|dale|ok|si por favor|si deseo|si quiero|deseo confirmar|por favor|claro)/i.test(
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

      // B) Marcar conversación en HANDOFF humano
      await actualizarConversacion(conv.id, {
        estadoActual: 'DERIVADO_A_HUMANO',
        requiereHumano: true,
        contexto: { ...conv.contexto, confirmado: true },
      });

      // C) Mensaje de confirmación al cliente con su enlace a la proforma
      const msgConfirmacionCliente = `🎉 *¡Pedido Confirmado con Éxito!* 🎉\n🏪 *${nombreLibreria}* — Pedido ${pedidoNum}\n\n📄 *Ver cotización o descargar proforma en PDF:*\n${linkPublico}\n\n👩‍💼 _Un asesor de nuestra tienda ya fue notificado y se comunicará contigo por este chat para coordinar la entrega o retiro. ¡Muchas gracias por tu preferencia!_`;

      await enviarMensaje(datos.instanceName, {
        numero: datos.numero,
        texto: msgConfirmacionCliente,
      });

      // D) Notificar por WhatsApp al número del ASESOR / DUEÑO del negocio
      if (telefonoAsesor && telefonoAsesor !== datos.numero.replace(/\D/g, '')) {
        const msgAsesor = `🔔 *¡Nuevo Pedido Confirmado!* 🔔\n🏪 *${nombreLibreria}* — Pedido ${pedidoNum}\n👤 *Cliente:* ${datos.pushName || 'Cliente WhatsApp'} (+${datos.numero})\n💰 *Total Estimado:* $${totalNum.toFixed(2)}\n\n📄 *Ver proforma y pedido:* \n${linkPublico}\n\n👉 _Por favor comunícate con el cliente para coordinar el despacho._`;

        await enviarMensaje(datos.instanceName, {
          numero: telefonoAsesor,
          texto: msgAsesor,
        });
      }

      return NextResponse.json({ ok: true, tipo: 'pedido_confirmado_y_derivado_a_humano' });
    }

    // 7. Si NO es la frase del QR, NI tiene imagen/PDF, NI es confirmación -> IGNORAR SILENCIOSAMENTE
    if (!esMensajeQR && !tieneImagen) {
      console.log(`[Webhook WhatsApp] Chat ignorado (no es QR ni lista): "${textoLimpio.substring(0, 40)}"`);
      return NextResponse.json({ ok: true, ignored: true, reason: 'mensaje no escolar' });
    }

    // 8. Procesar lista de útiles (imagen o texto tras el QR)
    try {
      // Mensaje inmediato al cliente para avisarle que estamos trabajando en su lista
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

      // Actualizar estado de la conversación a ESPERANDO_CONFIRMACION
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

      // Mensaje de cotización solicitando confirmación al cliente
      const resumen = `📋 *Cotización de Útiles Escolares* 📋\n🏪 *${nombreLibreria}* — Pedido ${pedidoNum}\n\n✅ *${itemsDisponibles.length} útiles encontrados en stock*\n⚠️ *${faltantes.length} artículos no disponibles en tienda*\n\n💰 *TOTAL ESTIMADO: ${totalFormateado}*\n\n👉 *¿Deseas confirmar tu pedido con estos útiles?*\nResponde *SÍ* para confirmar tu pedido o envíanos cualquier duda o cambio.`;

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

      if (tieneImagen || esMensajeQR) {
        const msgError = `No pudimos leer los útiles en tu lista o foto. 📸\n\nPor favor envíanos una foto más nítida de tu lista escolar o escribe los materiales que necesitas. ¡Con gusto te cotizamos!`;

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
