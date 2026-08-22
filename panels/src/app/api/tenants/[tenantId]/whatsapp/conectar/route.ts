import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { crearInstancia, configurarWebhook, obtenerQR, logoutInstancia } from '@/server/adapters/evolutionAdapter';

function instanceNameFromId(tenantId: string): string {
  return `qr_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId;
  const sb = getSupabase();

  let { data: tenant } = await sb.from('tenants').select('id, telefono').eq('id', tenantId).maybeSingle();
  if (!tenant) {
    const { data: newTenant } = await sb
      .from('tenants')
      .insert({
        id: tenantId,
        nombre: tenantId.replace(/_/g, ' '),
        telefono: '593900000000',
        activo: true,
      })
      .select()
      .single();
    tenant = newTenant;
  }

  const { data: existing } = await sb
    .from('tenant_whatsapp')
    .select('evolution_instance_name, evolution_state')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const instanceName = existing?.evolution_instance_name ?? instanceNameFromId(tenantId);

  try {
    try {
      await crearInstancia(instanceName);
    } catch {
      // Instancia ya existe — OK
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const webhookBase = process.env.WEBHOOK_BASE_URL || `${proto}://${host}`;

    try {
      await configurarWebhook(instanceName, `${webhookBase}/api/whatsapp/webhook`);
    } catch {}

    let qrResult = await obtenerQR(instanceName);

    // Si la instancia existía pero no devuelve QR (ej. sesión cerrada o estado stale), forzar logout y reintentar
    if (!qrResult?.base64) {
      await logoutInstancia(instanceName);
      qrResult = await obtenerQR(instanceName);
    }

    await sb.from('tenant_whatsapp').upsert(
      {
        tenant_id: tenantId,
        evolution_instance_id: instanceName,
        evolution_instance_name: instanceName,
        evolution_state: 'esperando_qr',
        evolution_qr: qrResult?.base64 ?? null,
        evolution_qr_expires_at: qrResult?.expiresAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    );

    return NextResponse.json({
      ok: true,
      qr: qrResult?.base64 ?? null,
      instanceName,
      expiresAt: qrResult?.expiresAt,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
