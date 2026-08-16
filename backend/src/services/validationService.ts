// Servicio de validación de inputs
// Cada función retorna { ok: true, value } o { ok: false, error }

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function validarPrecio(input: unknown): ValidationResult<number> {
  if (typeof input !== 'number') return { ok: false, error: 'precio debe ser número' };
  if (!Number.isFinite(input)) return { ok: false, error: 'precio no es finito' };
  if (input < 0) return { ok: false, error: 'precio no puede ser negativo' };
  if (input > 100000) return { ok: false, error: 'precio fuera de rango' };
  // Redondear a 2 decimales
  return { ok: true, value: Math.round(input * 100) / 100 };
}

export function validarStock(input: unknown): ValidationResult<number> {
  if (typeof input !== 'number') return { ok: false, error: 'stock debe ser número' };
  if (!Number.isInteger(input)) return { ok: false, error: 'stock debe ser entero' };
  if (input < 0) return { ok: false, error: 'stock no puede ser negativo' };
  if (input > 1_000_000) return { ok: false, error: 'stock fuera de rango' };
  return { ok: true, value: input };
}

export function validarNombre(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') return { ok: false, error: 'nombre debe ser texto' };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: false, error: 'nombre vacío' };
  if (trimmed.length > 200) return { ok: false, error: 'nombre demasiado largo' };
  return { ok: true, value: trimmed };
}

export function validarFamilia(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') return { ok: false, error: 'familia debe ser texto' };
  // Normalizar: lowercase, sin acentos
  const normalized = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (normalized.length === 0) return { ok: false, error: 'familia vacía' };
  return { ok: true, value: normalized };
}

export function validarVariantes(input: unknown): ValidationResult<string[]> {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input)) return { ok: false, error: 'variantes debe ser array' };
  const validated: string[] = [];
  for (const v of input) {
    if (typeof v !== 'string') return { ok: false, error: 'cada variante debe ser texto' };
    const trimmed = v.trim();
    if (trimmed.length === 0) return { ok: false, error: 'variante vacía' };
    if (trimmed.length > 100) return { ok: false, error: 'variante demasiado larga' };
    validated.push(trimmed);
  }
  return { ok: true, value: validated };
}

export function validarTenantId(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') return { ok: false, error: 'tenant_id debe ser texto' };
  // Solo letras, números, guion bajo, guion medio
  if (!/^[a-z0-9_-]+$/i.test(input)) {
    return { ok: false, error: 'tenant_id solo permite letras, números, _ y -' };
  }
  if (input.length > 50) return { ok: false, error: 'tenant_id demasiado largo' };
  return { ok: true, value: input };
}
