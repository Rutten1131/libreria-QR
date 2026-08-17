'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

/* ================================================================
   TIPOS
   ================================================================ */
interface MappedRow {
  nombre: string;
  familia: string;
  precio: number;
  stock: number;
}

interface CargaResultado {
  cargados: number;
  rechazados: number;
  detalle_rechazos: Array<{ item: any; errores: string[] }>;
}

type Paso = 'archivo' | 'preview' | 'cargando' | 'resultado';

/* ================================================================
   AUTO-DETECCIÓN INTELIGENTE — sinónimos frecuentes en papelerías
   ================================================================ */
const SINONIMOS: Record<string, string[]> = {
  nombre: ['nombre', 'producto', 'articulo', 'artículo', 'descripcion', 'descripción', 'item', 'ítem', 'detalle', 'desc', 'material', 'utiles', 'útiles'],
  familia: ['familia', 'categoria', 'categoría', 'tipo', 'grupo', 'linea', 'línea', 'clase', 'seccion', 'sección', 'rubro'],
  precio: ['precio', 'pvp', 'p.v.p', 'p.v.p.', 'costo', 'valor', 'price', 'preciou', 'precio_unitario', 'preciounitario', 'importe', 'preciounitario', 'p_unit'],
  stock: ['stock', 'cantidad', 'cant', 'cant.', 'existencia', 'existencias', 'qty', 'disponible', 'unidades', 'und', 'inventario'],
};

