import { NextRequest, NextResponse } from 'next/server';
import { cotizar } from '@/server/services/matchingService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, lista } = body;
    if (!tenantId || !lista || !Array.isArray(lista)) {
      return NextResponse.json({ error: 'tenantId y lista son requeridos' }, { status: 400 });
    }

    const resultado = await cotizar(tenantId, lista);
    return NextResponse.json(resultado);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
