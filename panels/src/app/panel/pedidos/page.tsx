'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { listarPedidos } from '@/lib/api';
import { useTenant } from '@/lib/tenant';
import Avatar from '@/components/Avatar';
import type { Pedido, EstadoPedido } from '@/lib/types';

const COLUMNAS: {
  id: EstadoPedido;
  label: string;
  accent: 'warn' | 'info' | 'accent';
  kpiLabel: string;
}[] = [
  { id: 'necesita_revision',  label: 'Necesita revisión',   accent: 'warn',   kpiLabel: 'Por revisar' },
  { id: 'confirmado_pagado',  label: 'Confirmado / Pagado', accent: 'info',   kpiLabel: 'Por despachar' },
  { id: 'despachado',         label: 'Despachado',          accent: 'accent', kpiLabel: 'Despachados' },
];

function formatRelativo(iso?: string): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (isNaN(time)) return '';
  const diff = Math.max(0, Date.now() - time);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function CardSkeleton() {
  return (
    <div className="lqr-card-sk glass-card">
      <div className="lqr-card-sk__row">
        <div className="lqr-skeleton lqr-card-sk__avatar" />
        <div className="lqr-card-sk__lines">
          <div className="lqr-skeleton" style={{ height: 14, width: '60%', borderRadius: 6 }} />
          <div className="lqr-skeleton" style={{ height: 10, width: '35%', borderRadius: 6, marginTop: 6 }} />
        </div>
      </div>
      <div className="lqr-skeleton" style={{ height: 10, width: '80%', borderRadius: 6, marginTop: 12 }} />
      <div className="lqr-skeleton" style={{ height: 10, width: '55%', borderRadius: 6, marginTop: 8 }} />
    </div>
  );
}

import { useRouter } from 'next/navigation';

