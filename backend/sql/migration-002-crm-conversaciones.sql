-- ============================================================
-- Migración 002 — CRM de clientes + tabla de conversaciones
-- ============================================================

-- ============================================================
-- A. Tabla clientes: extensión CRM (fidelización)
-- ============================================================
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS lugar_trabajo    TEXT,
  ADD COLUMN IF NOT EXISTS horario_trabajo  TEXT,
  ADD COLUMN IF NOT EXISTS cantidad_hijos   INTEGER CHECK (cantidad_hijos IS NULL OR cantidad_hijos >= 0),
  ADD COLUMN IF NOT EXISTS edades_hijos     JSONB,        -- [12, 8]
  ADD COLUMN IF NOT EXISTS nombres_hijos    JSONB,        -- ["Sofia","Mateo"]
  ADD COLUMN IF NOT EXISTS cumple_hijos     JSONB,        -- [{nombre, fecha}]
  ADD COLUMN IF NOT EXISTS cumple_cliente   DATE,
  ADD COLUMN IF NOT EXISTS aniversario      DATE,
  ADD COLUMN IF NOT EXISTS distrito         TEXT,
  ADD COLUMN IF NOT EXISTS historial_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_pedido_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preferencias     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ultima_frustracion TEXT,
  ADD COLUMN IF NOT EXISTS ultima_alegria   TEXT,
  ADD COLUMN IF NOT EXISTS notas            TEXT;

COMMENT ON COLUMN clientes.lugar_trabajo   IS 'Donde trabaja (ej. "banco de Loja"). Dato espontaneo del cliente.';
COMMENT ON COLUMN clientes.horario_trabajo IS 'Horario laboral. Sirve para coordinar entregas.';
COMMENT ON COLUMN clientes.cantidad_hijos  IS 'Cantidad de hijos. Inferido o preguntado.';
COMMENT ON COLUMN clientes.edades_hijos    IS 'Edades de los hijos. Array JSON.';
COMMENT ON COLUMN clientes.nombres_hijos   IS 'Nombres de los hijos. Array JSON.';
COMMENT ON COLUMN clientes.cumple_hijos    IS 'Cumpleaños de los hijos. [{nombre, fecha}].';
COMMENT ON COLUMN clientes.cumple_cliente  IS 'Cumpleaños del cliente (para fidelización).';
COMMENT ON COLUMN clientes.aniversario     IS 'Aniversario (Bodas, etc).';
COMMENT ON COLUMN clientes.distrito        IS 'Distrito/barrio derivado de la dirección.';
COMMENT ON COLUMN clientes.historial_count IS 'Cantidad de pedidos concretados.';
COMMENT ON COLUMN clientes.ultimo_pedido_at IS 'Fecha del último pedido.';
COMMENT ON COLUMN clientes.preferencias    IS 'Preferencias detectadas. JSONB: {marcas, logistica_default, etc}.';
COMMENT ON COLUMN clientes.ultima_frustracion IS 'Última frustración detectada. Texto. Se loguea en pedido_eventos.';
COMMENT ON COLUMN clientes.ultima_alegria  IS 'Última alegría detectada.';
COMMENT ON COLUMN clientes.notas           IS 'Notas libres del operador.';

-- ============================================================
-- B. Tabla conversaciones — state machine del flujo
-- ============================================================
CREATE TABLE IF NOT EXISTS conversaciones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_telefono    TEXT NOT NULL,
  estado_actual       TEXT NOT NULL DEFAULT 'INICIAL'
                      CHECK (estado_actual IN (
                        'INICIAL',
                        'CONFIRMANDO_LISTA',
                        'CONFIRMANDO_LISTA_CORREGIDA',
                        'AGREGANDO_ITEMS',
                        'RESOLVIENDO_VARIANTES',
                        'CONFIRMANDO_COTIZACION',
                        'CONFIRMANDO_LOGISTICA',
                        'CONFIRMANDO_PAGO',
                        'DERIVADO_A_HUMANO',
                        'COMPLETADO',
                        'ABANDONADO'
                      )),
  contexto            JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- contexto guarda:
  --   lista_original: string
  --   lista_parseada: [{cantidad, nombre}]
  --   cotizacion: {items, total, ambiguos}
  --   variantes_pendientes: [{nombre_producto, opciones: [...]}]
  --   ultima_decision_ia: {decision, confianza, razon}
  --   logistica: 'retiro' | 'envio'
  --   metodo_pago: 'transferencia' | 'efectivo' | 'tarjeta'
  --   pedido_id: uuid
  --
  ultimo_mensaje     TEXT,
  requiere_humano    BOOLEAN NOT NULL DEFAULT FALSE,
  contador_frustracion INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, cliente_telefono)
);

CREATE INDEX idx_conversaciones_tenant     ON conversaciones(tenant_id);
CREATE INDEX idx_conversaciones_estado     ON conversaciones(tenant_id, estado_actual);
CREATE INDEX idx_conversaciones_requiere   ON conversaciones(tenant_id, requiere_humano) WHERE requiere_humano = TRUE;
CREATE INDEX idx_conversaciones_updated    ON conversaciones(updated_at DESC);

COMMENT ON TABLE conversaciones IS 'Una fila por (tenant, telefono). State machine del flujo conversacional.';
COMMENT ON COLUMN conversaciones.contexto IS 'Estado completo de la conversación en JSONB.';
COMMENT ON COLUMN conversaciones.requiere_humano IS 'TRUE si la IA detecto que el cliente necesita atencion humana.';
COMMENT ON COLUMN conversaciones.contador_frustracion IS 'Cuantos mensajes consecutivos con tono frustrado.';

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_conversaciones_updated_at ON conversaciones;
CREATE TRIGGER trg_conversaciones_updated_at
  BEFORE UPDATE ON conversaciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- C. Pedidos: agregar referencia a conversacion
-- ============================================================
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS conversacion_id UUID REFERENCES conversaciones(id) ON DELETE SET NULL;

CREATE INDEX idx_pedidos_conversacion ON pedidos(conversacion_id);

COMMENT ON COLUMN pedidos.conversacion_id IS 'Conversacion que origino este pedido. NULL si el pedido vino de otro canal.';

-- ============================================================
-- D. Permisos
-- ============================================================
GRANT ALL ON conversaciones TO anon, authenticated, service_role;

-- ============================================================
-- E. Zona horaria — sentamos la base
-- Esto NO cambia el comportamiento de los TIMESTAMPTZ (que ya son UTC).
-- Solo permite hacer queries con AT TIME ZONE 'America/Guayaquil'.
-- ============================================================
-- PostgreSQL ya soporta America/Guayaquil via pg_timezone_names,
-- no requiere instalar nada.

-- ============================================================
-- F. Verificacion final
-- ============================================================
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'clientes') AS clientes_columns,
  (SELECT count(*) FROM information_schema.tables WHERE table_name = 'conversaciones') AS conversaciones_table_exists,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'conversaciones') AS conversaciones_columns,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'conversacion_id') AS pedidos_tiene_conversacion_id;
