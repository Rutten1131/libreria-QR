import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId;
  const sb = getSupabase();

  const { data, error } = await sb
    .from('inventario_items')
    .select('id, nombre, familia, precio, disponible, updated_at')
    .eq('tenant_id', tenantId)
    .order('nombre');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId;
  const body = await req.json();
  const { id, disponible } = body;

  const sb = getSupabase();
  const { data, error } = await sb
    .from('inventario_items')
    .update({ disponible, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
