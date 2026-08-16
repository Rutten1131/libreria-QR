// Endpoint del webhook de Evolution API.
// Ruta: POST /api/whatsapp/webhook (sin :tenantId en el path)
// El tenant se resuelve desde payload.instance → tenant_whatsapp de la BD.
import { Request, Response } from 'express';
import { getSupabase } from '../adapters/supabaseClient';
import { procesarListaCliente } from '../orchestrate/whatsappOrchestrator';
import { validarWebhookEvolution, enviarMensaje } from '../adapters/evolutionAdapter';

export async function webhookWhatsapp(req: Request, res: Response) {
  const payload = req.body;

  try {
    // 1. Validar estructura del webhook
    const datos = validarWebhookEvolution(payload);
    if (!datos) {
      return res.status(400).json({ error: 'webhook invalido' });
    }

    // 2. Validar aislamiento: instance del webhook debe pertenecer al tenantId del path
    const sb = getSupabase();
    const { data: tw, error: e1 } = await sb
      .from('tenant_whatsapp')
      .select('tenant_id, evolution_instance_id')
      .eq('evolution_instance_id', datos.instanceName)
      .single();

    if (e1 || !tw) {
      return res.status(404).json({ error: 'instance no registrada' });
    }

    // 3. Resolver tenant real desde la BD
    const tenantIdReal = tw.tenant_id;

    // 4. Procesar lista
    const resultado = await procesarListaCliente({
      tenantId: tenantIdReal,
      clienteNombre: 'Cliente WhatsApp', // PRD: nombre se obtiene despues
      clienteTelefono: datos.numero,
      textoOriginal: datos.texto,
      imagenBase64: datos.imagenBase64,
      mimeType: datos.mimeType,
    });

    // 5. Responder al cliente por WhatsApp
    const advertencia = resultado.advertencia ? `\n\nNOTA: ${resultado.advertencia}` : '';
    const resumen = `Tu cotizacion esta lista.${advertencia}\n\nTotal: $${resultado.cotizacion?.total.toFixed(2)}\nItems: ${resultado.cotizacion?.items.length}`;

    await enviarMensaje(datos.instanceName, {
      numero: datos.numero,
      texto: resumen,
    });

    return res.json({
      ok: true,
      pedido_id: resultado.pedido?.id,
      total: resultado.cotizacion?.total,
      advertencia: resultado.advertencia,
    });
  } catch (e: any) {
    console.error('[webhook error]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
