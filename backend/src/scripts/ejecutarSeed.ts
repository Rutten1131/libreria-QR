// Ejecutar el seed.sql vía cliente Supabase
import 'dotenv/config';
import { getSupabase } from '../adapters/supabaseClient';

async function main() {
  const sb = getSupabase();
  console.log('--- SEED EN EJECUCION ---');

  // 1. Tenant
  const { error: e1 } = await sb.from('tenants').upsert({
    id: 'libreria_el_sol',
    nombre: 'Librería El Sol',
    telefono: '+593999000001',
    direccion: 'Av. Principal 123, Quito',
    participa_referidos: false,
  });
  console.log('1. tenants upsert:', { error: e1?.message ?? 'none' });

  // 2. Productos
  const productos = [
    ['Cuaderno college',         'cuaderno',     2.50, 50],
    ['Cuaderno Universitarios',  'cuaderno',     3.00, 40],
    ['Lápiz 2B',                 'lapiz',        0.50, 200],
    ['Lápiz HB',                 'lapiz',        0.40, 200],
    ['Borrador blanco',          'borrador',     0.30, 150],
    ['Regla 30cm',               'regla',        0.80, 80],
    ['Tijeras escolar',          'tijeras',      1.20, 60],
    ['Pegamento barra',          'pegamento',    0.70, 70],
    ['Sacapuntas metálico',      'sacapuntas',   0.60, 90],
    ['Compás Faber',             'compas',       2.00, 30],
    ['Compás Norma',             'compas',       1.80, 30],
    ['Transportador 180°',       'transportador',0.50, 100],
    ['Escuadra 45°',             'escuadra',     0.60, 100],
    ['Cartulina blanca',         'cartulina',    0.25, 200],
    ['Papel craft',              'papel',        0.15, 200],
    ['Resaltador amarillo',      'resaltador',   0.80, 80],
    ['Corrector blanco',         'corrector',    1.00, 60],
    ['Agenda 2026',              'agenda',       5.00, 40],
    ['Folder manila',            'folder',       0.20, 200],
    ['Bolso escolar',            'bolso',        8.00, 0],
  ] as const;

  const rows = productos.map(([nombre, familia, precio, stock_cantidad]) => ({
    tenant_id: 'libreria_el_sol',
    nombre,
    familia,
    precio,
    stock_cantidad,
  }));

  const { data: inserted, error: e2 } = await sb
    .from('productos')
    .upsert(rows, { onConflict: 'tenant_id,nombre', ignoreDuplicates: false })
    .select('id, nombre');
  console.log('2. productos upsert:', { count: inserted?.length ?? 0, error: e2?.message ?? 'none' });

  // 3. Variantes
  const compasFaber = inserted?.find(p => p.nombre === 'Compás Faber');
  const compasNorma = inserted?.find(p => p.nombre === 'Compás Norma');

  if (compasFaber) {
    const { error: e3 } = await sb.from('producto_variantes').upsert(
      { producto_id: compasFaber.id, nombre_variante: 'Faber Castell', precio_adicional: 0.50 },
      { onConflict: 'producto_id,nombre_variante' }
    );
    console.log('3a. variante Faber:', { error: e3?.message ?? 'none' });
  }
  if (compasNorma) {
    const { error: e3b } = await sb.from('producto_variantes').upsert(
      { producto_id: compasNorma.id, nombre_variante: 'Estándar', precio_adicional: 0.00 },
      { onConflict: 'producto_id,nombre_variante' }
    );
    console.log('3b. variante Norma:', { error: e3b?.message ?? 'none' });
  }

  // 4. Carga de auditoría
  const { error: e4 } = await sb.from('inventario_cargas').insert({
    tenant_id: 'libreria_el_sol',
    archivo_nombre: 'seed-inicial.ts',
    items_cargados: 20,
    items_rechazados: 0,
  });
  console.log('4. inventario_cargas:', { error: e4?.message ?? 'none' });

  // 5. Verificación
  const { count: tc } = await sb.from('tenants').select('*', { count: 'exact', head: true });
  const { count: pc } = await sb.from('productos').select('*', { count: 'exact', head: true });
  const { count: ag } = await sb.from('productos').select('*', { count: 'exact', head: true }).eq('stock_cantidad', 0);
  const { count: vc } = await sb.from('producto_variantes').select('*', { count: 'exact', head: true });
  const { count: ic } = await sb.from('inventario_cargas').select('*', { count: 'exact', head: true });

  console.log('--- VERIFICACION FINAL ---');
  console.log({ tenants: tc, productos: pc, agotados: ag, variantes: vc, cargas: ic });
  console.log('--- FIN ---');
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
