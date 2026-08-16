import { cotizar } from '../services/matchingService';

describe('matchingService (async, contra Supabase)', () => {
  test('match exacto con alta confianza', async () => {
    const c = await cotizar('libreria_el_sol', ['Cuaderno college 100h']);
    expect(c.items.length).toBeGreaterThanOrEqual(1);
    expect(c.items[0].matchConfidence).toBe('alta');
  });

  test('ítem completamente desconocido va a ambiguos', async () => {
    const c = await cotizar('libreria_el_sol', ['xyznoexiste123']);
    expect(c.ambiguos).toContain('xyznoexiste123');
    expect(c.items).toHaveLength(0);
  });

  test('lista vacía devuelve cotización vacía', async () => {
    const c = await cotizar('libreria_el_sol', []);
    expect(c.items).toHaveLength(0);
    expect(c.total).toBe(0);
    expect(c.ambiguos).toHaveLength(0);
  });

  test('tenant sin inventario devuelve ambiguos (no error)', async () => {
    const c = await cotizar('tenant_inexistente', ['cuaderno']);
    expect(c.items).toHaveLength(0);
    expect(c.ambiguos).toContain('cuaderno');
  });

  test('múltiples items suman total correcto', async () => {
    const c = await cotizar('libreria_el_sol', ['Cuaderno college 100h', 'Bolígrafo azul']);
    expect(c.items.length).toBeGreaterThanOrEqual(2);
    const esperado = c.items.reduce(
      (s: number, i: any) => s + i.precioUnitario * i.cantidad,
      0
    );
    expect(c.total).toBe(esperado);
  });
});
