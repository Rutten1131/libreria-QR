// Adapter de clientes — upsert + extraccion de CRM
import { getSupabase } from './supabaseClient';

export interface ClienteCRM {
  id: string;
  tenantId: string;
  telefono: string;
  nombre: string | null;
  cedula: string | null;
  lugarTrabajo: string | null;
  horarioTrabajo: string | null;
  cantidadHijos: number | null;
  edadesHijos: number[] | null;
  nombresHijos: string[] | null;
  cumpleHijos: Array<{ nombre: string; fecha: string }> | null;
  cumpleCliente: string | null; // YYYY-MM-DD
  aniversario: string | null;
  direccion: string | null;
  distrito: string | null;
  historialCount: number;
  ultimoPedidoAt: Date | null;
  preferencias: Record<string, any>;
  notas: string | null;
}

interface Row {
  id: string;
  tenant_id: string;
  telefono: string;
  nombre: string | null;
  cedula: string | null;
  lugar_trabajo: string | null;
  horario_trabajo: string | null;
  cantidad_hijos: number | null;
  edades_hijos: number[] | null;
  nombres_hijos: string[] | null;
  cumple_hijos: any;
  cumple_cliente: string | null;
  aniversario: string | null;
  direccion: string | null;
  distrito: string | null;
  historial_count: number;
  ultimo_pedido_at: string | null;
  preferencias: any;
  notas: string | null;
}

function rowToCliente(row: Row): ClienteCRM {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    telefono: row.telefono,
    nombre: row.nombre,
    cedula: row.cedula,
    lugarTrabajo: row.lugar_trabajo,
    horarioTrabajo: row.horario_trabajo,
    cantidadHijos: row.cantidad_hijos,
    edadesHijos: row.edades_hijos,
    nombresHijos: row.nombres_hijos,
    cumpleHijos: row.cumple_hijos,
    cumpleCliente: row.cumple_cliente,
    aniversario: row.aniversario,
    direccion: row.direccion,
    distrito: row.distrito,
    historialCount: row.historial_count,
    ultimoPedidoAt: row.ultimo_pedido_at ? new Date(row.ultimo_pedido_at) : null,
    preferencias: row.preferencias ?? {},
    notas: row.notas,
  };
}

export async function obtenerOCrearCliente(
  tenantId: string,
  telefono: string,
  cedulaPlaceholder?: string
): Promise<ClienteCRM> {
  const sb = getSupabase();
  const { data: existing } = await sb
    .from('clientes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('telefono', telefono)
    .maybeSingle();
  if (existing) return rowToCliente(existing as Row);

  const { data: created, error } = await sb
    .from('clientes')
    .insert({
      tenant_id: tenantId,
      telefono,
      cedula: cedulaPlaceholder ?? `PEND-${telefono.replace(/\D/g, '')}`,
    })
    .select('*')
    .single();
  if (error || !created) throw new Error(`crear cliente: ${error?.message}`);
  return rowToCliente(created as Row);
}

export async function actualizarCRMCliente(
  id: string,
  cambios: Partial<ClienteCRM>
): Promise<ClienteCRM> {
  const sb = getSupabase();
  const update: any = {};
  if (cambios.nombre !== undefined) update.nombre = cambios.nombre;
  if (cambios.cedula !== undefined) update.cedula = cambios.cedula;
  if (cambios.lugarTrabajo !== undefined) update.lugar_trabajo = cambios.lugarTrabajo;
  if (cambios.horarioTrabajo !== undefined) update.horario_trabajo = cambios.horarioTrabajo;
  if (cambios.cantidadHijos !== undefined) update.cantidad_hijos = cambios.cantidadHijos;
  if (cambios.edadesHijos !== undefined) update.edades_hijos = cambios.edadesHijos;
  if (cambios.nombresHijos !== undefined) update.nombres_hijos = cambios.nombresHijos;
  if (cambios.cumpleHijos !== undefined) update.cumple_hijos = cambios.cumpleHijos;
  if (cambios.cumpleCliente !== undefined) update.cumple_cliente = cambios.cumpleCliente;
  if (cambios.aniversario !== undefined) update.aniversario = cambios.aniversario;
  if (cambios.direccion !== undefined) update.direccion = cambios.direccion;
  if (cambios.distrito !== undefined) update.distrito = cambios.distrito;
  if (cambios.historialCount !== undefined) update.historial_count = cambios.historialCount;
  if (cambios.ultimoPedidoAt !== undefined) update.ultimo_pedido_at = cambios.ultimoPedidoAt;
  if (cambios.preferencias !== undefined) update.preferencias = cambios.preferencias;
  if (cambios.notas !== undefined) update.notas = cambios.notas;

  const { data, error } = await sb
    .from('clientes')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) throw new Error(`actualizar cliente: ${error?.message}`);
  return rowToCliente(data as Row);
}
