// Servicio de inventario — carga via API
import { getSupabase } from '../adapters/supabaseClient';
import {
  validarTenantId,
  validarNombre,
  validarFamilia,
  validarPrecio,
  validarStock,
  validarVariantes,
} from './validationService';

export interface ItemInput {
  nombre: string;
  familia: string;
  precio: number;
  stock: number;
  variantes?: string[];
}

export interface CargaInput {
  tenant_id: string;
  items: ItemInput[];
}

export interface CargaResultado {
  cargados: number;
  rechazados: number;
  detalle_rechazos: Array<{ item: ItemInput; errores: string[] }>;
}

export async function cargarInventario(input: CargaInput): Promise<CargaResultado> {
  const sb = getSupabase();

  // Validar tenant_id
  const t = validarTenantId(input.tenant_id);
  if (!t.ok) throw new Error(`tenant_id inválido: ${t.error}`);
  const tenant_id = (t as { ok: true; value: string }).value;

  // Verificar que el tenant existe
  const { data: tenant, error: eTenant } = await sb
    .from('tenants')
    .select('id')
    .eq('id', tenant_id)
    .single();

  if (eTenant || !tenant) {
    throw new Error(`tenant no existe: ${tenant_id}`);
  }

  const rowsValidos: Array<{
    tenant_id: string;
    nombre: string;
    familia: string;
    precio: number;
    stock_cantidad: number;
  }> = [];

  const rechazos: Array<{ item: ItemInput; errores: string[] }> = [];

  for (const item of input.items) {
    const errores: string[] = [];
    const n = validarNombre(item.nombre);
    if (!n.ok) errores.push(`nombre: ${n.error}`);
    const f = validarFamilia(item.familia);
    if (!f.ok) errores.push(`familia: ${f.error}`);
    const p = validarPrecio(item.precio);
    if (!p.ok) errores.push(`precio: ${p.error}`);
    const s = validarStock(item.stock);
    if (!s.ok) errores.push(`stock: ${s.error}`);
    const v = validarVariantes(item.variantes);
    if (!v.ok) errores.push(`variantes: ${v.error}`);

    if (errores.length === 0) {
      rowsValidos.push({
        tenant_id,
        nombre: (n as { ok: true; value: string }).value,
        familia: (f as { ok: true; value: string }).value,
        precio: (p as { ok: true; value: number }).value,
        stock_cantidad: (s as { ok: true; value: number }).value,
      });
    } else {
      rechazos.push({ item, errores });
    }
  }

  // Guardar productos en la tabla 'productos'
  let cargados = 0;
  for (const r of rowsValidos) {
    try {
      const { data: existing } = await sb
        .from('productos')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('nombre', r.nombre)
        .maybeSingle();

      if (existing?.id) {
        const { error: errUp } = await sb
          .from('productos')
          .update({
            familia: r.familia,
            precio: r.precio,
            stock_cantidad: r.stock_cantidad,
          })
          .eq('id', existing.id);
        if (!errUp) cargados++;
        else rechazos.push({ item: { nombre: r.nombre, familia: r.familia, precio: r.precio, stock: r.stock_cantidad }, errores: [errUp.message] });
      } else {
        const { error: errIn } = await sb
          .from('productos')
          .insert(r);
        if (!errIn) cargados++;
        else rechazos.push({ item: { nombre: r.nombre, familia: r.familia, precio: r.precio, stock: r.stock_cantidad }, errores: [errIn.message] });
      }
    } catch (e: any) {
      rechazos.push({ item: { nombre: r.nombre, familia: r.familia, precio: r.precio, stock: r.stock_cantidad }, errores: [e.message] });
    }
  }

  // Registrar auditoría
  await sb.from('inventario_cargas').insert({
    tenant_id,
    archivo_nombre: 'carga-api',
    items_cargados: cargados,
    items_rechazados: rechazos.length,
    detalle_rechazos: rechazos,
  });

  return {
    cargados,
    rechazados: rechazos.length,
    detalle_rechazos: rechazos,
  };
}
