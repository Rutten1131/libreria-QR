-- ============================================================
-- Migración 001 — Agregar cédula a clientes
-- Decisión César (Hito 5): cedula + nombre son únicos por tenant
-- ============================================================

-- 1. Agregar columna (nullable para no romper registros existentes)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS cedula TEXT;

-- 2. Backfill clientes existentes con cedula placeholder (no rompemos unique)
UPDATE clientes SET cedula = 'PENDIENTE-' || id::text WHERE cedula IS NULL;

-- 3. Hacer NOT NULL ahora que no hay nulos
ALTER TABLE clientes
  ALTER COLUMN cedula SET NOT NULL;

-- 4. UNIQUE por (tenant_id, cedula)
ALTER TABLE clientes
  ADD CONSTRAINT clientes_tenant_cedula_unique UNIQUE (tenant_id, cedula);

-- 5. Índice para búsqueda por cédula dentro del tenant
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_cedula
  ON clientes(tenant_id, cedula);

COMMENT ON COLUMN clientes.cedula IS 'Cédula o DNI del cliente final. Único por tenant.';
