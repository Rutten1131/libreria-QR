'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { listarProductos, toggleProductoStock } from '@/lib/api';
import { useTenant } from '@/lib/tenant';
import type { Producto } from '@/lib/types';
import ExcelUploader from '@/components/ExcelUploader';

/* ── Iconos SVG temáticos por categoría de papelería ── */
function CategoriaIcon({ nombre, size = 32 }: { nombre: string; size?: number }) {
  const norm = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('cuaderno') || norm.includes('libreta') || norm.includes('block')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
        <path d="M6 14h6" />
      </svg>
    );
  }
  if (norm.includes('lapiz') || norm.includes('esfero') || norm.includes('boligrafo') || norm.includes('pluma') || norm.includes('marcador')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    );
  }
  if (norm.includes('borrador') || norm.includes('corrector')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21Z" />
        <path d="M22 21H7" />
        <path d="m5 11 9 9" />
      </svg>
    );
  }
  if (norm.includes('regla') || norm.includes('escuadra') || norm.includes('graduador')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z" />
        <path d="m14.5 3.5 2 2" />
        <path d="m11.5 6.5 1 1" />
        <path d="m8.5 9.5 2 2" />
        <path d="m5.5 12.5 1 1" />
      </svg>
    );
  }
  if (norm.includes('tijera') || norm.includes('corte') || norm.includes('estilete')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <path d="M8.12 8.12 12 12" />
        <path d="M20 4 8.12 15.88" />
        <circle cx="6" cy="18" r="3" />
        <path d="M14.8 14.8 20 20" />
      </svg>
    );
  }
  if (norm.includes('pegamento') || norm.includes('goma') || norm.includes('silicona')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v2" />
        <path d="M14 2v2" />
        <path d="M8 4h8l1 4H7l1-4Z" />
        <path d="M7 8v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8" />
        <path d="M10 12h4" />
      </svg>
    );
  }
  if (norm.includes('papel') || norm.includes('cartulina') || norm.includes('resma') || norm.includes('carpeta') || norm.includes('fomix')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="12" y2="17" />
      </svg>
    );
  }
  if (norm.includes('pintura') || norm.includes('tempera') || norm.includes('acuarela') || norm.includes('color') || norm.includes('pincel')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z" />
      </svg>
    );
  }
  if (norm.includes('compas') || norm.includes('geometria')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="m12 7-6 15" />
        <path d="m12 7 6 15" />
        <path d="M9 16h6" />
      </svg>
    );
  }
  if (norm.includes('sacapunta')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="14" x="3" y="5" rx="3" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 9v6" />
      </svg>
    );
  }
  // Default general
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}

