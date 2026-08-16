// Adapter de conversaciones — Supabase
import { getSupabase } from './supabaseClient';
import { ConversationState } from '../domain/conversationState';

export interface Conversacion {
  id: string;
  tenantId: string;
  clienteTelefono: string;
  estadoActual: ConversationState;
  contexto: Record<string, any>;
  ultimoMensaje: string | null;
  requiereHumano: boolean;
  contadorFrustracion: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Row {
  id: string;
  tenant_id: string;
  cliente_telefono: string;
  estado_actual: ConversationState;
  contexto: any;
  ultimo_mensaje: string | null;
  requiere_humano: boolean;
  contador_frustracion: number;
  created_at: string;
  updated_at: string;
}

function rowToConversacion(row: Row): Conversacion {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clienteTelefono: row.cliente_telefono,
    estadoActual: row.estado_actual,
    contexto: row.contexto ?? {},
    ultimoMensaje: row.ultimo_mensaje,
    requiereHumano: row.requiere_humano,
    contadorFrustracion: row.contador_frustracion,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function obtenerConversacion(
  tenantId: string,
  telefono: string
): Promise<Conversacion | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from('conversaciones')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('cliente_telefono', telefono)
    .maybeSingle();
  return data ? rowToConversacion(data as Row) : null;
}

export async function crearConversacion(
  tenantId: string,
  telefono: string
): Promise<Conversacion> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('conversaciones')
    .insert({
      tenant_id: tenantId,
      cliente_telefono: telefono,
      estado_actual: 'INICIAL',
      contexto: {},
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(`crear conversacion: ${error?.message}`);
  return rowToConversacion(data as Row);
}

export async function actualizarConversacion(
  id: string,
  cambios: Partial<{
    estadoActual: ConversationState;
    contexto: Record<string, any>;
    ultimoMensaje: string;
    requiereHumano: boolean;
    contadorFrustracion: number;
  }>
): Promise<Conversacion> {
  const sb = getSupabase();
  const update: any = {};
  if (cambios.estadoActual !== undefined) update.estado_actual = cambios.estadoActual;
  if (cambios.contexto !== undefined) update.contexto = cambios.contexto;
  if (cambios.ultimoMensaje !== undefined) update.ultimo_mensaje = cambios.ultimoMensaje;
  if (cambios.requiereHumano !== undefined) update.requiere_humano = cambios.requiereHumano;
  if (cambios.contadorFrustracion !== undefined) update.contador_frustracion = cambios.contadorFrustracion;

  const { data, error } = await sb
    .from('conversaciones')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) throw new Error(`actualizar conversacion: ${error?.message}`);
  return rowToConversacion(data as Row);
}
