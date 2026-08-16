-- ============================================================
-- migration-003: operadores + extensión tenant_whatsapp
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- BLOQUE 1 — OPERADORES (César + equipo)
-- El rol de operador es para gestión multi-tenant (crear tenants,
-- ver listados, conectar instancias Evolution). NO confundir con
-- los "duenos" de cada librería (que son tenants).
-- ============================================================
CREATE TABLE IF NOT EXISTS operadores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla espejo para vincular auth.users (Supabase) con nuestra tabla.
-- auth.users es administrada por Supabase Auth; nosotros solo guardamos
-- la FK para poder JOINear cuando sea necesario.
CREATE TABLE IF NOT EXISTS operador_auth (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  operador_id   UUID NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operador_auth_operador ON operador_auth(operador_id);

-- ============================================================
-- BLOQUE 2 — Evolución de tenant_whatsapp
-- Le agregamos campos para que el adapter Evolution pueda
-- almacenar el nombre de instancia y el estado real.
-- ============================================================
-- NOTA: la tabla ya existe con (numero_whatsapp, evolution_instance_id).
-- La completamos con:
--   * evolution_instance_name: nombre único con que Evolution la registró
--   * evolution_state: estado real sincronizado con Evolution
--   * evolution_qr: último QR fresco (base64) para no pedirlo a cada rato
--   * evolution_qr_expires_at: momento en que expira el QR actual
ALTER TABLE tenant_whatsapp
  ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT,
  ADD COLUMN IF NOT EXISTS evolution_state TEXT
    CHECK (evolution_state IN ('desconectado', 'esperando_qr', 'conectado', 'desconocido'))
    DEFAULT 'desconocido',
  ADD COLUMN IF NOT EXISTS evolution_qr TEXT,
  ADD COLUMN IF NOT EXISTS evolution_qr_expires_at TIMESTAMPTZ;

-- Índice único para que cada instance_name sea único en el servidor Evolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_tw_evolution_instance_name
  ON tenant_whatsapp(evolution_instance_name)
  WHERE evolution_instance_name IS NOT NULL;

-- ============================================================
-- BLOQUE 3 — Grant: operadores authenticated pueden escribir
-- (RLS disabled para operaciones admin;，我们会 usar service_role
-- para inserts en la BD y dejamos authenticated para que Supabase
-- Auth funcione en login).
-- ============================================================
ALTER TABLE operadores       DISABLE ROW LEVEL SECURITY;
ALTER TABLE operador_auth    DISABLE ROW LEVEL SECURITY;

GRANT ALL ON operadores TO anon, authenticated, service_role;
GRANT ALL ON operador_auth TO anon, authenticated, service_role;

-- ============================================================
-- BLOQUE 4 — Trigger updated_at (consistente con el resto del schema)
-- ============================================================
CREATE TRIGGER trg_operadores_updated_at
  BEFORE UPDATE ON operadores
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FIN migration-003
-- ============================================================
