import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId.toLowerCase().trim();
  const sb = getSupabase();

  const { data: tenant, error } = await sb
    .from('tenants')
    .select('id, nombre, telefono, direccion')
    .or(`id.eq.${tenantId},telefono.eq.${tenantId}`)
    .maybeSingle();

  if (error || !tenant) {
    return NextResponse.json({
      tenant: {
        id: tenantId,
        nombre: tenantId.replace(/_/g, ' '),
        telefono: '',
      },
    });
  }

  return NextResponse.json({ tenant });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenantId = params.tenantId.toLowerCase().trim();
    const body = await req.json();
    const { telefono, nombre, direccion } = body;

    const sb = getSupabase();

    const updates: any = {};
    if (telefono !== undefined) {
      // Limpiar formato del teléfono (solo dígitos)
      updates.telefono = String(telefono).replace(/\D/g, '');
    }
    if (nombre !== undefined) updates.nombre = nombre.trim();
    if (direccion !== undefined) updates.direccion = direccion.trim();

    const { data: updated, error } = await sb
      .from('tenants')
      .update(updates)
      .or(`id.eq.${tenantId},telefono.eq.${tenantId}`)
      .select('id, nombre, telefono, direccion')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tenant: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
