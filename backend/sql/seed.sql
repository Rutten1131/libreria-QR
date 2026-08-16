-- ============================================================
-- LibreríaQR — Seed inicial
-- Carga "Librería El Sol" (papelería ficticia)
-- ============================================================

-- 1. Tenant
INSERT INTO tenants (id, nombre, telefono, direccion, participa_referidos)
VALUES (
  'libreria_el_sol',
  'Librería El Sol',
  '+593999000001',
  'Av. Principal 123, Quito',
  FALSE
)
ON CONFLICT (id) DO NOTHING;

-- 2. Productos — 20 items, mismos del Hito 1 (mock)
INSERT INTO productos (tenant_id, nombre, familia, precio, stock_cantidad) VALUES
  ('libreria_el_sol', 'Cuaderno college',         'cuaderno',     2.50, 50),
  ('libreria_el_sol', 'Cuaderno Universitarios',  'cuaderno',     3.00, 40),
  ('libreria_el_sol', 'Lápiz 2B',                 'lapiz',        0.50, 200),
  ('libreria_el_sol', 'Lápiz HB',                 'lapiz',        0.40, 200),
  ('libreria_el_sol', 'Borrador blanco',          'borrador',     0.30, 150),
  ('libreria_el_sol', 'Regla 30cm',               'regla',        0.80, 80),
  ('libreria_el_sol', 'Tijeras escolar',          'tijeras',      1.20, 60),
  ('libreria_el_sol', 'Pegamento barra',          'pegamento',    0.70, 70),
  ('libreria_el_sol', 'Sacapuntas metálico',      'sacapuntas',   0.60, 90),
  ('libreria_el_sol', 'Compás Faber',             'compas',       2.00, 30),
  ('libreria_el_sol', 'Compás Norma',             'compas',       1.80, 30),
  ('libreria_el_sol', 'Transportador 180°',       'transportador',0.50, 100),
  ('libreria_el_sol', 'Escuadra 45°',             'escuadra',     0.60, 100),
  ('libreria_el_sol', 'Cartulina blanca',         'cartulina',    0.25, 200),
  ('libreria_el_sol', 'Papel craft',              'papel',        0.15, 200),
  ('libreria_el_sol', 'Resaltador amarillo',      'resaltador',   0.80, 80),
  ('libreria_el_sol', 'Corrector blanco',         'corrector',    1.00, 60),
  ('libreria_el_sol', 'Agenda 2026',              'agenda',       5.00, 40),
  ('libreria_el_sol', 'Folder manila',            'folder',       0.20, 200),
  ('libreria_el_sol', 'Bolso escolar',            'bolso',        8.00, 0)    -- este NO tiene stock -> disponible=false
ON CONFLICT DO NOTHING;

-- 3. Variantes — 2 para la familia "compás"
INSERT INTO producto_variantes (producto_id, nombre_variante, precio_adicional)
SELECT id, 'Faber Castell', 0.50 FROM productos
WHERE tenant_id = 'libreria_el_sol' AND nombre = 'Compás Faber'
ON CONFLICT DO NOTHING;

INSERT INTO producto_variantes (producto_id, nombre_variante, precio_adicional)
SELECT id, 'Estándar', 0.00 FROM productos
WHERE tenant_id = 'libreria_el_sol' AND nombre = 'Compás Norma'
ON CONFLICT DO NOTHING;

-- 4. Auditoría — registramos la carga inicial
INSERT INTO inventario_cargas (tenant_id, archivo_nombre, items_cargados, items_rechazados)
VALUES (
  'libreria_el_sol',
  'seed-inicial.sql',
  20,
  0
);

-- 5. Verificación final
SELECT
  (SELECT count(*) FROM tenants WHERE id = 'libreria_el_sol') AS tenant_count,
  (SELECT count(*) FROM productos WHERE tenant_id = 'libreria_el_sol') AS productos_count,
  (SELECT count(*) FROM productos WHERE tenant_id = 'libreria_el_sol' AND stock_cantidad = 0) AS agotados_count,
  (SELECT count(*) FROM producto_variantes) AS variantes_count;
