-- ============================================================
-- LibreríaQR — Schema inicial
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================================

-- Extensions necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- BLOQUE 1 — TENANTS (papelerías)
-- ============================================================
CREATE TABLE tenants (
  id            TEXT PRIMARY KEY,
  nombre        TEXT NOT NULL,
  telefono      TEXT,
  direccion     TEXT,
  participa_referidos    BOOLEAN NOT NULL DEFAULT FALSE,
  porcentaje_referido    NUMERIC(5,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Papelerías / librerías registradas. Una fila = un cliente del SaaS.';

-- ============================================================
-- BLOQUE 2 — PRODUCTOS (inventario)
-- Toda fila DEBE tener tenant_id. Aislamiento estricto.
-- ============================================================
CREATE TABLE productos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  familia         TEXT,                       -- ej. 'compas', 'lapiz'
  precio          NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
  stock_cantidad  INTEGER NOT NULL DEFAULT 0 CHECK (stock_cantidad >= 0),
  disponible      BOOLEAN GENERATED ALWAYS AS (stock_cantidad > 0) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_productos_tenant        ON productos(tenant_id);
CREATE INDEX idx_productos_tenant_nombre ON productos(tenant_id, lower(nombre));

COMMENT ON TABLE productos IS 'Inventario por tenant. disponible se calcula de stock_cantidad (Riesgo #13).';
COMMENT ON COLUMN productos.stock_cantidad IS 'Stock real (entero). El booleano disponible se deriva.';

-- ============================================================
-- BLOQUE 3 — PRODUCTO_VARIANTES (familias de variantes)
-- ============================================================
CREATE TABLE producto_variantes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id       UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  nombre_variante   TEXT NOT NULL,
  precio_adicional  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_variantes_producto ON producto_variantes(producto_id);

COMMENT ON TABLE producto_variantes IS 'Variantes por familia. Para matching preguntar cuando hay >1 variante.';

-- ============================================================
-- BLOQUE 4 — CLIENTES (padre/madre/estudiante)
-- ============================================================
CREATE TABLE clientes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  telefono      TEXT NOT NULL,
  nombre        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, telefono)
);

CREATE INDEX idx_clientes_tenant ON clientes(tenant_id);

COMMENT ON TABLE clientes IS 'Cliente final. UNIQUE por (tenant_id, telefono) — un mismo número no es dos clientes en la misma papelería.';

-- ============================================================
-- BLOQUE 5 — TENANT_WHATSAPP (mapeo número → tenant)
-- ============================================================
CREATE TABLE tenant_whatsapp (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  numero_whatsapp       TEXT NOT NULL,
  evolution_instance_id TEXT,
  estado_conexion       TEXT NOT NULL DEFAULT 'desconocido'
                        CHECK (estado_conexion IN ('conectado', 'desconectado', 'desconocido')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (numero_whatsapp)
);

CREATE INDEX idx_tw_tenant ON tenant_whatsapp(tenant_id);

COMMENT ON TABLE tenant_whatsapp IS 'Una fila = un número de WhatsApp conectado a un tenant. estado_conexion para alertas (Riesgo #9).';

-- ============================================================
-- BLOQUE 6 — PEDIDOS
-- accion_pendiente NUNCA es null cuando estado = necesita_revision (A.6.2)
-- ============================================================
CREATE TYPE pedido_estado AS ENUM (
  'necesita_revision',
  'confirmado',
  'despachado',
  'cancelado'
);

CREATE TABLE pedidos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_id          UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre      TEXT,
  cliente_telefono    TEXT,
  canal               TEXT NOT NULL CHECK (canal IN ('whatsapp', 'web')),
  estado              pedido_estado NOT NULL DEFAULT 'necesita_revision',
  accion_pendiente    TEXT,                                  -- nula cuando NO necesita_revision
  total               NUMERIC(10,2) NOT NULL DEFAULT 0,
  items_ambiguos      JSONB NOT NULL DEFAULT '[]'::jsonb,    -- textos que el matching no resolvió
  direccion_envio     JSONB,                                 -- se llena después (paso 12 del flujo)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chq_accion CHECK (
    (estado <> 'necesita_revision') OR (accion_pendiente IS NOT NULL AND accion_pendiente <> '')
  )
);

CREATE INDEX idx_pedidos_tenant_estado ON pedidos(tenant_id, estado);
CREATE INDEX idx_pedidos_tenant_fecha  ON pedidos(tenant_id, created_at DESC);

COMMENT ON TABLE pedidos IS 'Pedidos por tenant. CHECK garantiza accion_pendiente nunca vacía en necesita_revision (A.6.2).';

-- ============================================================
-- BLOQUE 7 — PEDIDO_ITEMS
-- ============================================================
CREATE TABLE pedido_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id         UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id       UUID REFERENCES productos(id) ON DELETE SET NULL,
  nombre            TEXT NOT NULL,         -- snapshot del nombre al momento del pedido
  variante          TEXT,                  -- snapshot de la variante
  cantidad          INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario   NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  match_confidence  TEXT NOT NULL CHECK (match_confidence IN ('alta', 'baja'))
);

CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);

COMMENT ON TABLE pedido_items IS 'Líneas del pedido. nombre y precio son snapshot (precio puede cambiar después).';

-- ============================================================
-- BLOQUE 8 — PEDIDO_EVENTOS (auditoría — A.9)
-- ============================================================
CREATE TABLE pedido_eventos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id     UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,             -- 'creado','cotizado','pago_verificado','despachado','cancelado', etc.
  detalle       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eventos_pedido ON pedido_eventos(pedido_id, created_at);

COMMENT ON TABLE pedido_eventos IS 'Log por pedido. Nunca se pierde un pedido sin rastro (A.9).';

-- ============================================================
-- BLOQUE 9 — INVENTARIO_CARGAS (auditoría de uploads de Excel — A.7)
-- ============================================================
CREATE TABLE inventario_cargas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  archivo_nombre      TEXT,
  items_cargados      INTEGER NOT NULL DEFAULT 0,
  items_rechazados    INTEGER NOT NULL DEFAULT 0,
  detalle_rechazos    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cargas_tenant ON inventario_cargas(tenant_id, created_at DESC);

COMMENT ON TABLE inventario_cargas IS 'Auditoría de cada upload de Excel. items_rechazados permite revertir (A.7).';

-- ============================================================
-- ROW LEVEL SECURITY — defensa adicional por tenant (A.3 #1)
-- Supabase requiere políticas por tabla. Por ahora desactivamos
-- RLS hasta que el backend use solo la service_role_key. Activar
-- RLS en producción si alguna vez se usa anon key para leer.
-- ============================================================
ALTER TABLE tenants              DISABLE ROW LEVEL SECURITY;
ALTER TABLE productos            DISABLE ROW LEVEL SECURITY;
ALTER TABLE producto_variantes   DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes             DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_whatsapp      DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos              DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items         DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_eventos       DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_cargas    DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tw_updated_at
  BEFORE UPDATE ON tenant_whatsapp
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
