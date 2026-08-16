'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { listarComandas } from '@/lib/api';
import { useTenant } from '@/lib/tenant';
import type { Comanda } from '@/lib/types';

export default function DespachosPage() {
  const tenant = useTenant();
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    listarComandas(tenant).then((data) => {
      if (vivo) {
        setComandas(data);
        setLoading(false);
      }
    });
    return () => { vivo = false; };
  }, [tenant]);

  const tomar = (id: string) => {
    setComandas((prev) =>
      prev.map((c) =>
        c.pedido_id === id ? { ...c, tomado_por: 'Yo' } : c
      )
    );
  };

  const pendientes = comandas.filter((c) => !c.tomado_por);
  const enProceso = comandas.filter((c) => c.tomado_por);

  return (
    <main className="lqr-main">
      <div className="lqr-container">
        <h1 className="lqr-title">Despachos</h1>
        <p className="lqr-sub">Toma una comanda para hacerte responsable del despacho.</p>

        {loading ? (
          <div className="lqr-loading">
            <span className="lqr-spinner" aria-hidden />
            <p>Cargando comandas…</p>
          </div>
        ) : (
          <>
            <section className="lqr-section">
              <header className="lqr-section__head">
                <span className="lqr-dot lqr-dot--warn" aria-hidden />
                <h2 className="lqr-section__title">Pendientes</h2>
                <span className="lqr-section__count">{pendientes.length}</span>
              </header>
              <div className="lqr-grid">
                {pendientes.map((c, i) => (
                  <ComandaCard key={c.pedido_id} c={c} i={i} onTomar={() => tomar(c.pedido_id)} />
                ))}
                {pendientes.length === 0 && (
                  <p className="lqr-empty">No hay comandas pendientes.</p>
                )}
              </div>
            </section>

            <section className="lqr-section">
              <header className="lqr-section__head">
                <span className="lqr-dot lqr-dot--accent" aria-hidden />
                <h2 className="lqr-section__title">En proceso</h2>
                <span className="lqr-section__count">{enProceso.length}</span>
              </header>
              <div className="lqr-grid">
                {enProceso.map((c, i) => (
                  <ComandaCard key={c.pedido_id} c={c} i={i} />
                ))}
                {enProceso.length === 0 && (
                  <p className="lqr-empty">Nadie está despachando aún.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <style jsx>{`
        .lqr-main {
          padding: 40px 0 96px;
          min-height: calc(100vh - 64px);
        }
        .lqr-container {
          max-width: 920px;
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
        .lqr-section { margin-bottom: 36px; }
        .lqr-section__head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .lqr-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .lqr-dot--warn { background: var(--warn); }
        .lqr-dot--accent { background: var(--accent); }
        .lqr-section__title {
          flex: 1;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .lqr-section__count {
          font-size: 12px;
          color: var(--text-muted);
          padding: 4px 10px;
          border-radius: 8px;
          background: var(--glass-bg);
          font-variant-numeric: tabular-nums;
          font-weight: 500;
        }
        .lqr-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .lqr-empty {
          grid-column: 1 / -1;
          padding: 40px 0;
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
        @media (max-width: 600px) {
          .lqr-grid { grid-template-columns: 1fr; }
          .lqr-title { font-size: 26px; }
        }
      `}</style>
    </main>
  );
}

function ComandaCard({ c, i, onTomar }: { c: Comanda; i: number; onTomar?: () => void }) {
  return (
    <motion.article
      className="lqr-comanda glass"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: i * 0.04 }}
    >
      <div className="lqr-comanda__head">
        <strong className="lqr-comanda__name">{c.cliente}</strong>
        <span className="lqr-comanda__id">#{c.pedido_id.slice(-6)}</span>
      </div>
      <div className="lqr-comanda__addr">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{c.direccion}</span>
      </div>
      <ul className="lqr-comanda__items">
        {c.items.map((it, idx) => (
          <li key={idx}>
            <span className="lqr-comanda__qty">{it.cantidad}×</span> {it.nombre}
          </li>
        ))}
      </ul>
      {onTomar ? (
        <button type="button" className="lqr-take" onClick={onTomar}>
          Tomar comanda
        </button>
      ) : (
        <div className="lqr-taken">
          <span className="lqr-taken__dot" aria-hidden />
          Despachado por {c.tomado_por}
        </div>
      )}

      <style jsx>{`
        .lqr-comanda {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lqr-comanda__head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
        }
        .lqr-comanda__name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .lqr-comanda__id {
          font-size: 11px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }
        .lqr-comanda__addr {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .lqr-comanda__items {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 13px;
          color: var(--text-primary);
        }
        .lqr-comanda__items li {
          padding: 4px 0;
        }
        .lqr-comanda__qty {
          font-weight: 600;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }
        .lqr-take {
          width: 100%;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border-radius: 12px;
          transition: transform 180ms var(--ease-out), opacity 180ms var(--ease-out);
        }
        .lqr-take:hover { transform: translateY(-1px); }
        .lqr-take:active { transform: translateY(0); }
        .lqr-taken {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: var(--accent-soft);
          color: var(--accent);
          border-radius: 10px;
          font-size: 12px;
          font-weight: 500;
        }
        .lqr-taken__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
        }
      `}</style>
    </motion.article>
  );
}
