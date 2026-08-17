import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';
import { enviarEmailOTP } from '@/server/services/mailerService';
import { verificarOperador } from '@/server/services/authService';

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;
    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    const operador = await verificarOperador(email);
    if (!operador) {
      return NextResponse.json({ error: 'Email no autorizado' }, { status: 403 });
    }

    const codigo = generarCodigo();
    const sb = getSupabase();

    // Guardar OTP en BD
    await sb.from('otp_codes').upsert(
      {
        email: email.trim().toLowerCase(),
        codigo,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        usado: false,
      },
      { onConflict: 'email' }
    );

    await enviarEmailOTP(email, codigo);
    return NextResponse.json({ ok: true, message: 'Código OTP enviado' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
