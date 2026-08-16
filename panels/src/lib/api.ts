import type { Pedido, Producto, Comanda } from './types';

/**
 * Cliente API del frontend.
 *
 * - Si la variable NEXT_PUBLIC_API_URL esta definida y responde,
 *   usa el backend real.
 * - Si no, devuelve mocks (modo demo) para que el panel siempre
 *   renderice algo para revisar visualmente.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const TIMEOUT_MS = 5000;

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
   PEDIDOS
   ============================================================ */

const PEDIDOS_MOCK: Pedido[] = [
  {
    id: 'ped_001',
    tenant_id: 'libreria_el_sol',
    cliente_nombre: 'María González',
    cliente_telefono: '+593999123456',
    estado: 'necesita_revision',
    items: [
      { nombre: 'Cuaderno college 100h', cantidad: 3, precio_unitario: 2.5, subtotal: 7.5 },
      { nombre: 'Lápiz 2B', cantidad: 2, precio_unitario: 0.5, subtotal: 1.0 },
    ],
    total: 8.5,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    accion_pendiente: 'Confirmar variante',
  },
  {
    id: 'ped_002',
    tenant_id: 'libreria_el_sol',
    cliente_nombre: 'Carlos Pérez',
    cliente_telefono: '+593998765432',
    estado: 'necesita_revision',
    items: [
      { nombre: 'Bolígrafo azul', cantidad: 5, precio_unitario: 0.4, subtotal: 2.0 },
      { nombre: 'Borrador blanco', cantidad: 1, precio_unitario: 0.25, subtotal: 0.25 },
    ],
    total: 2.25,
    created_at: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    accion_pendiente: 'Verificar pago recibido',
  },
  {
    id: 'ped_003',
    tenant_id: 'libreria_el_sol',
    cliente_nombre: 'Ana López',
    cliente_telefono: '+593997654321',
    estado: 'confirmado_pagado',
    items: [
      { nombre: 'Cuaderno universitario', cantidad: 2, precio_unitario: 3.0, subtotal: 6.0 },
      { nombre: 'Agenda 2026', cantidad: 1, precio_unitario: 8.5, subtotal: 8.5 },
    ],
    total: 14.5,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'ped_004',
    tenant_id: 'libreria_el_sol',
    cliente_nombre: 'Luis Rivera',
    cliente_telefono: '+593996543210',
    estado: 'despachado',
    items: [
      { nombre: 'Resma papel A4', cantidad: 1, precio_unitario: 5.5, subtotal: 5.5 },
    ],
    total: 5.5,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

export async function listarPedidos(tenantId: string): Promise<Pedido[]> {
  if (API_URL) {
    try {
      const res = await fetchConTimeout(`${API_URL}/api/pedidos?tenantId=${tenantId}`);
      if (res.ok) return await res.json();
    } catch {}
  }
  return PEDIDOS_MOCK;
}

/* ============================================================
   INVENTARIO
   ============================================================ */

const PRODUCTOS_MOCK: Producto[] = [
  { id: 'p1', nombre: 'Cuaderno college 100h', familia: 'cuaderno', precio: 2.5, disponible: true },
  { id: 'p2', nombre: 'Cuaderno universitario', familia: 'cuaderno', precio: 3.0, disponible: true },
  { id: 'p3', nombre: 'Lápiz 2B', familia: 'lapiz', precio: 0.5, disponible: true },
  { id: 'p4', nombre: 'Lápiz HB', familia: 'lapiz', precio: 0.4, disponible: false },
  { id: 'p5', nombre: 'Bolígrafo azul', familia: 'boligrafo', precio: 0.4, disponible: true },
  { id: 'p6', nombre: 'Bolígrafo negro', familia: 'boligrafo', precio: 0.4, disponible: true },
  { id: 'p7', nombre: 'Bolígrafo rojo', familia: 'boligrafo', precio: 0.4, disponible: true },
  { id: 'p8', nombre: 'Borrador blanco', familia: 'borrador', precio: 0.25, disponible: true },
  { id: 'p9', nombre: 'Sacapuntas', familia: 'sacapuntas', precio: 0.3, disponible: true },
  { id: 'p10', nombre: 'Resma papel A4', familia: 'papel', precio: 5.5, disponible: true },
  { id: 'p11', nombre: 'Carpeta plástica', familia: 'carpeta', precio: 1.2, disponible: false },
  { id: 'p12', nombre: 'Agenda 2026', familia: 'agenda', precio: 8.5, disponible: true },
];

export async function listarProductos(tenantId: string): Promise<Producto[]> {
  if (API_URL) {
    try {
      const res = await fetchConTimeout(`${API_URL}/api/tenants/${tenantId}/productos`);
      if (res.ok) return await res.json();
    } catch {}
  }
  return PRODUCTOS_MOCK;
}

/* ============================================================
   DESPACHOS
   ============================================================ */

const COMANDAS_MOCK: Comanda[] = [
  {
    pedido_id: 'ped_003',
    cliente: 'Ana López',
    direccion: 'Av. Amazonas 1234, Quito',
    items: [
      { nombre: 'Cuaderno universitario', cantidad: 2 },
      { nombre: 'Agenda 2026', cantidad: 1 },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    pedido_id: 'ped_004',
    cliente: 'Luis Rivera',
    direccion: 'Calle El Sol 456, Quito',
    items: [{ nombre: 'Resma papel A4', cantidad: 1 }],
    tomado_por: 'César',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

export async function listarComandas(tenantId: string): Promise<Comanda[]> {
  if (API_URL) {
    try {
      const res = await fetchConTimeout(`${API_URL}/api/tenants/${tenantId}/despachos`);
      if (res.ok) return await res.json();
    } catch {}
  }
  return COMANDAS_MOCK;
}
