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

  // ===========================================
  // Bug #1 FIX: preservar cantidades del input
  // ===========================================
  describe('cantidades del input se preservan', () => {
    test('cantidad > 1 en objeto {nombre, cantidad}', async () => {
      const c = await cotizar('libreria_el_sol', [
        { nombre: 'Cuaderno college 100h', cantidad: 3 },
      ]);
      expect(c.items).toHaveLength(1);
      expect(c.items[0].cantidad).toBe(3);
      // Total = precioUnitario * 3
      expect(c.total).toBe(c.items[0].precioUnitario * 3);
    });

    test('multiples items con cantidades distintas', async () => {
      const c = await cotizar('libreria_el_sol', [
        { nombre: 'Cuaderno college 100h', cantidad: 2 },
        { nombre: 'Bolígrafo azul', cantidad: 5 },
      ]);
      expect(c.items).toHaveLength(2);
      const cuaderno = c.items.find(i => i.nombre.includes('Cuaderno'));
      const boli = c.items.find(i => i.nombre.includes('Bolígrafo'));
      expect(cuaderno?.cantidad).toBe(2);
      expect(boli?.cantidad).toBe(5);
      expect(c.total).toBe(
        (cuaderno!.precioUnitario * 2) + (boli!.precioUnitario * 5)
      );
    });

    test('cantidad = 1 explicita funciona', async () => {
      const c = await cotizar('libreria_el_sol', [
        { nombre: 'Bolígrafo azul', cantidad: 1 },
      ]);
      expect(c.items[0].cantidad).toBe(1);
    });

    test('cantidad invalida (0 o negativo) cae a 1', async () => {
      const c = await cotizar('libreria_el_sol', [
        { nombre: 'Bolígrafo azul', cantidad: 0 },
        { nombre: 'Cuaderno college 100h', cantidad: -3 },
      ]);
      // Ambos caen a 1
      c.items.forEach(i => expect(i.cantidad).toBe(1));
    });

    test('string[] sigue funcionando con cantidad = 1 (compat)', async () => {
      const c = await cotizar('libreria_el_sol', ['Bolígrafo azul']);
      expect(c.items[0].cantidad).toBe(1);
    });

    test('mezcla strings y objetos funciona', async () => {
      const c = await cotizar('libreria_el_sol', [
        'Bolígrafo azul',                    // string → cantidad 1
        { nombre: 'Cuaderno college 100h', cantidad: 4 },  // objeto → cantidad 4
      ]);
      expect(c.items).toHaveLength(2);
      const boli = c.items.find(i => i.nombre.includes('Bolígrafo'));
      const cuaderno = c.items.find(i => i.nombre.includes('Cuaderno'));
      expect(boli?.cantidad).toBe(1);
      expect(cuaderno?.cantidad).toBe(4);
    });
  });
});