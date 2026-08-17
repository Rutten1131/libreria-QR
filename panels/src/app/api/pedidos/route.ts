import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { obtenerPedidos } from '@/server/services/pedidoService';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get('tenantId');
    if (!rawId) {
      return NextResponse.json({ error: 'tenantId es requerido' }, { status: 400 });
    }

    const tenantId = await resolveTenantId(rawId);
    let pedidos = await obtenerPedidos(tenantId);

    if ((!pedidos || pedidos.length === 0) && tenantId !== rawId) {
      pedidos = await obtenerPedidos(rawId);
    }

    return NextResponse.json(pedidos || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
