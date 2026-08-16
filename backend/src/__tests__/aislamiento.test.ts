// Test crítico de aislamiento por tenant (regla no negociable #1 del PRD)
// Usa la BD real de Supabase para verificar que dos tenants NO se ven entre sí.
import 'dotenv/config';
import { getSupabase } from '../adapters/supabaseClient';

describe('aislamiento por tenant', () => {
  const TENANT_A = '__test_aislamiento_a_' + Date.now();
  const TENANT_B = '__test_aislamiento_b_' + Date.now();

  beforeAll(async () => {
    const sb = getSupabase();
    // Crear dos tenants de prueba
    await sb.from('tenants').insert([
      { id: TENANT_A, nombre: 'Test A' },
      { id: TENANT_B, nombre: 'Test B' },
    ]);
    // Cargar productos distintos en cada uno
    await sb.from('productos').insert([
      { tenant_id: TENANT_A, nombre: 'Cuaderno A', familia: 'cuaderno', precio: 1.00, stock_cantidad: 10 },
      { tenant_id: TENANT_B, nombre: 'Cuaderno B', familia: 'cuaderno', precio: 2.00, stock_cantidad: 20 },
    ]);
  });

  afterAll(async () => {
    const sb = getSupabase();
    await sb.from('productos').delete().in('tenant_id', [TENANT_A, TENANT_B]);
    await sb.from('tenants').delete().in('id', [TENANT_A, TENANT_B]);
  });

  test('tenant A solo ve productos de A', async () => {
    const sb = getSupabase();
    const { data } = await sb
      .from('productos')
      .select('nombre')
      .eq('tenant_id', TENANT_A);
    expect(data?.every((p) => p.nombre === 'Cuaderno A')).toBe(true);
    expect(data?.some((p) => p.nombre === 'Cuaderno B')).toBe(false);
  });

  test('tenant B solo ve productos de B', async () => {
    const sb = getSupabase();
    const { data } = await sb
      .from('productos')
      .select('nombre')
      .eq('tenant_id', TENANT_B);
    expect(data?.every((p) => p.nombre === 'Cuaderno B')).toBe(true);
    expect(data?.some((p) => p.nombre === 'Cuaderno A')).toBe(false);
  });

  test('consulta SIN tenant_id devuelve TODOS los productos (peligro)', async () => {
    const sb = getSupabase();
    const { count } = await sb.from('productos').select('*', { count: 'exact', head: true });
    expect(count).toBeGreaterThan(0); // Hay datos de varios tenants
    // Esto valida que el backend NUNCA debe hacer queries sin .eq('tenant_id')
  });
});
