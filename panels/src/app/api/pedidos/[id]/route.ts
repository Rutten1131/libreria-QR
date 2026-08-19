import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = getSupabase();
    const { data: pedido, error } = await sb
      .from('pedidos')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (error || !pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const { data: itemRows } = await sb
      .from('pedido_items')
      .select('*')
      .eq('pedido_id', params.id);

    return NextResponse.json({
      ...pedido,
      items: itemRows || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { estado } = body;
    const sb = getSupabase();

    const { data, error } = await sb
      .from('pedidos')
      .update({
        estado: estado === 'confirmado_pagado' ? 'confirmado' : estado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = getSupabase();

    // 1. Eliminar items y eventos asociados
    await sb.from('pedido_items').delete().eq('pedido_id', params.id);
    await sb.from('pedido_eventos').delete().eq('pedido_id', params.id);

    // 2. Eliminar pedido principal
    const { error } = await sb.from('pedidos').delete().eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: params.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
