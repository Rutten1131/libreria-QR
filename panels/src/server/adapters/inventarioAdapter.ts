// Adapter de inventario — Supabase (sustituye al hardcoded original)
import { getSupabase } from './supabaseClient';
import { Producto } from '../domain/entities';

let _cache: Map<string, Producto[]> | null = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 30_000;

export async function getInventarioAsync(tenantIdOrPhone: string): Promise<Producto[]> {
  const sb = getSupabase();

  // Resolver ID real del tenant (puede llegar el ID o el teléfono)
  let targetTenantId = tenantIdOrPhone;
  const { data: tenantData } = await sb
    .from('tenants')
    .select('id')
    .or(`id.eq.${tenantIdOrPhone},telefono.eq.${tenantIdOrPhone}`)
    .maybeSingle();

  if (tenantData?.id) {
    targetTenantId = tenantData.id;
  }

  // Paginación por bloques de 1000 para catálogos masivos (PostgREST límite por petición es 1000)
  const todosLosProductos: any[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await sb
      .from('productos')
      .select('id, tenant_id, categoria, familia, codigo_sku, nombre, precio, stock_cantidad')
      .eq('tenant_id', targetTenantId)
      .range(from, from + PAGE_SIZE - 1)
      .order('nombre');

    if (error) throw new Error(`getInventario: ${error.message}`);
    if (data && data.length > 0) {
      todosLosProductos.push(...data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }
  }

  return todosLosProductos.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    categoria: r.categoria || 'general',
    nombre: r.nombre,
    familia: r.familia,
    precio: Number(r.precio),
    stock_cantidad: r.stock_cantidad,
    disponible: r.stock_cantidad > 0,
  }));
}

export async function invalidateInventarioCache(): Promise<void> {
  _cache = null;
  _cacheTs = 0;
}

export async function hydrateCache(tenantIds: string[]): Promise<void> {
  if (!_cache) _cache = new Map();
  for (const tid of tenantIds) {
    const items = await getInventarioAsync(tid);
    _cache.set(tid, items);
  }
  _cacheTs = Date.now();
}

export async function getAllTenantsAsync(): Promise<string[]> {
  const sb = getSupabase();
  const { data } = await sb.from('tenants').select('id');
  return (data ?? []).map((r: any) => r.id);
}
