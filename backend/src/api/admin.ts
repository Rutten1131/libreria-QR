// Endpoints admin (protegidos con requireOperador).
// GET   /api/admin/tenants                 -> listar todos
// POST  /api/admin/tenants                 -> crear nueva librería
// GET   /api/admin/tenants/:id             -> ver detalle
// GET   /api/admin/tenants/:id/whatsapp     -> ver estado Evolution
import { Request, Response } from 'express';
import { getSupabase } from '../adapters/supabaseClient';
import { AuthedRequest } from './middleware/auth';

function slugFromName(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || `tenant_${Date.now()}`;
}

export async function listarTenants(req: AuthedRequest, res: Response) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tenants')
    .select('id, nombre, telefono, direccion, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ tenants: data ?? [] });
}

export async function crearTenant(req: Request, res: Response) {
  const { nombre, telefono, direccion } = req.body ?? {};
  if (!nombre || typeof nombre !== 'string') {
    return res.status(400).json({ error: 'nombre requerido' });
  }

  const sb = getSupabase();
  let id = slugFromName(nombre);

  // Si ya existe, le agregamos sufijo numérico
  const { data: existing } = await sb.from('tenants').select('id').eq('id', id).maybeSingle();
  if (existing) {
    id = `${id}_${Date.now().toString().slice(-4)}`;
  }

  const { data, error } = await sb
    .from('tenants')
    .insert({ id, nombre, telefono: telefono ?? null, direccion: direccion ?? null })
    .select('id, nombre, telefono, direccion, created_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ tenant: data });
}

export async function verTenant(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tenants')
    .select('id, nombre, telefono, direccion, created_at')
    .eq('id', id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'tenant no encontrado' });
  return res.json({ tenant: data });
}

export async function verWhatsappTenant(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tenant_whatsapp')
    .select('numero_whatsapp, evolution_instance_name, evolution_state, evolution_qr, evolution_qr_expires_at, updated_at')
    .eq('tenant_id', id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ whatsapp: data ?? null });
}
