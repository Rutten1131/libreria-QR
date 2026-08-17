import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId;
  const body = await req.json();
  const items = body.items as Array<{
    nombre: string;
    familia?: string;
    precio?: number;
    stock?: number;
  }>;

  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: 'Array de items es requerido' }, { status: 400 });
  }

  const sb = getSupabase();
  let cargados = 0;
  let rechazados = 0;
  const detalle_rechazos: any[] = [];

  const rows = items.map((it) => ({
    tenant_id: tenantId,
    nombre: it.nombre.trim(),
    familia: (it.familia || 'general').trim().toLowerCase(),
    precio: typeof it.precio === 'number' ? it.precio : 0,
    disponible: true,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await sb
    .from('inventario_items')
    .upsert(rows, { onConflict: 'tenant_id, nombre' })
    .select();

  if (error) {
    // Si falla el upsert conjunto, intentar individualmente
    for (const r of rows) {
      const { error: errInd } = await sb.from('inventario_items').upsert(r, { onConflict: 'tenant_id, nombre' });
      if (errInd) {
        rechazados++;
        detalle_rechazos.push({ item: r, errores: [errInd.message] });
      } else {
        cargados++;
      }
    }
  } else {
    cargados = data?.length || rows.length;
  }

  return NextResponse.json({
    cargados,
    rechazados,
    detalle_rechazos,
  });
}
