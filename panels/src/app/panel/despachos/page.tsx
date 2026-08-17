'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listarComandas } from '@/lib/api';
import { useTenant } from '@/lib/tenant';
import type { Comanda } from '@/lib/types';

function formatRelativo(iso?: string): { text: string; urgente: boolean } {
  if (!iso) return { text: 'ahora', urgente: false };
  const time = new Date(iso).getTime();
  if (isNaN(time)) return { text: 'ahora', urgente: false };
  const diff = Math.max(0, Date.now() - time);
  const min = Math.floor(diff / 60000);
  if (min < 1) return { text: 'ahora', urgente: false };
  if (min < 30) return { text: `hace ${min}m`, urgente: false };
  if (min < 60) return { text: `hace ${min}m`, urgente: true };
  const h = Math.floor(min / 60);
  if (h < 24) return { text: `hace ${h}h`, urgente: true };
  return { text: `hace ${Math.floor(h / 24)}d`, urgente: true };
}

function OperatorAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="lqr-op-avatar" aria-hidden>
      {initials}
      <style jsx>{`
        .lqr-op-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--accent-soft);
          border: 1.5px solid var(--accent-border);
          color: var(--accent);
          font-size: 11px;
          font-weight: 800;
          box-shadow: var(--accent-glow);
          flex-shrink: 0;
        }
      `}</style>
    </span>
  );
}

