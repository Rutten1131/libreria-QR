import { NextRequest, NextResponse } from 'next/server';
import { obtenerPedidos } from '@/server/services/pedidoService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId es requerido' }, { status: 400 });
    }

    const pedidos = await obtenerPedidos(tenantId);
    return NextResponse.json(pedidos);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
