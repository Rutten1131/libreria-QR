'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { listarProductos } from '@/lib/api';
import { useTenant } from '@/lib/tenant';
import type { Producto } from '@/lib/types';

export default function InventarioPage() {
  const tenant = useTenant();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [soloNoDisponibles, setSoloNoDisponibles] = useState(false);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    listarProductos(tenant).then((data) => {
      if (vivo) {
        setProductos(data);
        setLoading(false);
      }
    });
    return () => { vivo = false; };
  }, [tenant]);

  const filtrados = useMemo(() => {
    let list = productos;
    if (soloNoDisponibles) list = list.filter((p) => !p.disponible);
    if (!filter.trim()) return list;
    const f = filter.toLowerCase();
    return list.filter(
      (p) => p.nombre.toLowerCase().includes(f) || p.familia.toLowerCase().includes(f)
    );
  }, [productos, filter, soloNoDisponibles]);

  const toggleDisponible = (id: string) => {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, disponible: !p.disponible } : p))
    );
  };

  return (
    <main className="lqr-main">
      <div className="lqr-container">
        <h1 className="lqr-title">Inventario</h1>
        <p className="lqr-sub">
          Marca disponibilidad con un toque. Búsqueda rápida por nombre o familia.
        </p>

        <div className="lqr-search glass">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Buscar (ej. cuaderno, lápiz)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Buscar productos"
          />
        </div>

        <div className="lqr-filter">
          <label className="lqr-toggle">
            <input
              type="checkbox"
              checked={soloNoDisponibles}
              onChange={(e) => setSoloNoDisponibles(e.target.checked)}
            />
            <span>Solo agotados</span>
          </label>
          <span className="lqr-count">
            {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
          </span>
        </div>

        {loading ? (
          <div className="lqr-loading">
            <span className="lqr-spinner" aria-hidden />
            <p>Cargando inventario…</p>
          </div>
        ) : (
          <ul className="lqr-list">
            {filtrados.map((p, i) => (
              <motion.li
                key={p.id}
                className="lqr-row glass"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
              >
                <div className="lqr-row__main">
                  <strong className="lqr-row__name">{p.nombre}</strong>
                  <span className="lqr-row__meta">{p.familia} · ${p.precio.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleDisponible(p.id)}
                  className={`lqr-pill ${p.disponible ? 'lqr-pill--on' : 'lqr-pill--off'}`}
                  aria-pressed={p.disponible}
                  aria-label={`${p.nombre}: ${p.disponible ? 'disponible' : 'agotado'}. Toque para cambiar.`}
                >
                  <span className="lqr-pill__dot" aria-hidden />
                  {p.disponible ? 'Disponible' : 'Agotado'}
                </button>
              </motion.li>
            ))}
            {filtrados.length === 0 && (
              <li className="lqr-empty">No hay productos que coincidan.</li>
            )}
          </ul>
        )}
      </div>

      <style jsx>{`
        .lqr-main {
          padding: 40px 0 96px;
          min-height: calc(100vh - 64px);
        }
        .lqr-container {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 28px;
        }
        .lqr-title {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          margin-bottom: 6px;
          line-height: 1.1;
        }
        .lqr-sub {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 32px;
        }
        .lqr-search {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        .lqr-search input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 15px;
          color: var(--text-primary);
          font-weight: 500;
        }
        .lqr-search input::placeholder { color: var(--text-muted); font-weight: 400; }
        .lqr-filter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          font-size: 13px;
        }
        .lqr-toggle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
          cursor: pointer;
          font-weight: 500;
        }
        .lqr-toggle input { accent-color: var(--accent); width: 16px; height: 16px; }
        .lqr-count {
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
          font-weight: 500;
        }
        .lqr-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lqr-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 22px;
        }
        .lqr-row__main {
          flex: 1;
          min-width: 0;
        }
        .lqr-row__name {
          display: block;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
          letter-spacing: -0.01em;
        }
        .lqr-row__meta {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: capitalize;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
        }
        .lqr-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 10px;
          flex-shrink: 0;
          transition: background 180ms var(--ease-out), color 180ms var(--ease-out);
        }
        .lqr-pill__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .lqr-pill--on {
          background: var(--accent-soft);
          color: var(--accent);
        }
        .lqr-pill--off {
          background: var(--danger-soft);
          color: var(--danger);
        }
        .lqr-empty {
          padding: 48px 0;
          text-align: center;
          color: var(--text-muted);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-xl);
        }
        .lqr-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 16px;
          color: var(--text-secondary);
        }
        .lqr-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--glass-stroke);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 720px) {
          .lqr-container { padding: 0 18px; }
        }
        @media (max-width: 480px) {
          .lqr-row { padding: 16px 18px; }
          .lqr-title { font-size: 26px; }
        }
      `}</style>
    </main>
  );
}
