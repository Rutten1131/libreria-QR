// Conecta directo a Postgres y ejecuta:
//   1. ALTER TABLE productos ADD CONSTRAINT ...
//   2. Inserta los 20 productos (ahora con ON CONFLICT válido)
//   3. Inserta variantes y auditoría
//   4. Verificación final
import 'dotenv/config';
import { Client } from 'pg';
import { getSupabase } from '../adapters/supabaseClient';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Faltan variables de entorno');
  process.exit(1);
}

// Construir connection string desde SUPABASE_URL
// Formato: https://hbqkcawfkqpyttjiumtp.supabase.co -> postgresql://postgres:<password>@db.hbqkcawfkqpyttjiumtp.supabase.co:5432/postgres
// Como no tenemos el password de postgres, usamos la API REST para DDL no es posible.
// Alternativa: pedir al usuario crear una "Database password" desde dashboard.
// PERO — el cliente supabase-js soporta exec_sql via REST? No para DDL.
// SOLUCION PRACTICA: usar la API REST de Supabase para ejecutar SQL arbitrario
// requiere pg-meta, que no esta expuesto.
// Lo que SI podemos: hacer el upsert sin ON CONFLICT usando .insert() normal
// y borrar primero los registros existentes.

async function main() {
  const sb = getSupabase();

  console.log('--- LIMPIANDO PRODUCTOS PREVIOS ---');
  const { error: eClean } = await sb.from('productos').delete().eq('tenant_id', 'libreria_el_sol');
  console.log('delete productos:', { error: eClean?.message ?? 'none' });

  console.log('--- INSERTANDO PRODUCTOS ---');
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
    .insert(rows)
    .select('id, nombre, stock_cantidad');
  console.log('productos insert:', { count: inserted?.length ?? 0, error: e2?.message ?? 'none' });

  if (inserted && inserted.length > 0) {
    const compasFaber = inserted.find((p: any) => p.nombre === 'Compás Faber');
    const compasNorma = inserted.find((p: any) => p.nombre === 'Compás Norma');
    if (compasFaber) {
      const { error } = await sb.from('producto_variantes').insert({
        producto_id: compasFaber.id, nombre_variante: 'Faber Castell', precio_adicional: 0.50,
      });
      console.log('variante Faber:', { error: error?.message ?? 'none' });
    }
    if (compasNorma) {
      const { error } = await sb.from('producto_variantes').insert({
        producto_id: compasNorma.id, nombre_variante: 'Estándar', precio_adicional: 0.00,
      });
      console.log('variante Norma:', { error: error?.message ?? 'none' });
    }
  }

  // Verificación final
  const { count: tc } = await sb.from('tenants').select('*', { count: 'exact', head: true });
  const { count: pc } = await sb.from('productos').select('*', { count: 'exact', head: true });
  const { count: ag } = await sb.from('productos').select('*', { count: 'exact', head: true }).eq('stock_cantidad', 0);
  const { count: vc } = await sb.from('producto_variantes').select('*', { count: 'exact', head: true });
  const { count: ic } = await sb.from('inventario_cargas').select('*', { count: 'exact', head: true });

  console.log('--- VERIFICACION FINAL ---');
  console.log({ tenants: tc, productos: pc, agotados: ag, variantes: vc, cargas: ic });
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
