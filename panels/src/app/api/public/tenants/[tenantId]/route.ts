import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId.toLowerCase().trim();
  const sb = getSupabase();

  const { data: tenant } = await sb
    .from('tenants')
    .select('id, nombre, telefono, direccion')
    .or(`id.eq.${tenantId},telefono.eq.${tenantId}`)
    .maybeSingle();

  if (tenant) {
    return NextResponse.json({ tenant });
  }

  // Fallback si no está en la base de datos
  return NextResponse.json({
    tenant: {
      id: tenantId,
      nombre: tenantId.replace(/_/g, ' ').toUpperCase(),
      telefono: '593900000000',
    },
  });
}
