import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { consultarDetalleInstancia, obtenerQR } from '@/server/adapters/evolutionAdapter';

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const rawId = params.tenantId.trim();
  const cleanPhone = rawId.replace(/[^0-9]/g, '');

  try {
    const sb = getSupabase();

    // 1. Buscar en tenant_whatsapp por tenant_id o por numero_whatsapp
    let { data: tw } = await sb
      .from('tenant_whatsapp')
      .select('tenant_id, evolution_instance_name, evolution_state, evolution_qr, numero_whatsapp')
      .or(`tenant_id.eq.${rawId},numero_whatsapp.eq.${cleanPhone || rawId}`)
      .maybeSingle();

    // 2. Si no se encontró directo, buscar en la tabla tenants por id o teléfono
    if (!tw) {
      const { data: tenant } = await sb
        .from('tenants')
        .select('id, telefono')
        .or(`id.eq.${rawId},telefono.eq.${cleanPhone || rawId}`)
        .maybeSingle();

      if (tenant?.id) {
        const { data: twByTenant } = await sb
          .from('tenant_whatsapp')
          .select('tenant_id, evolution_instance_name, evolution_state, evolution_qr, numero_whatsapp')
          .eq('tenant_id', tenant.id)
          .maybeSingle();
        tw = twByTenant;
      }
    }

    // 3. Si aún no existe instancia creada para este tenant
    if (!tw?.evolution_instance_name) {
      // Si el id es "libreria_prueba" o similar, fallback a qr_...
      const fallbackName = `qr_${rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)}`;
      const detalleFallback = await consultarDetalleInstancia(fallbackName);
      if (detalleFallback.estado === 'conectado') {
        return NextResponse.json({
          whatsapp: {
            evolution_state: 'conectado',
            evolution_instance_name: fallbackName,
            numero_whatsapp: detalleFallback.phoneNumber || cleanPhone,
            evolution_qr: null,
          },
        });
      }
      return NextResponse.json({ whatsapp: null, estado: 'desconectado' });
    }

    // 4. Consultar estado en tiempo real a Evolution API
    const detalle = await consultarDetalleInstancia(tw.evolution_instance_name);
    const estado = detalle.estado;
    let currentQR = tw.evolution_qr;
    let numeroReal = detalle.phoneNumber || tw.numero_whatsapp;

    if (numeroReal && numeroReal.length >= 8) {
      try {
        await sb
          .from('tenant_whatsapp')
          .update({
            numero_whatsapp: numeroReal,
            evolution_state: estado,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tw.tenant_id);

        await sb
          .from('tenants')
          .update({ telefono: numeroReal })
          .eq('id', tw.tenant_id);
      } catch {}
    }

    if (estado !== 'conectado') {
      try {
        const qrResult = await obtenerQR(tw.evolution_instance_name);
        if (qrResult?.base64) {
          currentQR = qrResult.base64;
          await sb
            .from('tenant_whatsapp')
            .update({
              evolution_qr: currentQR,
              evolution_qr_expires_at: qrResult.expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', tw.tenant_id);
        }
      } catch {}
    }

    return NextResponse.json({
      whatsapp: {
        evolution_state: estado,
        evolution_instance_name: tw.evolution_instance_name,
        numero_whatsapp: numeroReal,
        evolution_qr: estado === 'conectado' ? null : currentQR,
      },
    });
  } catch (e: any) {
    console.error('[API WhatsApp Status Error]', e.message);
    return NextResponse.json({ error: e.message, estado: 'desconectado' }, { status: 200 });
  }
}
