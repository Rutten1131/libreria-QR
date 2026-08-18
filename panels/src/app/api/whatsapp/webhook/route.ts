import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { procesarListaCliente } from '@/server/orchestrate/whatsappOrchestrator';
import { validarWebhookEvolution, enviarMensaje } from '@/server/adapters/evolutionAdapter';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const datos = validarWebhookEvolution(payload);

    // Si es un evento no procesable (ej. status, connection_update, typing, fromMe, etc.)
    if (!datos || (!datos.texto && !datos.imagenBase64)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

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

    // Procesar lista con IA y matching
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
      ? `\n⚠️ *No disponibles en catálogo:* ${faltantes.length} artículos.`
      : '';

    const totalFormateado = resultado.cotizacion?.total ? `$${resultado.cotizacion.total.toFixed(2)}` : '$0.00';
    const pedidoNum = resultado.pedido?.id ? `#${resultado.pedido.id.slice(-6)}` : '';

    const resumen = `📚 *¡Hola! Hemos recibido tu lista de útiles* 📚\n\n${lineasPreview}${masItems}\n\n✅ *Útiles encontrados:* ${itemsDisponibles.length}\n💵 *Total Estimado:* ${totalFormateado}${textoFaltantes}\n\n_Tu pedido ${pedidoNum} ya fue registrado en el sistema de la papelería. En breve un asesor te escribirá para confirmar tu entrega o retiro._`;

    // Responder al cliente por WhatsApp
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
  } catch (e: any) {
    console.error('[Webhook WhatsApp Error]', e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 200 });
  }
}
