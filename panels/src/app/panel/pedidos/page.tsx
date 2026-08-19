'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { listarPedidos, eliminarPedido } from '@/lib/api';
import { useTenant } from '@/lib/tenant';
import Avatar from '@/components/Avatar';
import type { Pedido, EstadoPedido } from '@/lib/types';

const COLUMNAS: {
  id: EstadoPedido;
  label: string;
  accent: 'warn' | 'info' | 'cyan' | 'accent';
  kpiLabel: string;
}[] = [
  { id: 'necesita_revision',  label: 'Necesita revisión', accent: 'warn',   kpiLabel: 'Por revisar' },
  { id: 'confirmado',         label: 'Confirmado',        accent: 'info',   kpiLabel: 'Por pagar' },
  { id: 'pagado',             label: 'Pagado',            accent: 'cyan',   kpiLabel: 'Por despachar' },
  { id: 'despachado',         label: 'Despachado',        accent: 'accent', kpiLabel: 'Despachados' },
];

function esDeHoy(iso?: string): boolean {
  if (!iso) return true;
  const d = new Date(iso);
  const hoy = new Date();
  return d.getDate() === hoy.getDate() && d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
}

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
  const [timeFilter, setTimeFilter] = useState<'hoy' | 'anteriores' | 'todos'>('hoy');
  const [mobileCol, setMobileCol] = useState<EstadoPedido>('necesita_revision');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

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

  // Contadores para filtros temporales
  const countHoy = useMemo(() => pedidos.filter((p) => esDeHoy(p.created_at)).length, [pedidos]);
  const countAnterioresPendientes = useMemo(
    () => pedidos.filter((p) => !esDeHoy(p.created_at) && p.estado !== 'despachado').length,
    [pedidos]
  );

  const filtrados = useMemo(() => {
    let list = pedidos;

    // Filtro por fecha / pendientes
    if (timeFilter === 'hoy') {
      list = list.filter((p) => esDeHoy(p.created_at));
    } else if (timeFilter === 'anteriores') {
      list = list.filter((p) => !esDeHoy(p.created_at));
    }

    if (!filter.trim()) return list;
    const f = filter.toLowerCase();
    return list.filter(
      (p) =>
        p.cliente_nombre.toLowerCase().includes(f) ||
        p.id.toLowerCase().includes(f) ||
        p.items.some((i) => i.nombre.toLowerCase().includes(f))
    );
  }, [pedidos, filter, timeFilter]);

  const grouped = useMemo(() => {
    const g: Record<EstadoPedido, Pedido[]> = {
      necesita_revision: [],
      confirmado: [],
      pagado: [],
      despachado: [],
    };
    filtrados.forEach((p) => {
      const est = (p.estado as string) === 'confirmado_pagado' ? 'confirmado' : p.estado;
      if (g[est]) {
        g[est].push(p);
      } else {
        g['necesita_revision'].push(p);
      }
    });
    return g;
  }, [filtrados]);

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleEliminar = async (e: React.MouseEvent, p: Pedido) => {
    e.stopPropagation();
    const ok = window.confirm(`¿Estás seguro de eliminar el pedido de "${p.cliente_nombre || 'Cliente'}" por $${p.total.toFixed(2)}?`);
    if (!ok) return;

    setBorrandoId(p.id);
    try {
      const res = await eliminarPedido(tenant, p.id);
      if (res) {
        setPedidos((prev) => prev.filter((item) => item.id !== p.id));
        if (expandedId === p.id) setExpandedId(null);
      } else {
        alert('No se pudo eliminar el pedido.');
      }
    } finally {
      setBorrandoId(null);
    }
  };

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

        {/* ── Time Filter Tabs & Search Bar ── */}
        <div className="lqr-filters-wrapper">
          <div className="lqr-time-tabs" role="tablist">
            <button
              type="button"
              className={`lqr-time-tab ${timeFilter === 'hoy' ? 'lqr-time-tab--active' : ''}`}
              onClick={() => setTimeFilter('hoy')}
            >
              📅 Pedidos de Hoy
              <span className="lqr-time-tab__badge">{countHoy}</span>
            </button>

            <button
              type="button"
              className={`lqr-time-tab ${timeFilter === 'anteriores' ? 'lqr-time-tab--active lqr-time-tab--warn' : ''}`}
              onClick={() => setTimeFilter('anteriores')}
            >
              ⏳ Días Anteriores
              {countAnterioresPendientes > 0 && (
                <span className="lqr-time-tab__badge lqr-time-tab__badge--alert" title="Pedidos pendientes de días anteriores">
                  {countAnterioresPendientes} pendientes
                </span>
              )}
            </button>

            <button
              type="button"
              className={`lqr-time-tab ${timeFilter === 'todos' ? 'lqr-time-tab--active' : ''}`}
              onClick={() => setTimeFilter('todos')}
            >
              🌐 Todos ({pedidos.length})
            </button>
          </div>

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
        </div>

        {/* ── Banner de Alerta para Pedidos Anteriores ── */}
        {timeFilter === 'hoy' && countAnterioresPendientes > 0 && (
          <div className="lqr-pending-alert-banner glass">
            <span>⚠️ Tienes <strong>{countAnterioresPendientes} pedidos pendientes</strong> de días anteriores sin despachar.</span>
            <button
              type="button"
              className="lqr-pending-alert-btn"
              onClick={() => setTimeFilter('anteriores')}
            >
              Ver pendientes anteriores →
            </button>
          </div>
        )}

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
                      <p>Sin pedidos en esta bandeja {timeFilter === 'hoy' ? 'hoy' : ''}</p>
                    </div>
                  ) : (
                    grouped[col.id].map((p, i) => {
                      const isOpen = expandedId === p.id;
                      const esHoy = esDeHoy(p.created_at);
                      const isDeleting = borrandoId === p.id;

                      return (
                        <motion.article
                          key={p.id}
                          className={`lqr-order-card glass-card lqr-order-card--${col.accent} ${isOpen ? 'lqr-order-card--open' : ''} ${isDeleting ? 'lqr-order-card--deleting' : ''}`}
                          initial={{ opacity: 0, transform: 'translateY(8px)' }}
                          animate={{ opacity: isDeleting ? 0.4 : 1, transform: 'translateY(0px)' }}
                          transition={{ duration: 0.28, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        >
                          {/* Collapsed header — always visible, click to expand */}
                          <div
                            className="lqr-order-card__toggle"
                            onClick={() => toggleExpanded(p.id)}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isOpen}
                          >
                            <Avatar nombre={p.cliente_nombre || 'Cliente'} size={36} />
                            <div className="lqr-order-card__meta">
                              <div className="lqr-order-card__name-row">
                                <strong className="lqr-order-card__name">
                                  {p.cliente_nombre?.trim() || 'Cliente WhatsApp'}
                                </strong>
                                {!esHoy && (
                                  <span className="lqr-tag-old" title="Pedido de día anterior">
                                    {formatRelativo(p.created_at)}
                                  </span>
                                )}
                              </div>
                              <span className="lqr-order-card__id">#{p.id.slice(-6)} · {esHoy ? formatRelativo(p.created_at) : 'Día anterior'}</span>
                            </div>

                            <div className="lqr-order-card__right">
                              <span className="lqr-order-card__total">${p.total.toFixed(2)}</span>

                              {/* Botón rápido de eliminar */}
                              <button
                                type="button"
                                className="lqr-btn-delete-card"
                                onClick={(e) => handleEliminar(e, p)}
                                title="Eliminar este pedido permanentemente"
                              >
                                🗑️
                              </button>

                              <span className={`lqr-order-card__chevron ${isOpen ? 'lqr-order-card__chevron--open' : ''}`}>
                                ▾
                              </span>
                            </div>
                          </div>

                          {/* Expanded detail — only rendered when open */}
                          {isOpen && (
                            <motion.div
                              className="lqr-order-card__detail"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <div className="lqr-order-card__info-row">
                                <span>📞 {p.cliente_telefono || 'Sin teléfono'}</span>
                                <span>Creado: {new Date(p.created_at).toLocaleDateString()}</span>
                              </div>

                              {/* Items list */}
                              <div className="lqr-order-card__items-list">
                                {p.items.map((it, idx) => (
                                  <div key={idx} className="lqr-detail-item">
                                    <span className="lqr-detail-item__qty">{it.cantidad}×</span>
                                    <span className="lqr-detail-item__name">{it.nombre}</span>
                                    <span className="lqr-detail-item__price">
                                      ${(it.precio_unitario * it.cantidad).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Ambiguous items */}
                              {p.items_ambiguos && p.items_ambiguos.length > 0 && (
                                <div className="lqr-order-card__ambiguos">
                                  <strong className="lqr-order-card__amb-title">⚠️ No disponibles ({p.items_ambiguos.length})</strong>
                                  {p.items_ambiguos.map((amb: string, idx: number) => (
                                    <span key={idx} className="lqr-amb-tag">{amb}</span>
                                  ))}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="lqr-order-card__actions">
                                <button
                                  type="button"
                                  className="lqr-btn-delete-full"
                                  onClick={(e) => handleEliminar(e, p)}
                                >
                                  🗑️ Eliminar Pedido
                                </button>
                                <Link href={`/panel/pedidos/${p.id}`} className="lqr-order-card__action-btn">
                                  {p.accion_pendiente || 'Ver detalle'} →
                                </Link>
                              </div>
                            </motion.div>
                          )}
                        </motion.article>
                      );
                    })
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
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }
        .lqr-kpi-card {
          padding: 18px 20px;
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
          font-size: 38px;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: var(--text-primary);
        }

        .lqr-kpi-card__label {
          font-size: 11px;
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
        .lqr-kpi-card__indicator--cyan   { background: #06b6d4; }
        .lqr-kpi-card__indicator--accent { background: #30d158; }

        /* ── Filters & Time Tabs ── */
        .lqr-filters-wrapper {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 22px;
        }

        .lqr-time-tabs {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .lqr-time-tabs::-webkit-scrollbar { display: none; }

        .lqr-time-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          box-shadow: var(--glass-specular);
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-time-tab:hover {
          color: var(--text-primary);
          background: var(--glass-bg-hover);
        }
        .lqr-time-tab--active {
          color: #000;
          background: var(--accent);
          border-color: var(--accent);
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.35);
        }
        .lqr-time-tab--active.lqr-time-tab--warn {
          color: #000;
          background: var(--warn);
          border-color: var(--warn);
          box-shadow: 0 4px 16px rgba(234, 179, 8, 0.35);
        }
        .lqr-time-tab__badge {
          font-size: 11px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: var(--radius-full);
          background: rgba(0, 0, 0, 0.2);
          color: inherit;
        }
        .lqr-time-tab__badge--alert {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .lqr-pending-alert-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: var(--radius-md);
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.25);
          color: #facc15;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .lqr-pending-alert-btn {
          font-size: 12px;
          font-weight: 700;
          color: #000;
          background: var(--warn);
          padding: 6px 14px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: transform var(--duration-fast) var(--ease-out);
        }
        .lqr-pending-alert-btn:hover {
          transform: translateY(-1px);
        }

        .lqr-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lqr-tag-old {
          font-size: 10px;
          font-weight: 800;
          color: #facc15;
          background: rgba(234, 179, 8, 0.15);
          border: 1px solid rgba(234, 179, 8, 0.3);
          padding: 1px 6px;
          border-radius: var(--radius-full);
        }

        /* ── Search Island ── */
        .lqr-search-island {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 22px;
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
        .lqr-mob-tab--active.lqr-mob-tab--cyan   { background: rgba(6, 182, 212, 0.1);    color: #06b6d4;   border-color: rgba(6, 182, 212, 0.2); }
        .lqr-mob-tab--active.lqr-mob-tab--accent { background: rgba(48, 209, 88, 0.1); color: #30d158; border-color: rgba(48, 209, 88, 0.2); }

        /* ── Board ── */
        .lqr-board {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          align-items: start;
        }

        .lqr-col {
          padding: 18px 16px;
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

        /* ── Order Card (Accordion / Tab) ── */
        .lqr-order-card {
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-order-card--open {
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
        }
        .lqr-order-card__toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          text-align: left;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background var(--duration-fast) var(--ease-out);
        }
        .lqr-order-card__toggle:hover {
          background: var(--glass-bg-hover);
        }
        .lqr-order-card__meta {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lqr-order-card__name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lqr-order-card__id {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .lqr-order-card__right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lqr-order-card__total {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .lqr-order-card__chevron {
          font-size: 16px;
          color: var(--text-muted);
          transition: transform var(--duration-fast) var(--ease-out);
          display: inline-block;
        }
        .lqr-order-card__chevron--open {
          transform: rotate(180deg);
          color: var(--text-primary);
        }

        /* ── Detail Dropdown ── */
        .lqr-order-card__detail {
          padding: 12px 16px 16px;
          border-top: 1px solid var(--glass-stroke);
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lqr-order-card__info-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .lqr-order-card__items-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 220px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .lqr-detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
        }
        .lqr-detail-item__qty {
          font-weight: 800;
          color: var(--accent);
          flex-shrink: 0;
        }
        .lqr-detail-item__name {
          flex: 1;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lqr-detail-item__price {
          font-weight: 700;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .lqr-order-card__ambiguos {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(234, 179, 8, 0.08);
          border: 1px solid rgba(234, 179, 8, 0.2);
        }
        .lqr-order-card__amb-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--warn);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .lqr-amb-tag {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.8);
        }
        .lqr-order-card__actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 6px;
        }
        .lqr-order-card__action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
          background: var(--glass-bg-hover);
          border: 1px solid var(--glass-stroke-strong);
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-order-card__action-btn:hover {
          background: var(--accent);
          color: #000;
          border-color: var(--accent);
        }
        .lqr-btn-delete-card {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          opacity: 0.45;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-btn-delete-card:hover {
          opacity: 1;
          background: rgba(239, 68, 68, 0.2);
          transform: scale(1.1);
        }
        .lqr-btn-delete-full {
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-btn-delete-full:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #fff;
        }
        .lqr-order-card--deleting {
          pointer-events: none;
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
