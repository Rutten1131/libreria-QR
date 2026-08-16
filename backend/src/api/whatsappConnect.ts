// Endpoints Evolution por tenant (operador).
// POST /api/admin/tenants/:id/whatsapp/conectar  { numero_whatsapp } -> crea instance + registra row + setWebhook
// GET  /api/admin/tenants/:id/whatsapp/qr       -> devuelve QR fresco (TTL 60s)
// GET  /api/admin/tenants/:id/whatsapp/status   -> consulta estado actual
// DELETE /api/admin/tenants/:id/whatsapp         -> elimina instance + row
import { Request, Response } from 'express';
import { getSupabase } from '../adapters/supabaseClient';
import {
  crearInstancia,
  configurarWebhook,
  obtenerQR,
  consultarEstado,
  eliminarInstancia,
} from '../adapters/evolutionAdapter';
import { AuthedRequest } from './middleware/auth';

const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL ?? '';

function instanceNameFromId(tenantId: string): string {
  // Evolution exige nombres sin caracteres especiales. Usamos el tenant_id.
  return `qr_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)}`;
}

export async function conectarWhatsapp(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const { numero_whatsapp } = req.body ?? {};

  if (!numero_whatsapp || typeof numero_whatsapp !== 'string') {
    return res.status(400).json({ error: 'numero_whatsapp requerido' });
  }

  const sb = getSupabase();

  // Verificar que el tenant existe
  const { data: tenant } = await sb.from('tenants').select('id').eq('id', id).single();
  if (!tenant) return res.status(404).json({ error: 'tenant no existe' });

  const instanceName = instanceNameFromId(id);

  try {
    // 1. Crear instancia en Evolution (idempotente)
    const { estado } = await crearInstancia(instanceName);

    // 2. Configurar webhook
    if (WEBHOOK_BASE_URL) {
      await configurarWebhook(instanceName, `${WEBHOOK_BASE_URL}/api/whatsapp/webhook`);
    }

    // 3. Obtener QR fresco
    const qr = await obtenerQR(instanceName);

    // 4. Upsert en tenant_whatsapp
    const { data, error } = await sb
      .from('tenant_whatsapp')
      .upsert(
        {
          tenant_id: id,
          numero_whatsapp,
          evolution_instance_id: instanceName,
          evolution_instance_name: instanceName,
          evolution_state: estado,
          evolution_qr: qr?.base64 ?? null,
          evolution_qr_expires_at: qr?.expiresAt?.toISOString() ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'numero_whatsapp' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({
      ok: true,
      whatsapp: data,
      qr: qr ? { base64: qr.base64, expiresAt: qr.expiresAt } : null,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

export async function whatsappQR(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const sb = getSupabase();

  const { data: tw } = await sb
    .from('tenant_whatsapp')
    .select('evolution_instance_name')
    .eq('tenant_id', id)
    .maybeSingle();

  if (!tw?.evolution_instance_name) {
    return res.status(404).json({ error: 'tenant sin WhatsApp configurado' });
  }

  try {
    const qr = await obtenerQR(tw.evolution_instance_name);
    if (!qr) return res.status(404).json({ error: 'no hay QR disponible' });

    // Actualizar QR en BD
    await sb
      .from('tenant_whatsapp')
      .update({
        evolution_qr: qr.base64,
        evolution_qr_expires_at: qr.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', id);

    return res.json({ qr: { base64: qr.base64, expiresAt: qr.expiresAt } });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

export async function whatsappStatus(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const sb = getSupabase();

  const { data: tw } = await sb
    .from('tenant_whatsapp')
    .select('evolution_instance_name')
    .eq('tenant_id', id)
    .maybeSingle();

  if (!tw?.evolution_instance_name) {
    return res.json({ whatsapp: null });
  }

  try {
    const estado = await consultarEstado(tw.evolution_instance_name);

    await sb
      .from('tenant_whatsapp')
      .update({
        evolution_state: estado,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', id);

    return res.json({ whatsapp: { evolution_state: estado } });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

export async function desconectarWhatsapp(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const sb = getSupabase();

  const { data: tw } = await sb
    .from('tenant_whatsapp')
    .select('evolution_instance_name')
    .eq('tenant_id', id)
    .maybeSingle();

  if (!tw?.evolution_instance_name) {
    return res.status(404).json({ error: 'tenant sin WhatsApp configurado' });
  }

  try {
    await eliminarInstancia(tw.evolution_instance_name);
    await sb.from('tenant_whatsapp').delete().eq('tenant_id', id);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
