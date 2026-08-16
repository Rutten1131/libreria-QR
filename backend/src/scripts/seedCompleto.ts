// Seed realista de "Librería El Sol"
// Inventario basado en clasificación de papelería real:
// - Instrumentos de escritura
// - Instrumentos de dibujo
// - Cuadernos y blocs
// - Archivo y almacenamiento
// - Instrumentos de escritorio
// - Suministros escolares (incluye libros de texto por PRD A.5)
// - Cálculo
// - Suministros de correo
// - Papel
import 'dotenv/config';
import { getSupabase } from '../adapters/supabaseClient';

interface Producto {
  nombre: string;
  familia: string;
  precio: number;
  stock_cantidad: number;
  variantes?: string[];
}

// 40 productos, distribuidos por categoría real
const productos: Producto[] = [
  // === Instrumentos de escritura ===
  { nombre: 'Bolígrafo azul',                  familia: 'boligrafo',  precio: 0.40, stock_cantidad: 200 },
  { nombre: 'Bolígrafo negro',                 familia: 'boligrafo',  precio: 0.40, stock_cantidad: 200 },
  { nombre: 'Bolígrafo rojo',                  familia: 'boligrafo',  precio: 0.40, stock_cantidad: 100 },
  { nombre: 'Lápiz 2B',                        familia: 'lapiz',      precio: 0.50, stock_cantidad: 200 },
  { nombre: 'Lápiz HB',                        familia: 'lapiz',      precio: 0.40, stock_cantidad: 200 },
  { nombre: 'Lapicero fino (0.5mm)',           familia: 'lapicero',   precio: 1.50, stock_cantidad: 80 },
  { nombre: 'Lapicero fino (0.7mm)',           familia: 'lapicero',   precio: 1.50, stock_cantidad: 80 },
  { nombre: 'Resaltador amarillo',             familia: 'resaltador', precio: 0.80, stock_cantidad: 80 },
  { nombre: 'Resaltador verde',                familia: 'resaltador', precio: 0.80, stock_cantidad: 60 },
  { nombre: 'Resaltador rosa',                 familia: 'resaltador', precio: 0.80, stock_cantidad: 60 },
  { nombre: 'Marcador permanente negro',       familia: 'marcador',   precio: 1.20, stock_cantidad: 50 },
  { nombre: 'Corrector blanco (líquido)',      familia: 'corrector',  precio: 1.00, stock_cantidad: 60 },
  { nombre: 'Corrector tipo pluma',            familia: 'corrector',  precio: 1.30, stock_cantidad: 40 },

  // === Instrumentos de dibujo ===
  { nombre: 'Lápices de colores x12',          familia: 'colores',    precio: 3.50, stock_cantidad: 50 },
  { nombre: 'Lápices de colores x24',          familia: 'colores',    precio: 6.00, stock_cantidad: 30 },
  { nombre: 'Crayones de cera x12',            familia: 'crayones',   precio: 2.50, stock_cantidad: 60 },
  { nombre: 'Acuarela escolar x12',            familia: 'acuarela',   precio: 4.00, stock_cantidad: 30 },
  { nombre: 'Sacapuntas metálico',             familia: 'sacapuntas', precio: 0.60, stock_cantidad: 90 },
  { nombre: 'Goma de borrar blanca',           familia: 'borrador',   precio: 0.30, stock_cantidad: 150 },

  // === Cuadernos y blocs ===
  { nombre: 'Cuaderno college 100h',           familia: 'cuaderno',   precio: 2.50, stock_cantidad: 80 },
  { nombre: 'Cuaderno universitario 100h',     familia: 'cuaderno',   precio: 3.00, stock_cantidad: 60 },
  { nombre: 'Cuaderno espiral 50h',            familia: 'cuaderno',   precio: 1.80, stock_cantidad: 80 },
  { nombre: 'Bloc de notas A5',                familia: 'bloc',       precio: 1.50, stock_cantidad: 50 },
  { nombre: 'Cuaderno de dibujo (40h)',        familia: 'cuaderno',   precio: 3.50, stock_cantidad: 30 },

  // === Archivo y almacenamiento ===
  { nombre: 'Folder manila',                   familia: 'folder',     precio: 0.20, stock_cantidad: 200 },
  { nombre: 'Carpeta de 3 anillos',            familia: 'carpeta',    precio: 4.50, stock_cantidad: 40 },
  { nombre: 'Carpeta colgante',                familia: 'carpeta',    precio: 1.20, stock_cantidad: 50 },
  { nombre: 'Sobre manila',                    familia: 'sobre',      precio: 0.10, stock_cantidad: 300 },
  { nombre: 'Sobre blanco oficio',             familia: 'sobre',      precio: 0.15, stock_cantidad: 200 },

  // === Instrumentos de escritorio ===
  { nombre: 'Grapadora estándar',              familia: 'grapadora',  precio: 5.00, stock_cantidad: 25 },
  { nombre: 'Caja de grapas (5000u)',          familia: 'grapa',      precio: 1.50, stock_cantidad: 80 },
  { nombre: 'Perforadora 2 huecos',            familia: 'perforador', precio: 6.00, stock_cantidad: 20 },
  { nombre: 'Cinta adhesiva transparente',     familia: 'cinta',      precio: 0.80, stock_cantidad: 100 },
  { nombre: 'Tijeras escolar',                 familia: 'tijeras',    precio: 1.20, stock_cantidad: 60 },
  { nombre: 'Pegamento en barra',              familia: 'pegamento',  precio: 0.70, stock_cantidad: 70 },
  { nombre: 'Pegamento líquido 250ml',         familia: 'pegamento',  precio: 1.50, stock_cantidad: 50 },

  // === Suministros escolares (PRD A.5 incluye libros) ===
  {
    nombre: 'Compás de precisión',
    familia: 'compas',
    precio: 2.00,
    stock_cantidad: 30,
    variantes: ['Faber Castell', 'Estándar económico'],
  },
  { nombre: 'Transportador 180°',              familia: 'transportador', precio: 0.50, stock_cantidad: 100 },
  { nombre: 'Escuadra 45°',                    familia: 'escuadra',  precio: 0.60, stock_cantidad: 100 },
  { nombre: 'Regla 30cm',                      familia: 'regla',     precio: 0.80, stock_cantidad: 80 },

  // === Cálculo ===
  { nombre: 'Calculadora científica',          familia: 'calculadora', precio: 12.00, stock_cantidad: 20 },
  { nombre: 'Calculadora básica',              familia: 'calculadora', precio: 5.00, stock_cantidad: 40 },

  // === Libros de texto (PRD A.5 — categoría clave) ===
  {
    nombre: 'Matemáticas 1° Bachillerato',
    familia: 'libro',
    precio: 18.00,
    stock_cantidad: 25,
    variantes: ['Nueva edición 2026', 'Edición anterior'],
  },
  {
    nombre: 'Lengua y Literatura 1° Bachillerato',
    familia: 'libro',
    precio: 18.00,
    stock_cantidad: 25,
  },

  // === Agotado (testing) ===
  { nombre: 'Mochila escolar reforzada',       familia: 'mochila',    precio: 28.00, stock_cantidad: 0 },
];

