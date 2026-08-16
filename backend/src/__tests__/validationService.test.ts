import {
  validarPrecio,
  validarStock,
  validarNombre,
  validarFamilia,
  validarVariantes,
  validarTenantId,
} from '../services/validationService';

describe('validationService', () => {
  describe('validarPrecio', () => {
    test('acepta precio positivo', () => {
      const r = validarPrecio(2.5);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(2.5);
    });
    test('rechaza precio negativo', () => {
      const r = validarPrecio(-1);
      expect(r.ok).toBe(false);
    });
    test('rechaza string', () => {
      const r = validarPrecio('2.5');
      expect(r.ok).toBe(false);
    });
    test('rechaza NaN', () => {
      const r = validarPrecio(NaN);
      expect(r.ok).toBe(false);
    });
  });

  describe('validarStock', () => {
    test('acepta entero positivo', () => {
      const r = validarStock(50);
      expect(r.ok).toBe(true);
    });
    test('acepta 0', () => {
      const r = validarStock(0);
      expect(r.ok).toBe(true);
    });
    test('rechaza decimal', () => {
      const r = validarStock(1.5);
      expect(r.ok).toBe(false);
    });
    test('rechaza negativo', () => {
      const r = validarStock(-5);
      expect(r.ok).toBe(false);
    });
  });

  describe('validarNombre', () => {
    test('acepta nombre normal', () => {
      const r = validarNombre('Cuaderno college');
      expect(r.ok).toBe(true);
    });
    test('rechaza vacío', () => {
      const r = validarNombre('   ');
      expect(r.ok).toBe(false);
    });
    test('rechaza > 200 chars', () => {
      const r = validarNombre('a'.repeat(201));
      expect(r.ok).toBe(false);
    });
  });

  describe('validarFamilia', () => {
    test('normaliza a lowercase sin acentos', () => {
      const r = validarFamilia('  LÁPIZ  ');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe('lapiz');
    });
    test('rechaza vacío', () => {
      const r = validarFamilia('');
      expect(r.ok).toBe(false);
    });
  });

  describe('validarVariantes', () => {
    test('acepta array vacío', () => {
      const r = validarVariantes([]);
      expect(r.ok).toBe(true);
    });
    test('acepta undefined como []', () => {
      const r = validarVariantes(undefined);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual([]);
    });
    test('rechaza no-array', () => {
      const r = validarVariantes('Cosido');
      expect(r.ok).toBe(false);
    });
  });

  describe('validarTenantId', () => {
    test('acepta slug normal', () => {
      const r = validarTenantId('libreria_el_sol');
      expect(r.ok).toBe(true);
    });
    test('rechaza con espacios', () => {
      const r = validarTenantId('libreria el sol');
      expect(r.ok).toBe(false);
    });
    test('rechaza con caracteres raros', () => {
      const r = validarTenantId('librería/sol!');
      expect(r.ok).toBe(false);
    });
  });
});