export default function PedidosPage() {
  const router = useRouter();
  const tenant = useTenant();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [mobileCol, setMobileCol] = useState<EstadoPedido>('necesita_revision');

  useEffect(() => {
    if (!tenant) {
      router.replace('/panel/login');
      return;
    }
    let vivo = true;
    setLoading(true);
    listarPedidos(tenant).then((data) => {
      if (vivo) { setPedidos(data); setLoading(false); }
    });
    return () => { vivo = false; };
  }, [tenant, router]);

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

  return (
    <main className="lqr-main">
      <div className="lqr-container">

        {/* ── KPI Floating Bar ── */}
        <section className="lqr-kpi-bar" aria-label="Resumen de pedidos">
          {COLUMNAS.map((col, idx) => (
            <motion.div
              key={col.id}
              className={`lqr-kpi-card glass lqr-kpi-card--${col.accent}`}
              initial={{ opacity: 0, transform: 'translateY(12px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="lqr-kpi-card__left">
                <span className={`lqr-kpi-card__num lqr-kpi-card__num--${col.accent}`}>
                  {grouped[col.id].length}
                </span>
                <span className="lqr-kpi-card__label">{col.kpiLabel}</span>
              </div>
              <span className={`lqr-kpi-card__indicator lqr-kpi-card__indicator--${col.accent}`} />
            </motion.div>
          ))}
        </section>

        {/* ── Search & Filter Island ── */}
        <div className="lqr-search-island glass" role="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por cliente, pedido # o material escolar…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Buscar pedidos"
          />
          {filter && (
            <button className="lqr-clear-btn" onClick={() => setFilter('')} aria-label="Limpiar búsqueda">
              ×
            </button>
          )}
        </div>

        {/* ── Mobile column selector ── */}
        <div className="lqr-mob-tabs" role="tablist" aria-label="Selector de estado">
          {COLUMNAS.map((col) => (
            <button
              key={col.id}
              role="tab"
              aria-selected={mobileCol === col.id}
              className={`lqr-mob-tab glass lqr-mob-tab--${col.accent} ${mobileCol === col.id ? 'lqr-mob-tab--active' : ''}`}
              onClick={() => setMobileCol(col.id)}
            >
              <span className={`lqr-sec-dot lqr-sec-dot--${col.accent}`} aria-hidden />
              <span>{col.label}</span>
              <span className="lqr-mob-tab__count">{grouped[col.id].length}</span>
            </button>
          ))}
        </div>

        {/* ── Kanban Columns ── */}
        {loading ? (
          <div className="lqr-board">
            {COLUMNAS.map((col) => (
              <div key={col.id} className={`lqr-col glass lqr-col--${col.accent}`}>
                <div className="lqr-sec-head">
                  <span className={`lqr-sec-dot lqr-sec-dot--${col.accent}`} aria-hidden />
                  <span className="lqr-sec-label">{col.label}</span>
                </div>
                <div className="lqr-col__list">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="lqr-board">
            {COLUMNAS.map((col) => (
              <section
                key={col.id}
                className={`lqr-col glass lqr-col--${col.accent} ${mobileCol === col.id ? 'lqr-col--mob-visible' : 'lqr-col--mob-hidden'}`}
                role="tabpanel"
                aria-label={col.label}
              >
                <header className="lqr-sec-head">
                  <span className={`lqr-sec-dot lqr-sec-dot--${col.accent}`} aria-hidden />
                  <h2 className="lqr-sec-label">{col.label}</h2>
                  <span className="lqr-sec-count">{grouped[col.id].length}</span>
                </header>

                <div className="lqr-col__list">
                  {grouped[col.id].length === 0 ? (
                    <div className="lqr-col__empty">
                      <p>Sin pedidos en esta bandeja</p>
                    </div>
                  ) : (
                    grouped[col.id].map((p, i) => (
                      <motion.article
                        key={p.id}
                        className={`lqr-order-card glass-card lqr-order-card--${col.accent}`}
                        initial={{ opacity: 0, transform: 'translateY(8px)' }}
                        animate={{ opacity: 1, transform: 'translateY(0px)' }}
                        transition={{ duration: 0.28, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ transform: 'translateY(-2px)' }}
                        whileTap={{ transform: 'scale(0.98)' }}
                      >
                        <Link href={`/panel/pedidos/${p.id}`} className="lqr-order-card__link">
                          {/* Top Row: Avatar + Name + Time */}
                          <div className="lqr-order-card__header">
                            <Avatar nombre={p.cliente_nombre || 'Cliente'} size={40} />
                            <div className="lqr-order-card__meta">
                              <div className="lqr-order-card__title-row">
                                <strong className="lqr-order-card__name">
                                  {p.cliente_nombre?.trim() || 'Cliente WhatsApp'}
                                </strong>
                                {formatRelativo(p.created_at) && (
                                  <span className="lqr-order-card__time">
                                    {formatRelativo(p.created_at)}
                                  </span>
                                )}
                              </div>
                              <span className="lqr-order-card__id">Pedido #{p.id.slice(-6)}</span>
                            </div>
                          </div>

                          {/* Items Pills */}
                          <div className="lqr-order-card__items">
                            {p.items.slice(0, 2).map((it, idx) => (
                              <span key={idx} className="lqr-item-tag">
                                <strong className="lqr-item-tag__qty">{it.cantidad}×</strong> {it.nombre}
                              </span>
                            ))}
                            {p.items.length > 2 && (
                              <span className="lqr-item-tag lqr-item-tag--more">
                                +{p.items.length - 2} útiles más
                              </span>
                            )}
                          </div>

                          {/* Bottom Row: Total + Action */}
                          <div className="lqr-order-card__footer">
                            <span className="lqr-order-card__total">${p.total.toFixed(2)}</span>
                            {p.accion_pendiente ? (
                              <span className="lqr-order-card__action">
                                {p.accion_pendiente} →
                              </span>
                            ) : (
                              <span className="lqr-order-card__action lqr-order-card__action--muted">
                                Ver detalle →
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
          min-height: calc(100vh - var(--header-h) - 40px);
          padding: 20px 0 110px;
        }
        .lqr-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* ── KPI Floating Bar ── */
        .lqr-kpi-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }
        .lqr-kpi-card {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: var(--radius-xl);
          position: relative;
          overflow: hidden;
        }

        .lqr-kpi-card__left {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lqr-kpi-card__num {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: var(--text-primary);
        }

        .lqr-kpi-card__label {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .lqr-kpi-card__indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .lqr-kpi-card__indicator--warn   { background: #ffb020; }
        .lqr-kpi-card__indicator--info   { background: #0a84ff; }
        .lqr-kpi-card__indicator--accent { background: #30d158; }

        /* ── Search Island ── */
        .lqr-search-island {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 22px;
          margin-bottom: 24px;
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
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Mobile tabs ── */
        .lqr-mob-tabs {
          display: none;
          gap: 8px;
          margin-bottom: 18px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .lqr-mob-tabs::-webkit-scrollbar { display: none; }

        .lqr-mob-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          white-space: nowrap;
          flex-shrink: 0;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-mob-tab__count {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }
        .lqr-mob-tab--active.lqr-mob-tab--warn   { background: rgba(255, 176, 32, 0.1);   color: #ffb020;   border-color: rgba(255, 176, 32, 0.2); }
        .lqr-mob-tab--active.lqr-mob-tab--info   { background: rgba(10, 132, 255, 0.1);   color: #0a84ff;   border-color: rgba(10, 132, 255, 0.2); }
        .lqr-mob-tab--active.lqr-mob-tab--accent { background: rgba(48, 209, 88, 0.1); color: #30d158; border-color: rgba(48, 209, 88, 0.2); }

        /* ── Board ── */
        .lqr-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }

        .lqr-col {
          padding: 22px;
          border-radius: var(--radius-xl);
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
          padding: 44px 0;
        }

        /* ── Order Card ── */
        .lqr-order-card {
          border-radius: var(--radius-lg);
        }
        .lqr-order-card__link {
          display: block;
          padding: 18px 20px;
        }
        .lqr-order-card__header {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 14px;
        }
        .lqr-order-card__meta {
          flex: 1;
          min-width: 0;
        }
        .lqr-order-card__title-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
        }
        .lqr-order-card__name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lqr-order-card__time {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .lqr-order-card__id {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }

        /* Items tags */
        .lqr-order-card__items {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 14px;
        }
        .lqr-item-tag {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          box-shadow: var(--glass-specular);
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }
        .lqr-item-tag__qty {
          color: var(--text-primary);
          font-weight: 700;
        }
        .lqr-item-tag--more {
          color: var(--text-muted);
        }

        /* Footer */
        .lqr-order-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--glass-stroke);
        }
        .lqr-order-card__total {
          font-size: 19px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .lqr-order-card__action {
          font-size: 11px;
          font-weight: 700;
          color: var(--warn);
          background: rgba(255, 176, 32, 0.12);
          border: 1px solid rgba(255, 176, 32, 0.25);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          letter-spacing: 0.01em;
          transition: background var(--duration-fast) var(--ease-out);
        }
        .lqr-order-card__action--muted {
          color: var(--text-muted);
          background: var(--glass-bg);
          border-color: var(--glass-stroke);
        }

        /* Skeleton */
        .lqr-card-sk {
          padding: 18px 20px;
        }
        .lqr-card-sk__row {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .lqr-card-sk__avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
        }
        .lqr-card-sk__lines {
          flex: 1;
        }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          .lqr-board {
            grid-template-columns: 1fr;
          }
          .lqr-kpi-bar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .lqr-mob-tabs {
            display: flex;
          }
          .lqr-col--mob-hidden {
            display: none;
          }
          .lqr-col--mob-visible {
            display: block;
          }
        }
      `}</style>
    </main>
  );
}