async function main() {
  const sb = getSupabase();

  console.log('--- LIMPIANDO ---');
  const { error: eCl } = await sb.from('producto_variantes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('limpiar variantes:', { error: eCl?.message ?? 'none' });
  const { error: eCl2 } = await sb.from('productos').delete().eq('tenant_id', 'libreria_el_sol');
  console.log('limpiar productos:', { error: eCl2?.message ?? 'none' });

  console.log('--- INSERTANDO PRODUCTOS ---');
  const rows = productos.map((p) => ({
    tenant_id: 'libreria_el_sol',
    nombre: p.nombre,
    familia: p.familia,
    precio: p.precio,
    stock_cantidad: p.stock_cantidad,
  }));

  const { data: inserted, error: e2 } = await sb
    .from('productos')
    .insert(rows)
    .select('id, nombre, familia, stock_cantidad');

  console.log('productos insert:', { count: inserted?.length ?? 0, error: e2?.message ?? 'none' });

  if (inserted && inserted.length > 0) {
    console.log('--- INSERTANDO VARIANTES ---');
    let variantesCargadas = 0;
    for (const p of productos) {
      if (!p.variantes) continue;
      const insertedProd = inserted.find((ip: any) => ip.nombre === p.nombre);
      if (!insertedProd) continue;
      for (const variante of p.variantes) {
        const { error } = await sb.from('producto_variantes').insert({
          producto_id: insertedProd.id,
          nombre_variante: variante,
          precio_adicional: 0,
        });
        if (!error) variantesCargadas++;
        else console.log('  variante error:', p.nombre, variante, error.message);
      }
    }
    console.log('variantes cargadas:', variantesCargadas);
  }

  console.log('--- AUDITORIA ---');
  const { error: e3 } = await sb.from('inventario_cargas').insert({
    tenant_id: 'libreria_el_sol',
    archivo_nombre: 'seed-completo-v2.ts',
    items_cargados: inserted?.length ?? 0,
    items_rechazados: 0,
  });
  console.log('inventario_cargas:', { error: e3?.message ?? 'none' });

  // Verificación final
  const { count: tc } = await sb.from('tenants').select('*', { count: 'exact', head: true });
  const { count: pc } = await sb.from('productos').select('*', { count: 'exact', head: true });
  const { count: ag } = await sb.from('productos').select('*', { count: 'exact', head: true }).eq('stock_cantidad', 0);
  const { count: vc } = await sb.from('producto_variantes').select('*', { count: 'exact', head: true });
  const { count: ic } = await sb.from('inventario_cargas').select('*', { count: 'exact', head: true });

  console.log('--- VERIFICACION FINAL ---');
  console.log({ tenants: tc, productos: pc, agotados: ag, variantes: vc, cargas: ic });
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
