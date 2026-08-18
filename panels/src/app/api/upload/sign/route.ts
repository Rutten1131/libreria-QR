import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, fileType } = body;

    const supabaseUrl = process.env.SUPABASE_URL || 'https://hbqkcawfkqpyttjiumtp.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, { status: 500 });
    }

    const cleanExt = (fileName || 'foto.jpg').split('.').pop() || 'jpg';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;

    // Solicitar signed upload URL a Supabase Storage
    const res = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/listas_escolares/${cleanFileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase Storage Sign Error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const signedUploadUrl = `${supabaseUrl}/storage/v1${data.url}`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/listas_escolares/${cleanFileName}`;

    return NextResponse.json({
      ok: true,
      signedUploadUrl,
      publicUrl,
      fileName: cleanFileName,
    });
  } catch (e: any) {
    console.error('[API upload/sign error]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
