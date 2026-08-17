import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { verificarOperador, getOperadorPorJWT } from '@/server/services/authService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, codigo } = body;
    if (!email || !codigo) {
      return NextResponse.json({ error: 'Email y código son requeridos' }, { status: 400 });
    }

    const sb = getSupabase();
    const cleanEmail = email.trim().toLowerCase();

    // Verificar OTP
    const { data: otp } = await sb
      .from('otp_codes')
      .select('codigo, expires_at, usado')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!otp || otp.usado || otp.codigo !== codigo) {
      return NextResponse.json({ error: 'Código inválido o ya usado' }, { status: 401 });
    }

    if (new Date(otp.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Código expirado' }, { status: 401 });
    }

    // Marcar como usado
    await sb.from('otp_codes').update({ usado: true }).eq('email', cleanEmail);

    // Obtener datos del operador
    const operador = await verificarOperador(cleanEmail);
    if (!operador) {
      return NextResponse.json({ error: 'Operador no encontrado' }, { status: 403 });
    }

    // Obtener tenants asignados
    const { data: tenants } = await sb
      .from('tenants')
      .select('id, nombre')
      .limit(50);

    return NextResponse.json({
      ok: true,
      operador: {
        id: operador.id,
        email: operador.email,
        nombre: operador.nombre,
      },
      tenants: tenants || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
