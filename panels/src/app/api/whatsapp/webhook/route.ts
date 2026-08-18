import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { procesarListaCliente } from '@/server/orchestrate/whatsappOrchestrator';
import { validarWebhookEvolution, enviarMensaje } from '@/server/adapters/evolutionAdapter';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = payload?.event || payload?.data?.messageType || 'unknown';
    console.log(`[Webhook IN] event=${event} instance=${payload?.instance || 'N/A'} keys=${Object.keys(payload?.data || {}).join(',')}`);

    const datos = validarWebhookEvolution(payload);

    // Si es un evento no procesable (ej. status, connection_update, typing, fromMe, etc.)
    if (!datos || (!datos.texto && !datos.imagenBase64)) {
      console.log(`[Webhook] Evento ignorado: event=${event} datos=${datos ? 'parsed-but-empty' : 'null'}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    console.log(`[Webhook] Procesando: numero=${datos.numero} texto=${datos.texto?.substring(0, 40) || '(sin texto)'} imagen=${datos.imagenBase64 ? `${datos.imagenBase64.length} chars` : 'NO'} mime=${datos.mimeType}`);

    const sb = getSupabase();
    
    // Buscar tenant asociado a la instancia
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

    // Obtener nombre del negocio
    const { data: tenantObj } = await sb
      .from('tenants')
      .select('id, nombre')
      .eq('id', tenantIdReal)
      .maybeSingle();

    const nombreLibreria = tenantObj?.nombre || 'Librería';
    const textoLimpio = (datos.texto || '').trim();

    // 1. Detectar si es un saludo inicial (QR o mensaje de bienvenida)
    const esSaludo =
      !datos.imagenBase64 &&
      (textoLimpio.length < 6 ||
        /^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|saludos|quiero cotizar)/i.test(textoLimpio) ||
        textoLimpio.toLowerCase().includes('quiero cotizar mi lista'));

    if (esSaludo) {
      const bienvenida = `¡Hola! 👋 Bienvenido/a a *${nombreLibreria}* 📚✏️\n\nPor favor envíanos la *foto de tu lista escolar* 📸 (puedes enviar una o varias fotos), el archivo *PDF* 📄, o escribe los útiles que necesitas aquí en texto.\n\nTe calcularemos el presupuesto exacto al instante con nuestro inventario en stock.`;

      await enviarMensaje(datos.instanceName, {
        numero: datos.numero,
        texto: bienvenida,
      });

      return NextResponse.json({ ok: true, tipo: 'saludo_bienvenida' });
    }

    // 2. Procesar lista de útiles (imagen o texto)
    try {
      const resultado = await procesarListaCliente({
        tenantId: tenantIdReal,
        clienteNombre: 'Cliente WhatsApp',
        clienteTelefono: datos.numero,
        textoOriginal: datos.texto,
        imagenBase64: datos.imagenBase64,
        mimeType: datos.mimeType,
      });

      const itemsDisponibles = resultado.cotizacion?.items || [];
      const lineasPreview = itemsDisponibles
        .slice(0, 4)
        .map((it) => `• ${it.cantidad}x ${it.nombre} ($${(it.precioUnitario * it.cantidad).toFixed(2)})`)
        .join('\n');
      const masItems = itemsDisponibles.length > 4 ? `\n... y ${itemsDisponibles.length - 4} útiles más` : '';

      const faltantes = resultado.cotizacion?.ambiguos || [];
      const textoFaltantes = faltantes.length > 0
        ? `\n⚠️ *No disponibles en tienda:* ${faltantes.length} artículos.`
        : '';

      const totalFormateado = resultado.cotizacion?.total ? `$${resultado.cotizacion.total.toFixed(2)}` : '$0.00';
      const pedidoNum = resultado.pedido?.id ? `#${resultado.pedido.id.slice(-6)}` : '';

      const resumen = `📚 *¡Hola! Hemos recibido tu lista de útiles* 📚\n\n${lineasPreview}${masItems}\n\n✅ *Útiles encontrados:* ${itemsDisponibles.length}\n💵 *Total Estimado:* ${totalFormateado}${textoFaltantes}\n\n_Tu pedido ${pedidoNum} ya fue registrado en *${nombreLibreria}*. En breve un asesor te escribirá para confirmar tu entrega o retiro._`;

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
      const msgError = `No pudimos leer los útiles en tu mensaje o foto. 📸\n\nPor favor envíanos una foto más nítida de tu lista escolar o escribe los materiales que necesitas. ¡Con gusto te cotizamos!`;

      await enviarMensaje(datos.instanceName, {
        numero: datos.numero,
        texto: msgError,
      });

      return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
    }
  } catch (e: any) {
    console.error('[Webhook WhatsApp Error]', e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 200 });
  }
}
