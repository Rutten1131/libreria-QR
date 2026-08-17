import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { procesarListaCliente } from '@/server/orchestrate/whatsappOrchestrator';
import { validarWebhookEvolution, enviarMensaje } from '@/server/adapters/evolutionAdapter';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const datos = validarWebhookEvolution(payload);
    if (!datos) {
      return NextResponse.json({ error: 'webhook invalido' }, { status: 400 });
    }

    const sb = getSupabase();
    const { data: tw, error: e1 } = await sb
      .from('tenant_whatsapp')
      .select('tenant_id, evolution_instance_id')
      .eq('evolution_instance_id', datos.instanceName)
      .single();

    if (e1 || !tw) {
      return NextResponse.json({ error: 'instance no registrada' }, { status: 404 });
    }

    const tenantIdReal = tw.tenant_id;

    const resultado = await procesarListaCliente({
      tenantId: tenantIdReal,
      clienteNombre: 'Cliente WhatsApp',
      clienteTelefono: datos.numero,
      textoOriginal: datos.texto,
      imagenBase64: datos.imagenBase64,
      mimeType: datos.mimeType,
    });

    const advertencia = resultado.advertencia ? `\n\nNOTA: ${resultado.advertencia}` : '';
    const resumen = `Tu cotización está lista.${advertencia}\n\nTotal: $${resultado.cotizacion?.total.toFixed(2)}\nItems: ${resultado.cotizacion?.items.length}`;

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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
