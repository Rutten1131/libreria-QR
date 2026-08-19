import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';

async function resolveTenantId(idOrPhone: string): Promise<string> {
  const clean = idOrPhone.trim();
  const sb = getSupabase();
  const { data } = await sb
    .from('tenants')
    .select('id')
    .or(`id.eq.${clean},telefono.eq.${clean}`)
    .maybeSingle();

  return data?.id || clean;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const rawId = params.tenantId;
    const sb = getSupabase();
    const tenantId = await resolveTenantId(rawId);

    const todosLosProductos: any[] = [];
    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await sb
        .from('productos')
        .select('id, tenant_id, categoria, familia, codigo_sku, nombre, precio, stock_cantidad')
        .or(`tenant_id.eq.${tenantId},tenant_id.eq.${rawId}`)
        .range(from, from + PAGE_SIZE - 1)
        .order('nombre');

      if (error) {
        console.error('[API inventario error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data && data.length > 0) {
        todosLosProductos.push(...data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      } else {
        hasMore = false;
      }
    }

    const productos = todosLosProductos.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      categoria: r.categoria || 'general',
      codigo_sku: r.codigo_sku,
      nombre: r.nombre,
      familia: r.familia || 'general',
      precio: Number(r.precio || 0),
      stock_cantidad: Number(r.stock_cantidad ?? 0),
      disponible: (Number(r.stock_cantidad ?? 0)) > 0,
    }));

    return NextResponse.json(productos);
  } catch (e: any) {
    console.error('[API inventario crash]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const rawId = params.tenantId;
    const body = await req.json();
    const { id, disponible } = body;

    const sb = getSupabase();
    const tenantId = await resolveTenantId(rawId);
    const nuevoStock = disponible ? 100 : 0;

    const { data, error } = await sb
      .from('productos')
      .update({ stock_cantidad: nuevoStock })
      .or(`tenant_id.eq.${tenantId},tenant_id.eq.${rawId}`)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      nombre: data.nombre,
      familia: data.familia,
      precio: Number(data.precio),
      disponible: data.stock_cantidad > 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
