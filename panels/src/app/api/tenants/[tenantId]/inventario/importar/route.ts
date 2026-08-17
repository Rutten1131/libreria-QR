import { NextRequest, NextResponse } from 'next/server';
import { cargarInventario } from '@/server/services/inventarioService';
import { getSupabase } from '@/server/adapters/supabaseClient';

async function resolveTenantId(idOrPhone: string): Promise<string> {
  const clean = idOrPhone.trim();
  const sb = getSupabase();
  const { data } = await sb
    .from('tenants')
    .select('id')
    .or(`id.eq.${clean},telefono.eq.${clean}`)
    .maybeSingle();

  if (data?.id) return data.id;

  // Si no existe, crearlo para evitar error
  const { data: newTenant } = await sb
    .from('tenants')
    .insert({
      id: clean,
      nombre: clean.replace(/_/g, ' '),
      telefono: '593900000000',
      activo: true,
    })
    .select('id')
    .single();

  return newTenant?.id || clean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const rawTenantId = params.tenantId;
    const tenantId = await resolveTenantId(rawTenantId);
    const body = await req.json();

    const items = (body.items || []).map((it: any) => ({
      nombre: String(it.nombre || '').trim(),
      familia: String(it.familia || 'general').trim().toLowerCase(),
      precio: typeof it.precio === 'number' ? it.precio : parseFloat(String(it.precio || '0').replace(',', '.')),
      stock: typeof it.stock === 'number' ? it.stock : (typeof it.stock_cantidad === 'number' ? it.stock_cantidad : 100),
      variantes: it.variantes,
    }));

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Array de items es requerido' }, { status: 400 });
    }

    const resultado = await cargarInventario({
      tenant_id: tenantId,
      items,
    });

    return NextResponse.json(resultado);
  } catch (e: any) {
    console.error('[API Importar Inventario Error]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
