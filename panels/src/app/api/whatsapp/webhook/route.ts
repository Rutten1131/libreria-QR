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
        clienteNombre: datos.pushName || 'Cliente WhatsApp',
        clienteTelefono: datos.numero,
        textoOriginal: datos.texto,
        imagenBase64: datos.imagenBase64,
        mimeType: datos.mimeType,
      });

      const itemsDisponibles = resultado.cotizacion?.items || [];
      const faltantes = resultado.cotizacion?.ambiguos || [];

      // Listar todos los materiales encontrados con cantidades y precios
      const lineasDisponibles = itemsDisponibles
        .map((it) => `• ${it.cantidad}x ${it.nombre} — $${(it.precioUnitario * it.cantidad).toFixed(2)}`)
        .join('\n');

      // Listar los materiales que no se encontraron en la tienda
      const lineasFaltantes = faltantes.length > 0
        ? `\n\n⚠️ *No disponibles en stock (${faltantes.length}):*\n` + faltantes.map((f) => `• ${f}`).join('\n')
        : '';

      const totalFormateado = resultado.cotizacion?.total ? `$${resultado.cotizacion.total.toFixed(2)}` : '$0.00';
      const pedidoNum = resultado.pedido?.id ? `#${resultado.pedido.id.slice(-6)}` : '';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://libreria-qr-brown.vercel.app';
      const linkPublico = `${appUrl}/pedir/${tenantIdReal}?pedido=${resultado.pedido?.id}`;

      const resumen = `📋 *Cotización de Útiles Escolares* 📋\n🏪 *${nombreLibreria}* — Pedido ${pedidoNum}\n\n✅ *Materiales Disponibles en Tienda:*\n${lineasDisponibles || '• Ninguno emparejado automáticamente'}${lineasFaltantes}\n\n━━━━━━━━━━━━━━━━━━━━\n📦 *${itemsDisponibles.length} útiles encontrados* | ⚠️ *${faltantes.length} no disponibles*\n💰 *TOTAL ESTIMADO: ${totalFormateado}*\n━━━━━━━━━━━━━━━━━━━━\n\n📄 *Ver desglose completo o descargar proforma:*\n${linkPublico}\n\n_Tu pedido ya fue registrado en el sistema. En breve un asesor te escribirá para confirmar tu entrega o retiro._`;

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