function EmptyState({ filter, onImportClick }: { filter: string; onImportClick: () => void }) {
  return (
    <motion.div
      className="lqr-empty glass"
      initial={{ opacity: 0, transform: 'scale(0.97)' }}
      animate={{ opacity: 1, transform: 'scale(1)' }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
      </svg>
      <p className="lqr-empty__title">
        {filter ? 'Sin resultados' : 'Catálogo vacío'}
      </p>
      <p className="lqr-empty__sub">
        {filter
          ? `No encontramos productos con "${filter}". Intenta con otra palabra.`
          : 'Importa tu inventario en Excel o CSV para que la IA cotice tus productos.'}
      </p>
      {!filter && (
        <button
          type="button"
          className="lqr-empty__btn"
          onClick={onImportClick}
        >
          📤 Importar Excel ahora
        </button>
      )}
    </motion.div>
  );
}

export default function InventarioPage() {
  const router = useRouter();
  const tenant = useTenant();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [soloNoDisponibles, setSoloNoDisponibles] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  const cargarDatos = useCallback(() => {
    if (!tenant) return;
    setLoading(true);
    listarProductos(tenant).then((data) => {
      setProductos(data);
      setLoading(false);
    });
  }, [tenant]);

  useEffect(() => {
    if (!tenant) {
      router.replace('/panel/login');
      return;
    }
    cargarDatos();
  }, [tenant, router, cargarDatos]);

  // Lista de categorías con totales y stock disponible
  const categorias = useMemo(() => {
    const map = new Map<string, { total: number; disponibles: number }>();
    productos.forEach((p) => {
      const fam = (p.familia || 'general').trim().toLowerCase();
      const current = map.get(fam) || { total: 0, disponibles: 0 };
      current.total += 1;
      if (p.disponible) current.disponibles += 1;
      map.set(fam, current);
    });
    return Array.from(map.entries())
      .map(([nombre, stats]) => ({
        nombre,
        total: stats.total,
        disponibles: stats.disponibles,
        agotados: stats.total - stats.disponibles,
      }))
      .sort((a, b) => b.total - a.total);
  }, [productos]);

  // Si hay búsqueda activa, filtramos en todo el catálogo
  const modoBusqueda = Boolean(filter.trim());

  // Productos mostrados
  const productosAMostrar = useMemo(() => {
    let list = productos;
    if (soloNoDisponibles) list = list.filter((p) => !p.disponible);

    if (modoBusqueda) {
      const f = filter.toLowerCase();
      return list.filter(
        (p) => p.nombre.toLowerCase().includes(f) || (p.familia && p.familia.toLowerCase().includes(f))
      );
    }

    if (categoriaActiva) {
      list = list.filter((p) => (p.familia || 'general').toLowerCase() === categoriaActiva.toLowerCase());
    }

    return list;
  }, [productos, filter, soloNoDisponibles, categoriaActiva, modoBusqueda]);

  const toggleDisponible = async (id: string) => {
    const item = productos.find((p) => p.id === id);
    if (!item || !tenant) return;
    const nuevoEstado = !item.disponible;

    // Actualización optimista
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, disponible: nuevoEstado } : p))
    );

    // Sincronizar backend
    await toggleProductoStock(tenant, id, nuevoEstado);
  };

  const totalAgotados = productos.filter((p) => !p.disponible).length;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  return (
    <main className="lqr-main">
      <div className="lqr-container">

        {/* ── Page Header Island ── */}
        <div className="lqr-page-head glass">
          <div className="lqr-page-head__left">
            <div className="lqr-page-head__title-wrap">
              <h1 className="lqr-title">Inventario y Catálogo</h1>
              {totalAgotados > 0 && (
                <span className="lqr-badge lqr-badge--danger">
                  {totalAgotados} agotado{totalAgotados > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="lqr-sub">
              {categoriaActiva && !modoBusqueda
                ? `Explorando la categoría: ${categoriaActiva.toUpperCase()}`
                : 'Organizado por categorías. Selecciona una categoría para ver y editar sus productos.'}
            </p>
          </div>

          <button
            type="button"
            className="lqr-btn-import"
            onClick={() => setShowUploader(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14,2 14,8 20,8" />
              <path d="M12 18v-6M9 15l3-3 3 3" />
            </svg>
            Importar Excel
          </button>
        </div>

        {/* ── Barra de Búsqueda ── */}
        <div className="lqr-search-island glass" role="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Buscar útil en todo el inventario (ej. Cuaderno cuadros, Lápiz 2B, Regla)..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Buscar productos"
          />
          {filter && (
            <button
              className="lqr-clear-btn"
              onClick={() => setFilter('')}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        {/* ── Barra de Navegación / Volver cuando se está dentro de una categoría ── */}
        {!modoBusqueda && categoriaActiva && (
          <div className="lqr-breadcrumb-bar">
            <button
              type="button"
              className="lqr-back-btn"
              onClick={() => setCategoriaActiva(null)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Volver a todas las categorías</span>
            </button>

            <div className="lqr-active-cat-badge">
              <CategoriaIcon nombre={categoriaActiva} size={18} />
              <span>{categoriaActiva} ({productosAMostrar.length} productos)</span>
            </div>
          </div>
        )}

        {/* ── Toolbar (Filtros de disponibilidad) ── */}
        {(modoBusqueda || categoriaActiva) && (
          <div className="lqr-toolbar">
            <label className="lqr-toggle" htmlFor="solo-agotados">
              <span className="lqr-toggle__track" data-checked={soloNoDisponibles}>
                <span className="lqr-toggle__thumb" />
              </span>
              <input
                id="solo-agotados"
                type="checkbox"
                className="lqr-toggle__input"
                checked={soloNoDisponibles}
                onChange={(e) => setSoloNoDisponibles(e.target.checked)}
              />
              <span className="lqr-toggle__label">Ver solo productos agotados</span>
            </label>

            <span className="lqr-count">
              {productosAMostrar.length} {productosAMostrar.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>
        )}

        {/* ── Estado de Carga ── */}
        {loading ? (
          <div className="lqr-loading">
            <span className="lqr-spinner" aria-hidden />
            <p>Cargando catálogo de papelería…</p>
          </div>
        ) : productos.length === 0 ? (
          <EmptyState filter={filter} onImportClick={() => setShowUploader(true)} />
        ) : !modoBusqueda && !categoriaActiva ? (
          /* ── VISTA 1: CUADRÍCULA DE CATEGORÍAS CON ILUSTRACIONES/ICONOS ── */
          <div className="lqr-categories-section">
            <div className="lqr-section-header">
              <h2 className="lqr-section-title">Categorías de Útiles ({categorias.length})</h2>
              <span className="lqr-section-sub">Toca una categoría para ver sus artículos y precios</span>
            </div>

            <div className="lqr-cat-grid">
              {categorias.map((cat, idx) => (
                <motion.div
                  key={cat.nombre}
                  className="lqr-cat-card glass-card"
                  onClick={() => setCategoriaActiva(cat.nombre)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="lqr-cat-card__icon-box">
                    <CategoriaIcon nombre={cat.nombre} size={32} />
                  </div>

                  <div className="lqr-cat-card__body">
                    <h3 className="lqr-cat-card__title">{cat.nombre}</h3>
                    <div className="lqr-cat-card__meta">
                      <span className="lqr-cat-card__count">{cat.total} {cat.total === 1 ? 'artículo' : 'artículos'}</span>
                      {cat.agotados > 0 ? (
                        <span className="lqr-cat-card__stock-tag lqr-cat-card__stock-tag--warn">
                          {cat.agotados} agotado{cat.agotados > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="lqr-cat-card__stock-tag lqr-cat-card__stock-tag--ok">
                          Todo disponible
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="lqr-cat-card__arrow" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          /* ── VISTA 2: LISTA DE PRODUCTOS DE LA CATEGORÍA O BÚSQUEDA ── */
          productosAMostrar.length === 0 ? (
            <EmptyState filter={filter} onImportClick={() => setShowUploader(true)} />
          ) : (
            <ul className="lqr-list" aria-label="Lista de útiles">
              <AnimatePresence initial={false}>
                {productosAMostrar.map((p, i) => (
                  <motion.li
                    key={p.id}
                    className="lqr-item-row glass-card"
                    initial={{ opacity: 0, transform: 'translateY(8px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    exit={{ opacity: 0, transform: 'translateX(-12px)' }}
                    transition={{ duration: 0.24, delay: i < 20 ? i * 0.015 : 0, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ transform: 'translateY(-2px)' }}
                    whileTap={{ transform: 'scale(0.98)' }}
                    layout
                  >
                    <div className="lqr-item-row__icon-wrap">
                      <CategoriaIcon nombre={p.familia || 'general'} size={20} />
                    </div>

                    <div className="lqr-item-row__main">
                      <strong className="lqr-item-row__name">{p.nombre}</strong>
                      <div className="lqr-item-row__meta">
                        <span className="lqr-family-pill">{p.familia}</span>
                        <span className="lqr-item-row__price">${p.precio.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleDisponible(p.id)}
                      className={`lqr-stock-btn ${p.disponible ? 'lqr-stock-btn--on' : 'lqr-stock-btn--off'}`}
                      aria-pressed={p.disponible}
                      aria-label={`${p.nombre}: ${p.disponible ? 'Disponible' : 'Agotado'}. Toque para alternar stock.`}
                    >
                      <span className="lqr-stock-btn__dot" aria-hidden />
                      {p.disponible ? 'Disponible' : 'Agotado'}
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )
        )}

        {/* ── Modal de Importación Excel ── */}
        <AnimatePresence>
          {showUploader && tenant && (
            <ExcelUploader
              tenantId={tenant}
              apiUrl={apiUrl}
              onClose={() => setShowUploader(false)}
              onSuccess={() => {
                cargarDatos();
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .lqr-main {
          min-height: calc(100vh - var(--header-h) - 40px);
          padding: 20px 0 110px;
        }
        .lqr-container {
          max-width: 860px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* ── Page Header Island ── */
        .lqr-page-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 24px 28px;
          margin-bottom: 20px;
          border-radius: var(--radius-xl);
          flex-wrap: wrap;
        }
        .lqr-page-head__left {
          flex: 1;
          min-width: 240px;
        }
        .lqr-page-head__title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
        }
        .lqr-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          line-height: 1.1;
        }
        .lqr-sub {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .lqr-btn-import {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--accent);
          color: #000;
          font-size: 14px;
          font-weight: 700;
          border-radius: var(--radius-full);
          box-shadow: var(--accent-glow);
          cursor: pointer;
          border: none;
          transition: transform 0.2s var(--ease-spring), filter 0.15s;
          white-space: nowrap;
        }
        .lqr-btn-import:hover {
          filter: brightness(1.1);
        }
        .lqr-btn-import:active {
          transform: scale(0.96);
        }

        .lqr-empty__btn {
          margin-top: 14px;
          padding: 10px 22px;
          background: var(--accent);
          color: #000;
          font-size: 13px;
          font-weight: 700;
          border-radius: var(--radius-full);
          box-shadow: var(--accent-glow);
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .lqr-empty__btn:active {
          transform: scale(0.96);
        }

        /* ── Search Island ── */
        .lqr-search-island {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 22px;
          margin-bottom: 16px;
          border-radius: var(--radius-full);
          color: var(--text-muted);
        }
        .lqr-search-island input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .lqr-clear-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--glass-bg-hover);
          color: var(--text-muted);
          border: none;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* ── Breadcrumb / Volver bar ── */
        .lqr-breadcrumb-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .lqr-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 700;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 0.2s var(--ease-spring);
        }
        .lqr-back-btn:hover {
          background: var(--glass-bg-hover);
          border-color: var(--accent);
          color: var(--accent);
          transform: translateX(-2px);
        }
        .lqr-active-cat-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--accent);
          background: var(--accent-soft);
          border: 1px solid var(--accent-border);
          padding: 6px 14px;
          border-radius: var(--radius-full);
          text-transform: capitalize;
        }

        /* ── Categories Grid ── */
        .lqr-categories-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .lqr-section-header {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 4px;
        }
        .lqr-section-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .lqr-section-sub {
          font-size: 13px;
          color: var(--text-muted);
        }
        .lqr-cat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }
        .lqr-cat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 22px;
          border-radius: var(--radius-xl);
          cursor: pointer;
          transition: all 0.25s var(--ease-spring);
          position: relative;
          overflow: hidden;
        }
        .lqr-cat-card:hover {
          border-color: var(--accent);
          background: var(--glass-bg-hover);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
        }
        .lqr-cat-card__icon-box {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-lg);
          background: var(--accent-soft);
          color: var(--accent);
          border: 1px solid var(--accent-border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s var(--ease-spring);
        }
        .lqr-cat-card:hover .lqr-cat-card__icon-box {
          transform: scale(1.1) rotate(-3deg);
        }
        .lqr-cat-card__body {
          flex: 1;
          min-width: 0;
        }
        .lqr-cat-card__title {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          text-transform: capitalize;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lqr-cat-card__meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lqr-cat-card__count {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .lqr-cat-card__stock-tag {
          font-size: 11px;
          font-weight: 700;
        }
        .lqr-cat-card__stock-tag--ok {
          color: #30d158;
        }
        .lqr-cat-card__stock-tag--warn {
          color: #ffd60a;
        }
        .lqr-cat-card__arrow {
          color: var(--text-muted);
          transition: transform 0.2s, color 0.2s;
        }
        .lqr-cat-card:hover .lqr-cat-card__arrow {
          color: var(--accent);
          transform: translateX(4px);
        }

        /* ── Toolbar ── */
        .lqr-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 0 4px;
        }
        .lqr-toggle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }
        .lqr-toggle__input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }
        .lqr-toggle__track {
          position: relative;
          width: 40px;
          height: 24px;
          border-radius: 12px;
          background: var(--glass-bg-deep);
          border: 1px solid var(--glass-stroke-strong);
          box-shadow: var(--glass-specular);
          transition: background var(--duration-fast) var(--ease-out);
        }
        .lqr-toggle__track[data-checked='true'] {
          background: var(--accent-soft);
          border-color: var(--accent-border);
        }
        .lqr-toggle__thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--text-muted);
          transition: transform var(--duration-base) var(--ease-spring), background var(--duration-fast) var(--ease-out);
        }
        .lqr-toggle__track[data-checked='true'] .lqr-toggle__thumb {
          transform: translateX(16px);
          background: var(--accent);
          box-shadow: var(--accent-glow);
        }
        .lqr-toggle__label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .lqr-count {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        /* ── List ── */
        .lqr-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lqr-item-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 22px;
          border-radius: var(--radius-lg);
        }
        .lqr-item-row__icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          background: var(--glass-bg-deep);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lqr-item-row__main {
          flex: 1;
          min-width: 0;
        }
        .lqr-item-row__name {
          display: block;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lqr-item-row__meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lqr-family-pill {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          text-transform: capitalize;
        }
        .lqr-item-row__price {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-primary);
        }

        /* ── Stock Toggle Button ── */
        .lqr-stock-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          border-radius: var(--radius-full);
          min-width: 120px;
          justify-content: center;
          min-height: 44px;
          box-shadow: var(--glass-specular);
          border: none;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-spring);
        }
        .lqr-stock-btn:active {
          transform: scale(0.94);
        }
        .lqr-stock-btn__dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
        }
        .lqr-stock-btn--on {
          background: rgba(48, 209, 88, 0.08);
          color: #30d158;
          border: 1px solid rgba(48, 209, 88, 0.15);
        }
        .lqr-stock-btn--off {
          background: rgba(255, 69, 58, 0.08);
          color: #ff453a;
          border: 1px solid rgba(255, 69, 58, 0.15);
        }

        /* ── Empty ── */
        .lqr-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 56px 24px;
          gap: 12px;
          color: var(--text-muted);
          text-align: center;
          border-radius: var(--radius-xl);
        }
        .lqr-empty__title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .lqr-empty__sub {
          font-size: 13px;
          max-width: 320px;
          line-height: 1.5;
        }

        /* ── Loading ── */
        .lqr-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          gap: 16px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
        }
        .lqr-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--glass-stroke-strong);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
