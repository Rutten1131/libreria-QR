import { NextRequest, NextResponse } from 'next/server';
import { crearPedido } from '@/server/services/pedidoService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cotizacion, clienteNombre, clienteTelefono, canal } = body;
    if (!cotizacion || !clienteNombre || !clienteTelefono) {
      return NextResponse.json({ error: 'cotizacion, clienteNombre y clienteTelefono son requeridos' }, { status: 400 });
    }

    const pedido = await crearPedido(
      cotizacion,
      clienteNombre,
      clienteTelefono,
      canal === 'web' ? 'web' : 'whatsapp'
    );
    return NextResponse.json(pedido);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
