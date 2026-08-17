// Adapter de pedidos — Supabase
import { getSupabase } from './supabaseClient';
import { Pedido, PedidoItem } from '../domain/entities';

interface PedidoRow {
  id: string;
  tenant_id: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  canal: string;
  estado: 'necesita_revision' | 'confirmado' | 'despachado' | 'cancelado';
  accion_pendiente: string | null;
  total: number;
  items_ambiguos: any;
  direccion_envio: any;
  created_at: string;
  updated_at: string;
}

function rowToPedido(row: PedidoRow, items: PedidoItem[]): Pedido {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clienteNombre: row.cliente_nombre ?? '',
    clienteTelefono: row.cliente_telefono ?? '',
    items,
    total: Number(row.total),
    estado: row.estado,
    accionPendiente: row.accion_pendiente ?? '',
    fechaCreacion: new Date(row.created_at),
    fechaActualizacion: new Date(row.updated_at),
  };
}

export async function guardarPedido(input: {
  tenantId: string;
  clienteNombre: string;
  clienteTelefono: string;
  canal: 'whatsapp' | 'web';
  items: PedidoItem[];
  total: number;
  accionPendiente: string;
  itemsAmbiguos?: string[];
}): Promise<Pedido> {
  const sb = getSupabase();

  // 1. Upsert cliente
  let clienteId: string | null = null;
  if (input.clienteTelefono) {
    const { data: existing } = await sb
      .from('clientes')
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('telefono', input.clienteTelefono)
      .maybeSingle();
    if (existing) {
      clienteId = existing.id;
    } else {
      // Cedula placeholder hasta que llegue al panel
      const cedulaPlaceholder = 'PEND-' + input.clienteTelefono.replace(/\D/g, '');
      const { data: created } = await sb
        .from('clientes')
        .insert({
          tenant_id: input.tenantId,
          telefono: input.clienteTelefono,
          nombre: input.clienteNombre,
          cedula: cedulaPlaceholder,
        })
        .select('id')
        .single();
      clienteId = created?.id ?? null;
    }
  }

  // 2. Crear pedido
  const { data: pedidoRow, error: e1 } = await sb
    .from('pedidos')
    .insert({
      tenant_id: input.tenantId,
      cliente_id: clienteId,
      cliente_nombre: input.clienteNombre,
      cliente_telefono: input.clienteTelefono,
      canal: input.canal,
      estado: 'necesita_revision',
      accion_pendiente: input.accionPendiente,
      total: input.total,
      items_ambiguos: input.itemsAmbiguos ?? [],
    })
    .select('*')
    .single();
  if (e1 || !pedidoRow) throw new Error(`crear pedido: ${e1?.message}`);

  // 3. Insertar items
  if (input.items.length > 0) {
    const itemRows = input.items.map((it) => ({
      pedido_id: pedidoRow.id,
      producto_id: it.productoId,
      nombre: it.nombre,
      variante: it.variante ?? null,
      cantidad: it.cantidad,
      precio_unitario: it.precioUnitario,
      match_confidence: it.matchConfidence,
    }));
    const { error: e2 } = await sb.from('pedido_items').insert(itemRows);
    if (e2) throw new Error(`insert items: ${e2.message}`);
  }

  // 4. Evento de auditoria
  await sb.from('pedido_eventos').insert({
    pedido_id: pedidoRow.id,
    tipo: 'creado',
    detalle: {
      canal: input.canal,
      items_count: input.items.length,
      total: input.total,
      accion_pendiente: input.accionPendiente,
    },
  });

  return rowToPedido(pedidoRow as PedidoRow, input.items);
}

export async function getPedidos(tenantId: string): Promise<Pedido[]> {
  const sb = getSupabase();
  const { data: rows, error } = await sb
    .from('pedidos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getPedidos: ${error.message}`);
  if (!rows || rows.length === 0) return [];

  // Cargar items en batch
  const pedidoIds = rows.map((r: any) => r.id);
  const { data: itemRows } = await sb
    .from('pedido_items')
    .select('*')
    .in('pedido_id', pedidoIds);

  const itemsPorPedido = new Map<string, PedidoItem[]>();
  for (const ir of itemRows ?? []) {
    const arr = itemsPorPedido.get(ir.pedido_id) ?? [];
    arr.push({
      productoId: ir.producto_id,
      nombre: ir.nombre,
      variante: ir.variante,
      cantidad: ir.cantidad,
      precioUnitario: Number(ir.precio_unitario),
      matchConfidence: ir.match_confidence,
    });
    itemsPorPedido.set(ir.pedido_id, arr);
  }

  return rows.map((r: any) =>
    rowToPedido(r as PedidoRow, itemsPorPedido.get(r.id) ?? [])
  );
}
