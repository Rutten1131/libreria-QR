import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { consultarDetalleInstancia, obtenerQR } from '@/server/adapters/evolutionAdapter';

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId;
  const sb = getSupabase();

  const { data: tw } = await sb
    .from('tenant_whatsapp')
    .select('evolution_instance_name, evolution_state, evolution_qr, numero_whatsapp')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!tw?.evolution_instance_name) {
    return NextResponse.json({ whatsapp: null });
  }

  try {
    const detalle = await consultarDetalleInstancia(tw.evolution_instance_name);
    const estado = detalle.estado;
    let currentQR = tw.evolution_qr;
    let numeroReal = tw.numero_whatsapp;

    if (detalle.phoneNumber && detalle.phoneNumber.length >= 8) {
      numeroReal = detalle.phoneNumber;
      try {
        await sb
          .from('tenant_whatsapp')
          .update({
            numero_whatsapp: numeroReal,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId);

        await sb
          .from('tenants')
          .update({ telefono: numeroReal })
          .eq('id', tenantId);
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
            .eq('tenant_id', tenantId);
        }
      } catch {}
    }

    await sb
      .from('tenant_whatsapp')
      .update({
        evolution_state: estado,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    return NextResponse.json({
      whatsapp: {
        evolution_state: estado,
        evolution_instance_name: tw.evolution_instance_name,
        numero_whatsapp: numeroReal,
        evolution_qr: currentQR,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