function normalizarTexto(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/** Corrige caracteres mojibake (UTF-8 leído como latin1) usando TextDecoder */
function repararEncoding(texto: string): string {
  try {
    // Si el texto contiene secuencias mojibake típicas, intentar re-decodificar
    // eslint-disable-next-line no-control-regex
    if (/[\xC3][\x80-\xBF]/.test(texto)) {
      const bytes = new Uint8Array([...texto].map((c) => c.charCodeAt(0)));
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch {
    // Si falla, devolver el texto original
  }
  return texto;
}

function autoDetectar(headers: string[]): Record<string, number> {
  const mapeo: Record<string, number> = {};
  const usedIdx = new Set<number>();

  for (const campo of Object.keys(SINONIMOS)) {
    for (let i = 0; i < headers.length; i++) {
      if (usedIdx.has(i)) continue;
      const norm = normalizarTexto(headers[i]);
      if (SINONIMOS[campo].some((s) => normalizarTexto(s) === norm || norm.includes(normalizarTexto(s)))) {
        mapeo[campo] = i;
        usedIdx.add(i);
        break;
      }
    }
  }

  // Si no hay nombre pero hay datos, usar la primera columna textual
  if (mapeo.nombre === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (!usedIdx.has(i)) {
        mapeo.nombre = i;
        usedIdx.add(i);
        break;
      }
    }
  }

  return mapeo;
}

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
interface Props {
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
  apiUrl: string;
}

const PRODUCTOS_EJEMPLO = [
  { 'Artículo': 'Cuaderno college 100 hojas cuadros', 'Categoría': 'cuaderno', 'PVP': 2.50, 'Stock': 80 },
  { 'Artículo': 'Cuaderno universitario 100 hojas líneas', 'Categoría': 'cuaderno', 'PVP': 3.00, 'Stock': 60 },
  { 'Artículo': 'Lápiz 2B Faber Castell', 'Categoría': 'lapiz', 'PVP': 0.50, 'Stock': 200 },
  { 'Artículo': 'Lápiz HB Mongol', 'Categoría': 'lapiz', 'PVP': 0.40, 'Stock': 150 },
  { 'Artículo': 'Borrador blanco de miga', 'Categoría': 'borrador', 'PVP': 0.30, 'Stock': 120 },
  { 'Artículo': 'Regla plástica 30cm', 'Categoría': 'regla', 'PVP': 0.80, 'Stock': 90 },
  { 'Artículo': 'Tijera escolar punta redonda', 'Categoría': 'tijera', 'PVP': 1.20, 'Stock': 70 },
  { 'Artículo': 'Goma en barra 40g', 'Categoría': 'pegamento', 'PVP': 0.75, 'Stock': 100 },
  { 'Artículo': 'Sacapuntas metálico doble', 'Categoría': 'sacapuntas', 'PVP': 0.60, 'Stock': 80 },
  { 'Artículo': 'Compás de precisión', 'Categoría': 'compas', 'PVP': 2.20, 'Stock': 40 },
  { 'Artículo': 'Juego geométrico 4 piezas', 'Categoría': 'regla', 'PVP': 1.80, 'Stock': 50 },
  { 'Artículo': 'Resma de papel bond A4 75g', 'Categoría': 'papel', 'PVP': 5.20, 'Stock': 40 },
  { 'Artículo': 'Caja de 12 pinturas de colores', 'Categoría': 'pinturas', 'PVP': 3.50, 'Stock': 60 },
  { 'Artículo': 'Carpeta plástica con elástico', 'Categoría': 'carpeta', 'PVP': 1.10, 'Stock': 100 },
  { 'Artículo': 'Corrector líquido blanco', 'Categoría': 'corrector', 'PVP': 1.00, 'Stock': 50 },
];

export default function ExcelUploader({ tenantId, onClose, onSuccess, apiUrl }: Props) {
  const [paso, setPaso] = useState<Paso>('archivo');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [items, setItems] = useState<MappedRow[]>([]);
  const [totalFilas, setTotalFilas] = useState(0);
  const [deteccion, setDeteccion] = useState<{ nombre: boolean; familia: boolean; precio: boolean; stock: boolean }>({ nombre: false, familia: false, precio: false, stock: false });
  const [resultado, setResultado] = useState<CargaResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDescargarEjemplo = () => {
    const ws = XLSX.utils.json_to_sheet(PRODUCTOS_EJEMPLO);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'inventario_libreria_ejemplo.xlsx');
  };

  /* ── Leer archivo con soporte UTF-8 ── */
  const leerArchivoComoArray = (file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(new Uint8Array(e.target?.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const leerArchivoComoTexto = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  };

  /* ── Parsear y auto-mapear automáticamente ── */
  const procesarArchivo = useCallback(async (file: File) => {
    setArchivo(file);
    setError(null);

    try {
      let jsonRaw: any[][];

      // Si es CSV, leer como texto UTF-8 primero para preservar tildes
      if (file.name.toLowerCase().endsWith('.csv')) {
        const textoUtf8 = await leerArchivoComoTexto(file);
        const wb = XLSX.read(textoUtf8, { type: 'string' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        jsonRaw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      } else {
        const data = await leerArchivoComoArray(file);
        const wb = XLSX.read(data, { type: 'array', codepage: 65001 });
        const ws = wb.Sheets[wb.SheetNames[0]];
        jsonRaw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      }

      if (jsonRaw.length < 2) {
        setError('El archivo debe tener al menos una fila de encabezados y una de datos.');
        return;
      }

      // Reparar encoding mojibake en headers y datos
      const headers = jsonRaw[0].map((c: any) => repararEncoding(String(c).trim()));
      const dataRows = jsonRaw.slice(1).filter((r) => r.some((c: any) => c !== ''));

      if (dataRows.length === 0) {
        setError('El archivo no contiene filas de datos.');
        return;
      }

      // Auto-detectar columnas
      const mapeo = autoDetectar(headers);
      const tieneNombre = mapeo.nombre !== undefined;
      const tieneFamilia = mapeo.familia !== undefined;
      const tienePrecio = mapeo.precio !== undefined;
      const tieneStock = mapeo.stock !== undefined;

      if (!tieneNombre) {
        setError('No se encontró una columna de nombre/artículo. Verifica que tu archivo tenga una columna como "Artículo", "Producto" o "Nombre".');
        return;
      }

      // Transformar filas automáticamente
      const mapped: MappedRow[] = dataRows.map((row) => {
        const rawNombre = repararEncoding(String(row[mapeo.nombre] ?? '').trim());
        const rawFamilia = tieneFamilia ? repararEncoding(String(row[mapeo.familia] ?? '').trim()).toLowerCase() : 'general';
        const rawPrecio = tienePrecio
          ? parseFloat(String(row[mapeo.precio] ?? '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
          : 0;
        const rawStock = tieneStock
          ? parseInt(String(row[mapeo.stock] ?? '0').replace(/[^0-9]/g, ''), 10) || 0
          : 1;

        return {
          nombre: rawNombre,
          familia: rawFamilia || 'general',
          precio: rawPrecio,
          stock: rawStock,
        };
      }).filter((item) => item.nombre.length > 0);

      setDeteccion({ nombre: tieneNombre, familia: tieneFamilia, precio: tienePrecio, stock: tieneStock });
      setItems(mapped);
      setTotalFilas(mapped.length);
      setPaso('preview');
    } catch {
      setError('No se pudo leer el archivo. Verifica que sea un Excel (.xlsx, .xls) o CSV válido.');
    }
  }, []);

  /* ── Drag & Drop ── */
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) procesarArchivo(f);
    },
    [procesarArchivo]
  );

  /* ── Enviar al backend ── */
  const enviar = async () => {
    setPaso('cargando');
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/tenants/${tenantId}/inventario/importar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, items }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar inventario');
        setPaso('preview');
        return;
      }

      setResultado(data);
      setPaso('resultado');
    } catch (e: any) {
      setError(e.message || 'Error de conexión con el servidor');
      setPaso('preview');
    }
  };

  // Categorías únicas detectadas
  const categoriasDetectadas = [...new Set(items.map((i) => i.familia))].slice(0, 8);

  return (
    <div className="excel-overlay" onClick={onClose}>
      <motion.div
        className="excel-modal glass-strong"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, transform: 'translateY(24px) scale(0.96)' }}
        animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
        exit={{ opacity: 0, transform: 'translateY(12px) scale(0.97)' }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="excel-modal__header">
          <div>
            <h2 className="excel-modal__title">
              {paso === 'archivo' && '📤 Importar inventario'}
              {paso === 'preview' && '✅ Inventario detectado'}
              {paso === 'cargando' && '⏳ Cargando...'}
              {paso === 'resultado' && '🎉 Carga completa'}
            </h2>
            <p className="excel-modal__sub">
              {paso === 'archivo' && 'Sube tu Excel o CSV — el sistema detecta automáticamente las columnas.'}
              {paso === 'preview' && `${totalFilas} productos listos para cargar. Revisa la vista previa.`}
              {paso === 'cargando' && 'Validando y cargando productos...'}
              {paso === 'resultado' && 'Tu inventario ha sido procesado.'}
            </p>
          </div>
          <button className="excel-modal__close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        {/* Error global */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="excel-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span>⚠️</span> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PASO 1: ARCHIVO ── */}
        {paso === 'archivo' && (
          <div
            className={`excel-dropzone ${dragActive ? 'excel-dropzone--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="excel-dropzone__input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) procesarArchivo(f);
              }}
            />
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14,2 14,8 20,8" />
              <path d="M12 18v-6M9 15l3-3 3 3" />
            </svg>
            <p className="excel-dropzone__title">
              {dragActive ? 'Suelta el archivo aquí' : 'Arrastra tu Excel o CSV aquí'}
            </p>
            <p className="excel-dropzone__sub">o haz clic para seleccionar — el sistema detecta las columnas automáticamente</p>
            <span className="excel-dropzone__formats">.xlsx · .xls · .csv</span>

            <div className="excel-template-box" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="excel-template-btn"
                onClick={handleDescargarEjemplo}
              >
                📥 Descargar Excel de Prueba (.xlsx)
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 2: PREVIEW AUTOMÁTICO ── */}
        {paso === 'preview' && (
          <div className="excel-preview-section">
            {/* Archivo y detección */}
            <div className="excel-preview__info">
              <span className="excel-preview__file-badge">📄 {archivo?.name}</span>
              <button className="excel-preview__change" onClick={() => { setPaso('archivo'); setError(null); setItems([]); }}>
                Cambiar archivo
              </button>
            </div>

            {/* Detección automática */}
            <div className="excel-detect-summary">
              <p className="excel-detect-title">🔍 Columnas detectadas automáticamente:</p>
              <div className="excel-detect-chips">
                <span className={`excel-detect-chip ${deteccion.nombre ? 'excel-detect-chip--ok' : 'excel-detect-chip--miss'}`}>
                  {deteccion.nombre ? '✓' : '✗'} Artículo
                </span>
                <span className={`excel-detect-chip ${deteccion.precio ? 'excel-detect-chip--ok' : 'excel-detect-chip--miss'}`}>
                  {deteccion.precio ? '✓' : '✗'} Precio
                </span>
                <span className={`excel-detect-chip ${deteccion.familia ? 'excel-detect-chip--ok' : 'excel-detect-chip--miss'}`}>
                  {deteccion.familia ? '✓' : '—'} Categoría
                </span>
                <span className={`excel-detect-chip ${deteccion.stock ? 'excel-detect-chip--ok' : 'excel-detect-chip--miss'}`}>
                  {deteccion.stock ? '✓' : '—'} Stock
                </span>
              </div>
              {!deteccion.precio && (
                <p className="excel-detect-warn">⚠️ No se detectó columna de precio — se asignará $0 por defecto.</p>
              )}
            </div>

            {/* Categorías detectadas */}
            {categoriasDetectadas.length > 1 && (
              <div className="excel-cats">
                <p className="excel-cats__label">Categorías encontradas:</p>
                <div className="excel-cats__list">
                  {categoriasDetectadas.map((c) => (
                    <span key={c} className="excel-cats__chip">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabla preview */}
            <div className="excel-preview">
              <p className="excel-preview__title">Vista previa (primeras {Math.min(items.length, 8)} de {totalFilas})</p>
              <div className="excel-preview__scroll">
                <table className="excel-preview__table">
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 8).map((item, i) => (
                      <tr key={i}>
                        <td className="excel-preview__name">{item.nombre}</td>
                        <td><span className="excel-preview__cat">{item.familia}</span></td>
                        <td className="excel-preview__price">${item.precio.toFixed(2)}</td>
                        <td className="excel-preview__stock">{item.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botón enviar */}
            <button
              className="excel-btn excel-btn--primary"
              onClick={enviar}
            >
              Cargar {totalFilas} productos →
            </button>
          </div>
        )}

        {/* ── PASO 3: CARGANDO ── */}
        {paso === 'cargando' && (
          <div className="excel-loading">
            <div className="excel-spinner" />
            <p>Procesando {totalFilas} productos...</p>
          </div>
        )}

        {/* ── PASO 4: RESULTADO ── */}
        {paso === 'resultado' && resultado && (
          <div className="excel-resultado">
            <div className="excel-resultado__cards">
              <div className="excel-resultado__card excel-resultado__card--ok">
                <span className="excel-resultado__num">{resultado.cargados}</span>
                <span className="excel-resultado__label">Cargados</span>
              </div>
              {resultado.rechazados > 0 && (
                <div className="excel-resultado__card excel-resultado__card--err">
                  <span className="excel-resultado__num">{resultado.rechazados}</span>
                  <span className="excel-resultado__label">Rechazados</span>
                </div>
              )}
            </div>

            {resultado.rechazados > 0 && resultado.detalle_rechazos.length > 0 && (
              <div className="excel-rechazos">
                <p className="excel-rechazos__title">Detalle de rechazos:</p>
                <ul className="excel-rechazos__list">
                  {resultado.detalle_rechazos.slice(0, 10).map((r, i) => (
                    <li key={i}>
                      <strong>{r.item?.nombre || `Fila ${i + 1}`}</strong>: {r.errores.join(', ')}
                    </li>
                  ))}
                  {resultado.detalle_rechazos.length > 10 && (
                    <li className="excel-rechazos__more">
                      ... y {resultado.detalle_rechazos.length - 10} más
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="excel-resultado__actions">
              <button className="excel-btn excel-btn--primary" onClick={() => { onSuccess(); onClose(); }}>
                Ver inventario actualizado
              </button>
              <button className="excel-btn excel-btn--ghost" onClick={() => { setPaso('archivo'); setResultado(null); setError(null); setItems([]); }}>
                Subir otro archivo
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <style jsx>{`
        /* ── Overlay ── */
        .excel-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        /* ── Modal ── */
        .excel-modal {
          width: 100%;
          max-width: 640px;
          max-height: 85vh;
          overflow-y: auto;
          border-radius: var(--radius-xl);
          padding: 32px;
        }
        .excel-modal__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .excel-modal__title {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.03em;
        }
        .excel-modal__sub {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .excel-modal__close {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--glass-bg-hover);
          color: var(--text-muted);
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          cursor: pointer;
          border: none;
          transition: background 0.15s;
        }
        .excel-modal__close:hover {
          background: var(--glass-bg-deep);
          color: var(--text-primary);
        }

        /* ── Error ── */
        .excel-error {
          background: rgba(255, 69, 58, 0.1);
          border: 1px solid rgba(255, 69, 58, 0.2);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #ff453a;
          margin-bottom: 16px;
          overflow: hidden;
        }

        /* ── Dropzone ── */
        .excel-dropzone {
          border: 2px dashed var(--glass-stroke-strong);
          border-radius: var(--radius-xl);
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.25s var(--ease-spring);
          color: var(--text-muted);
          text-align: center;
        }
        .excel-dropzone:hover, .excel-dropzone--active {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--accent);
        }
        .excel-dropzone__input {
          display: none;
        }
        .excel-dropzone__title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .excel-dropzone--active .excel-dropzone__title {
          color: var(--accent);
        }
        .excel-dropzone__sub {
          font-size: 13px;
          color: var(--text-muted);
        }
        .excel-dropzone__formats {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          margin-top: 4px;
        }

        .excel-template-box {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px dashed var(--glass-stroke);
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .excel-template-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--accent);
          background: var(--accent-soft);
          border: 1px solid var(--accent-border);
          padding: 8px 16px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
        }

        .excel-template-btn:hover {
          background: var(--glass-bg-hover);
        }

        .excel-template-btn:active {
          transform: scale(0.96);
        }

        /* ── Preview Section ── */
        .excel-preview-section {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .excel-preview__info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .excel-preview__file-badge {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          padding: 6px 14px;
          border-radius: var(--radius-full);
        }
        .excel-preview__change {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* ── Detect Summary ── */
        .excel-detect-summary {
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-lg);
          padding: 16px;
        }
        .excel-detect-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 10px;
        }
        .excel-detect-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .excel-detect-chip {
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: var(--radius-full);
        }
        .excel-detect-chip--ok {
          background: rgba(48, 209, 88, 0.1);
          border: 1px solid rgba(48, 209, 88, 0.2);
          color: #30d158;
        }
        .excel-detect-chip--miss {
          background: var(--glass-bg-hover);
          border: 1px solid var(--glass-stroke);
          color: var(--text-muted);
        }
        .excel-detect-warn {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 600;
          color: #ffd60a;
        }

        /* ── Categorías ── */
        .excel-cats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .excel-cats__label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .excel-cats__list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .excel-cats__chip {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          background: var(--accent-soft);
          color: var(--accent);
          border: 1px solid var(--accent-border);
          text-transform: capitalize;
        }

        /* ── Preview Table ── */
        .excel-preview {
          margin-top: 4px;
        }
        .excel-preview__title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 8px;
        }
        .excel-preview__scroll {
          overflow-x: auto;
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-stroke);
        }
        .excel-preview__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .excel-preview__table th {
          background: var(--glass-bg-deep);
          color: var(--accent);
          font-weight: 700;
          padding: 10px 14px;
          text-align: left;
          white-space: nowrap;
          border-bottom: 1px solid var(--glass-stroke);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .excel-preview__table td {
          padding: 8px 14px;
          border-bottom: 1px solid var(--glass-stroke);
          color: var(--text-primary);
        }
        .excel-preview__table tr:last-child td {
          border-bottom: none;
        }
        .excel-preview__table tr:hover td {
          background: var(--glass-bg-hover);
        }
        .excel-preview__name {
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
        }
        .excel-preview__cat {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          text-transform: capitalize;
          white-space: nowrap;
        }
        .excel-preview__price {
          font-weight: 700;
          color: #30d158;
          white-space: nowrap;
        }
        .excel-preview__stock {
          font-weight: 600;
          text-align: center;
        }

        /* ── Buttons ── */
        .excel-btn {
          padding: 14px 28px;
          border-radius: var(--radius-full);
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s var(--ease-spring);
          text-align: center;
          border: none;
        }
        .excel-btn:active {
          transform: scale(0.96);
        }
        .excel-btn--primary {
          background: var(--accent);
          color: #000;
          box-shadow: var(--accent-glow);
        }
        .excel-btn--primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .excel-btn--primary:not(:disabled):hover {
          filter: brightness(1.1);
        }
        .excel-btn--ghost {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--glass-stroke-strong);
        }
        .excel-btn--ghost:hover {
          background: var(--glass-bg-hover);
        }

        /* ── Loading ── */
        .excel-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 48px 24px;
          color: var(--text-secondary);
          font-size: 15px;
          font-weight: 600;
        }
        .excel-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid var(--glass-stroke-strong);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Resultado ── */
        .excel-resultado {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .excel-resultado__cards {
          display: flex;
          gap: 14px;
        }
        .excel-resultado__card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 24px 16px;
          border-radius: var(--radius-lg);
        }
        .excel-resultado__card--ok {
          background: rgba(48, 209, 88, 0.08);
          border: 1px solid rgba(48, 209, 88, 0.15);
        }
        .excel-resultado__card--err {
          background: rgba(255, 69, 58, 0.08);
          border: 1px solid rgba(255, 69, 58, 0.15);
        }
        .excel-resultado__num {
          font-size: 36px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }
        .excel-resultado__card--ok .excel-resultado__num {
          color: #30d158;
        }
        .excel-resultado__card--err .excel-resultado__num {
          color: #ff453a;
        }
        .excel-resultado__label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .excel-resultado__actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ── Rechazos ── */
        .excel-rechazos {
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-md);
          padding: 16px;
        }
        .excel-rechazos__title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        .excel-rechazos__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .excel-rechazos__list strong {
          color: var(--text-primary);
        }
        .excel-rechazos__more {
          color: var(--text-muted);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
