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

    const advertencia = resultado.advertencia ? `\n\n📌 *Nota:* ${resultado.advertencia}` : '';
    const totalFormateado = resultado.cotizacion?.total ? `$${resultado.cotizacion.total.toFixed(2)}` : '$0.00';
    const totalItems = resultado.cotizacion?.items?.length || 0;

    const resumen = `✨ *Tu Cotización está lista* ✨\n\n📋 *Artículos:* ${totalItems}\n💰 *Total Estimado:* ${totalFormateado}${advertencia}\n\n_Tu pedido ya fue registrado en el sistema de la papelería._`;

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
