'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { listarPedidos } from '@/lib/api';
import { useTenant } from '@/lib/tenant';
import Avatar from '@/components/Avatar';
import type { Pedido, EstadoPedido } from '@/lib/types';

const COLUMNAS: { id: EstadoPedido; label: string; accent: 'warn' | 'info' | 'accent' }[] = [
  { id: 'necesita_revision', label: 'Necesita revisión', accent: 'warn' },
  { id: 'confirmado_pagado', label: 'Confirmado / Pagado', accent: 'info' },
  { id: 'despachado', label: 'Despachado', accent: 'accent' },
];

function formatRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export default function PedidosPage() {
  const tenant = useTenant();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    listarPedidos(tenant).then((data) => {
      if (vivo) {
        setPedidos(data);
        setLoading(false);
      }
    });
    return () => { vivo = false; };
  }, [tenant]);

  const filtrados = useMemo(() => {
    if (!filter.trim()) return pedidos;
    const f = filter.toLowerCase();
    return pedidos.filter(
      (p) =>
        p.cliente_nombre.toLowerCase().includes(f) ||
        p.id.toLowerCase().includes(f) ||
        p.items.some((i) => i.nombre.toLowerCase().includes(f))
    );
  }, [pedidos, filter]);

  const grouped = useMemo(() => {
    const g: Record<EstadoPedido, Pedido[]> = {
      necesita_revision: [],
      confirmado_pagado: [],
      despachado: [],
    };
    filtrados.forEach((p) => g[p.estado].push(p));
    return g;
  }, [filtrados]);

  const totales = useMemo(() => ({
    revision: grouped.necesita_revision.length,
    pagado: grouped.confirmado_pagado.length,
    despachado: grouped.despachado.length,
  }), [grouped]);

  return (
    <main className="lqr-main">
      <div className="lqr-container">
        {/* Resumen superior */}
        <section className="lqr-summary">
          <motion.div
            className="lqr-summary__item"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="lqr-summary__num">{totales.revision}</span>
            <span className="lqr-summary__label">por revisar</span>
          </motion.div>
          <motion.div
            className="lqr-summary__item"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <span className="lqr-summary__num">{totales.pagado}</span>
            <span className="lqr-summary__label">por despachar</span>
          </motion.div>
          <motion.div
            className="lqr-summary__item"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <span className="lqr-summary__num">{totales.despachado}</span>
            <span className="lqr-summary__label">despachados</span>
          </motion.div>
        </section>

        {/* Buscador */}
        <div className="lqr-search glass">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por cliente, ID o producto"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Buscar pedidos"
          />
        </div>

        {/* Tablero */}
        {loading ? (
          <div className="lqr-loading">
            <span className="lqr-spinner" aria-hidden />
            <p>Cargando pedidos…</p>
          </div>
        ) : (
          <div className="lqr-board">
            {COLUMNAS.map((col) => (
              <section key={col.id} className={`lqr-col lqr-col--${col.accent}`}>
                <header className="lqr-col__head">
                  <span className={`lqr-col__dot lqr-col__dot--${col.accent}`} aria-hidden />
                  <h2 className="lqr-col__title">{col.label}</h2>
                  <span className="lqr-col__count">{grouped[col.id].length}</span>
                </header>
                <div className="lqr-col__list">
                  {grouped[col.id].length === 0 ? (
                    <p className="lqr-col__empty">Sin pedidos</p>
                  ) : (
                    grouped[col.id].map((p, i) => (
                      <motion.article
                        key={p.id}
                        className="lqr-card glass"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.04 }}
                      >
                        <Link href={`/panel/pedidos/${p.id}`} className="lqr-card__link">
                          <div className="lqr-card__row">
                            <Avatar nombre={p.cliente_nombre} size={44} />
                            <div className="lqr-card__main">
                              <div className="lqr-card__top">
                                <strong className="lqr-card__name">{p.cliente_nombre}</strong>
                                <span className="lqr-card__time">{formatRelativo(p.created_at)}</span>
                              </div>
                              <div className="lqr-card__id">#{p.id.slice(-6)}</div>
                            </div>
                          </div>
                          <div className="lqr-card__items">
                            {p.items.slice(0, 2).map((it, idx) => (
                              <span key={idx} className="lqr-card__item">
                                {it.cantidad}× {it.nombre}
                              </span>
                            ))}
                            {p.items.length > 2 && (
                              <span className="lqr-card__item lqr-card__item--more">
                                +{p.items.length - 2}
                              </span>
                            )}
                          </div>
                          <div className="lqr-card__bottom">
                            <span className="lqr-card__total">${p.total.toFixed(2)}</span>
                            {p.accion_pendiente && (
                              <span className={`lqr-card__action lqr-card__action--${col.accent}`}>
                                {p.accion_pendiente}
                              </span>
                            )}
                          </div>
                        </Link>
                      </motion.article>
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .lqr-main {
          min-height: calc(100vh - 64px);
          padding: 40px 0 96px;
        }
        .lqr-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 28px;
        }

        /* Summary */
        .lqr-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .lqr-summary__item {
          display: flex;
          flex-direction: column;
          padding: 24px 28px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-xl);
        }
        .lqr-summary__num {
          font-size: 40px;
          font-weight: 600;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .lqr-summary__label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 10px;
          font-weight: 500;
        }

        /* Search */
        .lqr-search {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          margin-bottom: 28px;
          color: var(--text-secondary);
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
        .lqr-search input::placeholder {
          color: var(--text-muted);
          font-weight: 400;
        }

        /* Board */
        .lqr-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }

        .lqr-col {
          padding: 20px;
          min-height: 320px;
        }
        .lqr-col__head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--glass-stroke);
        }
        .lqr-col__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .lqr-col__dot--warn { background: var(--warn); }
        .lqr-col__dot--info { background: var(--info); }
        .lqr-col__dot--accent { background: var(--accent); }
        .lqr-col__title {
          flex: 1;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .lqr-col__count {
          font-size: 12px;
          color: var(--text-muted);
          padding: 4px 10px;
          border-radius: 8px;
          background: var(--glass-bg);
          font-variant-numeric: tabular-nums;
          font-weight: 500;
        }
        .lqr-col__list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lqr-col__empty {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          padding: 32px 0;
        }

        /* Card */
        .lqr-card {
          padding: 0;
          overflow: hidden;
          transition: transform 240ms var(--ease-out),
                      border-color 240ms var(--ease-out);
        }
        .lqr-card:hover {
          transform: translateY(-3px);
          border-color: var(--glass-stroke-strong);
        }
        .lqr-card__link {
          display: block;
          padding: 18px 20px;
        }
        .lqr-card__row {
          display: flex;
          gap: 14px;
          align-items: center;
          margin-bottom: 14px;
        }
        .lqr-card__main {
          flex: 1;
          min-width: 0;
        }
        .lqr-card__top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 2px;
        }
        .lqr-card__name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lqr-card__time {
          font-size: 12px;
          color: var(--text-muted);
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
        .lqr-card__id {
          font-size: 11px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
        }
        .lqr-card__items {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 14px;
        }
        .lqr-card__item {
          font-size: 12px;
          padding: 4px 10px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 8px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .lqr-card__item--more {
          color: var(--text-muted);
        }
        .lqr-card__bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--glass-stroke);
        }
        .lqr-card__total {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }
        .lqr-card__action {
          font-size: 10px;
          padding: 5px 10px;
          border-radius: 7px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .lqr-card__action--warn {
          background: var(--warn-soft);
          color: var(--warn);
        }
        .lqr-card__action--info {
          background: var(--info-soft);
          color: var(--info);
        }
        .lqr-card__action--accent {
          background: var(--accent-soft);
          color: var(--accent);
        }

        /* Loading */
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .lqr-board {
            grid-template-columns: 1fr;
          }
          .lqr-col {
            min-height: auto;
          }
        }
        @media (max-width: 720px) {
          .lqr-summary {
            grid-template-columns: 1fr;
          }
          .lqr-container {
            padding: 0 18px;
          }
          .lqr-main {
            padding: 24px 0 96px;
          }
          .lqr-summary__num {
            font-size: 32px;
          }
        }
      `}</style>
    </main>
  );
}
