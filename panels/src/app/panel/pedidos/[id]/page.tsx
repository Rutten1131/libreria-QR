'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { listarPedidos } from '@/lib/api';
import { useTenant } from '@/lib/tenant';
import Avatar from '@/components/Avatar';
import type { Pedido } from '@/lib/types';

export default function DetallePedidoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tenant = useTenant();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    listarPedidos(tenant).then((data) => {
      if (vivo) {
        setPedido(data.find((p) => p.id === params.id) ?? null);
        setLoading(false);
      }
    });
    return () => { vivo = false; };
  }, [tenant, params.id]);

  if (loading) {
    return (
      <main className="lqr-main">
        <div className="lqr-loading">
          <span className="lqr-spinner" aria-hidden />
          <p>Cargando pedido…</p>
        </div>
      </main>
    );
  }

  if (!pedido) {
    return (
      <main className="lqr-main">
        <div className="lqr-container">
          <Link href="/panel/pedidos" className="lqr-back">← Volver</Link>
          <p className="lqr-empty">Pedido no encontrado.</p>
        </div>
      </main>
    );
  }

  const accionPrimaria =
    pedido.estado === 'necesita_revision'
      ? pedido.accion_pendiente ?? 'Revisar'
      : pedido.estado === 'confirmado_pagado'
        ? 'Confirmar stock físico'
        : 'Marcar como entregado';

  return (
    <main className="lqr-main">
      <div className="lqr-container">
        <Link href="/panel/pedidos" className="lqr-back">← Volver</Link>

        <motion.section
          className="lqr-detail glass"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
        >
          <header className="lqr-detail__head">
            <div className="lqr-detail__who">
              <Avatar nombre={pedido.cliente_nombre} size={56} online />
              <div>
                <h1 className="lqr-detail__name">{pedido.cliente_nombre}</h1>
                <p className="lqr-detail__id">Pedido #{pedido.id.slice(-6)}</p>
              </div>
            </div>
            <span className={`lqr-pill lqr-pill--${pillFor(pedido.estado)}`}>
              {labelFor(pedido.estado)}
            </span>
          </header>

          <div className="lqr-detail__contact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>{pedido.cliente_telefono}</span>
          </div>

          <ul className="lqr-items">
            {pedido.items.map((it, idx) => (
              <li key={idx} className="lqr-items__row">
                <span className="lqr-items__qty">{it.cantidad}×</span>
                <span className="lqr-items__name">{it.nombre}</span>
                <span className="lqr-items__price">${it.subtotal.toFixed(2)}</span>
              </li>
            ))}
          </ul>

          <div className="lqr-total">
            <span>Total</span>
            <strong>${pedido.total.toFixed(2)}</strong>
          </div>

          {pedido.advertencia && (
            <div className="lqr-warning">
              {pedido.advertencia}
            </div>
          )}

          <button
            type="button"
            className="lqr-cta"
            onClick={() => router.push('/panel/pedidos')}
          >
            {accionPrimaria}
          </button>
        </motion.section>
      </div>

      <style jsx>{`
        .lqr-main {
          padding: 40px 0 96px;
          min-height: calc(100vh - 64px);
        }
        .lqr-container {
          max-width: 560px;
          margin: 0 auto;
          padding: 0 28px;
        }
        .lqr-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 24px;
          padding: 10px 14px;
          border-radius: 10px;
          transition: background 180ms var(--ease-out), color 180ms var(--ease-out);
        }
        .lqr-back:hover {
          background: var(--glass-bg);
          color: var(--text-primary);
        }
        .lqr-detail {
          padding: 32px;
        }
        .lqr-detail__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 24px;
        }
        .lqr-detail__who {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .lqr-detail__name {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          line-height: 1.1;
        }
        .lqr-detail__id {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
        }
        .lqr-pill {
          font-size: 11px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .lqr-pill--warn {
          background: var(--warn-soft);
          color: var(--warn);
        }
        .lqr-pill--info {
          background: var(--info-soft);
          color: var(--info);
        }
        .lqr-pill--accent {
          background: var(--accent-soft);
          color: var(--accent);
        }
        .lqr-detail__contact {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--text-secondary);
          padding: 14px 16px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 14px;
          margin-bottom: 28px;
          font-weight: 500;
        }
        .lqr-items {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
        }
        .lqr-items__row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid var(--glass-stroke);
        }
        .lqr-items__row:last-child {
          border-bottom: none;
        }
        .lqr-items__qty {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
          min-width: 28px;
        }
        .lqr-items__name {
          flex: 1;
          font-size: 15px;
          color: var(--text-primary);
          font-weight: 500;
        }
        .lqr-items__price {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }
        .lqr-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 20px 0;
          margin-bottom: 24px;
          border-top: 1px solid var(--glass-stroke);
          border-bottom: 1px solid var(--glass-stroke);
        }
        .lqr-total span {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
        }
        .lqr-total strong {
          font-size: 32px;
          font-weight: 600;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.03em;
        }
        .lqr-warning {
          padding: 14px 16px;
          background: var(--warn-soft);
          color: var(--warn);
          border-radius: 14px;
          font-size: 13px;
          margin-bottom: 24px;
          font-weight: 500;
        }
        .lqr-cta {
          width: 100%;
          padding: 18px 24px;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border-radius: 16px;
          letter-spacing: -0.01em;
          transition: transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out), opacity 180ms var(--ease-out);
          box-shadow: var(--shadow-glow);
        }
        .lqr-cta:hover {
          transform: translateY(-1px);
        }
        .lqr-cta:active {
          transform: translateY(0);
        }
        .lqr-empty {
          text-align: center;
          padding: 40px 0;
          color: var(--text-muted);
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
          .lqr-detail { padding: 24px; }
          .lqr-container { padding: 0 18px; }
        }
        @media (max-width: 480px) {
          .lqr-detail { padding: 20px; }
          .lqr-detail__name { font-size: 22px; }
          .lqr-total strong { font-size: 26px; }
        }
      `}</style>
    </main>
  );
}

function labelFor(estado: Pedido['estado']): string {
  if (estado === 'necesita_revision') return 'Por revisar';
  if (estado === 'confirmado_pagado') return 'Confirmado';
  return 'Despachado';
}

function pillFor(estado: Pedido['estado']): 'warn' | 'info' | 'accent' {
  if (estado === 'necesita_revision') return 'warn';
  if (estado === 'confirmado_pagado') return 'info';
  return 'accent';
}
