import type { Pedido, Producto, Comanda } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const TIMEOUT_MS = 10000;

async function fetchConTimeout(url: string, opts: RequestInit = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/* ============================================================
   TENANT LOOKUP PRIVADO
   ============================================================ */

export interface PublicTenant {
  id: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
}

export async function buscarTenantPublico(idOrPhone: string): Promise<PublicTenant | null> {
  const clean = idOrPhone.trim().toLowerCase();
  try {
    const res = await fetchConTimeout(`${API_URL}/api/public/tenants/${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.tenant) return data.tenant;
    }
  } catch {}

  return { id: clean, nombre: clean.replace(/_/g, ' ').toUpperCase() };
}

/* ============================================================
   PEDIDOS (REAL DATABASE)
   ============================================================ */

export async function listarPedidos(tenantId: string): Promise<Pedido[]> {
  try {
    const res = await fetchConTimeout(`${API_URL}/api/pedidos?tenantId=${encodeURIComponent(tenantId)}`);
    if (res.ok) {
      const raw = await res.json();
      if (Array.isArray(raw)) {
        return raw.map((p: any) => ({
          id: p.id,
          tenant_id: p.tenant_id || p.tenantId || tenantId,
          cliente_nombre: p.cliente_nombre || p.clienteNombre || 'Cliente WhatsApp',
          cliente_telefono: p.cliente_telefono || p.clienteTelefono || '',
          estado: p.estado === 'confirmado' ? 'confirmado_pagado' : (p.estado || 'necesita_revision'),
          items: (p.items || []).map((it: any) => ({
            nombre: it.nombre,
            cantidad: it.cantidad,
            precio_unitario: it.precioUnitario ?? it.precio_unitario ?? 0,
            subtotal: it.subtotal ?? (it.cantidad * (it.precioUnitario ?? it.precio_unitario ?? 0)),
          })),
          total: p.total ?? 0,
          created_at: p.created_at || p.createdAt || new Date().toISOString(),
          updated_at: p.updated_at || p.updatedAt || new Date().toISOString(),
          accion_pendiente: p.accion_pendiente || (p.estado === 'necesita_revision' ? 'Revisar items' : undefined),
        }));
      }
    }
  } catch (e) {
    console.error('[API listarPedidos error]', e);
  }

  return [];
}

export async function getPedido(tenantId: string, id: string): Promise<Pedido | null> {
  const pedidos = await listarPedidos(tenantId);
  return pedidos.find((p) => p.id === id) || null;
}

/* ============================================================
   INVENTARIO / PRODUCTOS (REAL DATABASE)
   ============================================================ */

export async function listarProductos(tenantId: string): Promise<Producto[]> {
  try {
    const res = await fetchConTimeout(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/inventario`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          id: item.id,
          nombre: item.nombre,
          familia: item.familia || 'general',
          precio: typeof item.precio === 'number' ? item.precio : parseFloat(item.precio || '0'),
          disponible: item.disponible !== false,
        }));
      }
    }
  } catch (e) {
    console.error('[API listarProductos error]', e);
  }

  return [];
}

export async function toggleProductoStock(tenantId: string, productoId: string, disponible: boolean): Promise<boolean> {
  try {
    const res = await fetchConTimeout(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/inventario`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productoId, disponible }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ============================================================
   DESPACHOS (REAL DATABASE)
   ============================================================ */

export async function listarComandas(tenantId: string): Promise<Comanda[]> {
  const pedidos = await listarPedidos(tenantId);
  return pedidos
    .filter((p) => p.estado === 'confirmado_pagado' || p.estado === 'despachado')
    .map((p) => ({
      pedido_id: p.id,
      cliente: p.cliente_nombre,
      direccion: 'Retiro en mostrador / Por coordinar',
      items: p.items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad })),
      created_at: p.created_at,
    }));
}

export async function actualizarEstadoPedido(
  tenantId: string,
  pedidoId: string,
  nuevoEstado: 'necesita_revision' | 'confirmado_pagado' | 'despachado'
): Promise<boolean> {
  try {
    const res = await fetchConTimeout(`${API_URL}/api/pedidos/${encodeURIComponent(pedidoId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function marcarDespachado(tenantId: string, pedidoId: string, tomadoPor: string): Promise<boolean> {
  return actualizarEstadoPedido(tenantId, pedidoId, 'despachado');
}

export async function eliminarPedido(tenantId: string, pedidoId: string): Promise<boolean> {
  try {
    const res = await fetchConTimeout(`${API_URL}/api/pedidos/${encodeURIComponent(pedidoId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}