function ComandaCard({ c, i, onTomar }: { c: Comanda; i: number; onTomar?: () => void }) {
  const [pressed, setPressed] = useState(false);
  const time = c.created_at ? formatRelativo(c.created_at) : null;

  const handleTomar = () => {
    setPressed(true);
    setTimeout(() => { onTomar?.(); }, 180);
  };

  return (
    <motion.article
      className={`lqr-comanda glass-card ${c.tomado_por ? 'lqr-comanda--taken' : ''}`}
      initial={{ opacity: 0, transform: 'translateY(10px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      exit={{ opacity: 0, transform: 'scale(0.96)' }}
      transition={{ duration: 0.28, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ transform: 'translateY(-2px)' }}
      whileTap={{ transform: 'scale(0.98)' }}
      layout
    >
      {/* Cabecera */}
      <div className="lqr-comanda__head">
        <div>
          <strong className="lqr-comanda__name">{c.cliente}</strong>
          <span className="lqr-comanda__id">Comanda #{c.pedido_id.slice(-6)}</span>
        </div>
        {time && (
          <span className={`lqr-time-badge ${time.urgente ? 'lqr-time-badge--urgent' : ''}`}>
            {time.urgente && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
              </svg>
            )}
            {time.text}
          </span>
        )}
      </div>

      {/* Dirección */}
      <div className="lqr-comanda__addr">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{c.direccion}</span>
      </div>

      {/* Checklist Items */}
      <ul className="lqr-comanda__items" aria-label="Lista de útiles a empacar">
        {c.items.map((it, idx) => (
          <li key={idx} className="lqr-comanda__item">
            <span className="lqr-comanda__qty">{it.cantidad}×</span>
            <span>{it.nombre}</span>
          </li>
        ))}
      </ul>

      {/* Botón Tomar / Estado Responsable */}
      {onTomar ? (
        <button
          type="button"
          className={`lqr-take-btn ${pressed ? 'lqr-take-btn--pressed' : ''}`}
          onClick={handleTomar}
          aria-label={`Tomar comanda de despacho de ${c.cliente}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          Tomar Comanda para Despacho
        </button>
      ) : (
        <div className="lqr-taken-status">
          <OperatorAvatar name={c.tomado_por || 'Equipo'} />
          <span>Empacando: <strong>{c.tomado_por}</strong></span>
          <span className="lqr-sec-dot lqr-sec-dot--accent" style={{ marginLeft: 'auto' }} aria-hidden />
        </div>
      )}

      <style jsx>{`
        .lqr-comanda {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          border-radius: var(--radius-xl);
        }
        .lqr-comanda--taken {
          opacity: 0.72;
        }

        .lqr-comanda__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .lqr-comanda__name {
          display: block;
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        .lqr-comanda__id {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .lqr-time-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: var(--glass-bg-hover);
          color: var(--text-muted);
          border: 1px solid var(--glass-stroke);
          box-shadow: var(--glass-specular);
        }
        .lqr-time-badge--urgent {
          color: #ffb020;
          background: rgba(255, 176, 32, 0.08);
          border-color: rgba(255, 176, 32, 0.15);
          animation: lqr-pulse-ring 2.5s ease infinite;
        }

        .lqr-comanda__addr {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          background: var(--glass-bg-deep);
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-stroke);
        }

        .lqr-comanda__items {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 0;
          border-top: 1px solid var(--glass-stroke);
          border-bottom: 1px solid var(--glass-stroke);
        }
        .lqr-comanda__item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-primary);
          font-weight: 500;
        }
        .lqr-comanda__qty {
          font-weight: 800;
          color: var(--text-muted);
          min-width: 28px;
        }

        .lqr-take-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-md);
          box-shadow: var(--glass-specular);
          transition: all var(--duration-fast) var(--ease-spring);
        }
        .lqr-take-btn:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.20);
        }
        .lqr-take-btn:active, .lqr-take-btn--pressed {
          transform: scale(0.97);
        }

        .lqr-taken-status {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
        }
        .lqr-taken-status strong {
          color: var(--text-primary);
          font-weight: 800;
        }
      `}</style>
    </motion.article>
  );
}

import { useRouter } from 'next/navigation';

export default function DespachosPage() {
  const router = useRouter();
  const tenant = useTenant();
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) {
      router.replace('/panel/login');
      return;
    }
    let vivo = true;
    setLoading(true);
    listarComandas(tenant).then((data) => {
      if (vivo) { setComandas(data); setLoading(false); }
    });
    return () => { vivo = false; };
  }, [tenant, router]);

  const tomar = (id: string) => {
    setComandas((prev) =>
      prev.map((c) => (c.pedido_id === id ? { ...c, tomado_por: 'César' } : c))
    );
  };

  const pendientes = comandas.filter((c) => !c.tomado_por);
  const enProceso  = comandas.filter((c) =>  c.tomado_por);

  return (
    <main className="lqr-main">
      <div className="lqr-container">

        {/* ── Page Head Island ── */}
        <div className="lqr-page-head glass">
          <div>
            <div className="lqr-page-head__title-wrap">
              <h1 className="lqr-title">Despachos y Comandas</h1>
              {pendientes.length > 0 && (
                <span className="lqr-badge lqr-badge--warn">
                  {pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="lqr-sub">
              Organización física de pedidos. Toma una comanda para armar el paquete.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="lqr-loading">
            <span className="lqr-spinner" aria-hidden />
            <p>Cargando comandas de entrega…</p>
          </div>
        ) : (
          <>
            {/* Pendientes */}
            <section className="lqr-section" aria-labelledby="sec-pendientes">
              <header className="lqr-sec-head">
                <span className="lqr-sec-dot lqr-sec-dot--warn" aria-hidden />
                <h2 className="lqr-sec-label" id="sec-pendientes">Comandas por Empacar</h2>
                <span className="lqr-sec-count">{pendientes.length}</span>
              </header>
              <div className="lqr-grid">
                <AnimatePresence mode="popLayout">
                  {pendientes.length === 0 ? (
                    <motion.div
                      key="empty-pend"
                      className="lqr-empty-island glass"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <p>✨ No hay comandas pendientes. Todo está al día.</p>
                    </motion.div>
                  ) : (
                    pendientes.map((c, i) => (
                      <ComandaCard
                        key={c.pedido_id}
                        c={c}
                        i={i}
                        onTomar={() => tomar(c.pedido_id)}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* En proceso */}
            {enProceso.length > 0 && (
              <section className="lqr-section" aria-labelledby="sec-proceso">
                <header className="lqr-sec-head">
                  <span className="lqr-sec-dot lqr-sec-dot--accent" aria-hidden />
                  <h2 className="lqr-sec-label" id="sec-proceso">En Proceso de Entrega</h2>
                  <span className="lqr-sec-count">{enProceso.length}</span>
                </header>
                <div className="lqr-grid">
                  <AnimatePresence mode="popLayout">
                    {enProceso.map((c, i) => (
                      <ComandaCard key={c.pedido_id} c={c} i={i} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .lqr-main {
          min-height: calc(100vh - var(--header-h) - 40px);
          padding: 20px 0 110px;
        }
        .lqr-container {
          max-width: 1040px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .lqr-page-head {
          padding: 24px 28px;
          margin-bottom: 24px;
          border-radius: var(--radius-xl);
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

        .lqr-section {
          margin-bottom: 36px;
        }

        .lqr-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .lqr-empty-island {
          grid-column: 1 / -1;
          padding: 40px 24px;
          text-align: center;
          font-size: 14px;
          color: var(--text-muted);
          border-radius: var(--radius-xl);
        }

        @media (max-width: 768px) {
          .lqr-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
