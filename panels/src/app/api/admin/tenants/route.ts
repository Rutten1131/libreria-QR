import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/server/adapters/supabaseClient';

export async function GET(req: NextRequest) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tenants')
    .select('*, tenant_whatsapp(evolution_state, evolution_instance_name, numero_whatsapp)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, nombre, telefono, direccion } = body;

  if (!id || !nombre) {
    return NextResponse.json({ error: 'id y nombre son requeridos' }, { status: 400 });
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from('tenants')
    .insert({
      id: id.toLowerCase().trim(),
      nombre: nombre.trim(),
      telefono: telefono || '',
      direccion: direccion || '',
      activo: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
