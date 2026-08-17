import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { eliminarInstancia } from '@/server/adapters/evolutionAdapter';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId;
  const sb = getSupabase();

  const { data: tw } = await sb
    .from('tenant_whatsapp')
    .select('evolution_instance_name')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (tw?.evolution_instance_name) {
    try {
      await eliminarInstancia(tw.evolution_instance_name);
    } catch {}
  }

  await sb.from('tenant_whatsapp').delete().eq('tenant_id', tenantId);

  return NextResponse.json({ ok: true });
}
