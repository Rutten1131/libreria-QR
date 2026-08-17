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
          <p>Cargando ficha del pedido…</p>
        </div>
      </main>
    );
  }

  if (!pedido) {
    return (
      <main className="lqr-main">
        <div className="lqr-container">
          <Link href="/panel/pedidos" className="lqr-back-btn glass">
            ← Volver a Pedidos
          </Link>
          <div className="lqr-empty glass">
            <p>Pedido no encontrado o eliminado.</p>
          </div>
        </div>
      </main>
    );
  }

  const accionPrimaria =
    pedido.estado === 'necesita_revision'
      ? pedido.accion_pendiente ?? 'Confirmar y Proceder'
      : pedido.estado === 'confirmado_pagado'
        ? 'Confirmar Stock y Empacar'
        : 'Pedido Despachado';

  return (
    <main className="lqr-main">
      <div className="lqr-container">
        <Link href="/panel/pedidos" className="lqr-back-btn glass">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a Pedidos
        </Link>

        <motion.section
          className="lqr-detail-card glass"
          initial={{ opacity: 0, transform: 'translateY(12px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <header className="lqr-detail-card__head">
            <div className="lqr-detail-card__who">
              <Avatar nombre={pedido.cliente_nombre} size={58} online />
              <div>
                <h1 className="lqr-detail-card__name">{pedido.cliente_nombre}</h1>
                <p className="lqr-detail-card__id">Orden escolar #{pedido.id.slice(-6)}</p>
              </div>
            </div>
            <span className={`lqr-badge lqr-badge--${pillFor(pedido.estado)}`}>
              {labelFor(pedido.estado)}
            </span>
          </header>

          {/* Contact Box */}
          <div className="lqr-contact-box glass-card">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <div className="lqr-contact-box__info">
              <span className="lqr-contact-box__label">WhatsApp del Cliente</span>
              <strong className="lqr-contact-box__val">{pedido.cliente_telefono}</strong>
            </div>
          </div>

          {/* Items breakdown */}
          <div className="lqr-items-wrap">
            <h2 className="lqr-items-title">Lista de Materiales y Libros</h2>
            <ul className="lqr-items-list" aria-label="Desglose de lista escolar">
              {pedido.items.map((it, idx) => (
                <li key={idx} className="lqr-item-entry">
                  <span className="lqr-item-entry__qty">{it.cantidad}×</span>
                  <div className="lqr-item-entry__info">
                    <strong className="lqr-item-entry__name">{it.nombre}</strong>
                    <span className="lqr-item-entry__unit">${it.precio_unitario.toFixed(2)} c/u</span>
                  </div>
                  <span className="lqr-item-entry__subtotal">${it.subtotal.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Grand Total */}
          <div className="lqr-total-box glass-card">
            <div>
              <span className="lqr-total-box__label">Total Liquidado</span>
              <p className="lqr-total-box__sub">Precios exactos de catálogo</p>
            </div>
            <strong className="lqr-total-box__amount">${pedido.total.toFixed(2)}</strong>
          </div>

          {/* Warnings */}
          {pedido.advertencia && (
            <div className="lqr-warning-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{pedido.advertencia}</span>
            </div>
          )}

          {/* Main Action CTA */}
          <button
            type="button"
            className="lqr-cta-btn"
            onClick={() => router.push('/panel/pedidos')}
          >
            {accionPrimaria}
          </button>
        </motion.section>
      </div>

      <style jsx>{`
        .lqr-main {
          min-height: calc(100vh - var(--header-h) - 40px);
          padding: 20px 0 110px;
        }
        .lqr-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .lqr-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 20px;
          padding: 10px 18px;
          border-radius: var(--radius-full);
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-back-btn:hover {
          color: var(--text-primary);
          background: var(--glass-bg-hover);
        }

        .lqr-detail-card {
          padding: 32px;
          border-radius: var(--radius-xl);
        }

        .lqr-detail-card__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }
        .lqr-detail-card__who {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .lqr-detail-card__name {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          line-height: 1.1;
        }
        .lqr-detail-card__id {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .lqr-contact-box {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          border-radius: var(--radius-lg);
          margin-bottom: 28px;
          color: var(--accent);
        }
        .lqr-contact-box__info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .lqr-contact-box__label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .lqr-contact-box__val {
          font-size: 15px;
          color: var(--text-primary);
          letter-spacing: 0.02em;
        }

        .lqr-items-wrap {
          margin-bottom: 28px;
        }
        .lqr-items-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .lqr-items-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lqr-item-entry {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          background: var(--glass-bg-deep);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-md);
        }
        .lqr-item-entry__qty {
          font-size: 14px;
          font-weight: 800;
          color: var(--accent);
          min-width: 24px;
        }
        .lqr-item-entry__info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .lqr-item-entry__name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .lqr-item-entry__unit {
          font-size: 11px;
          color: var(--text-muted);
        }
        .lqr-item-entry__subtotal {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .lqr-total-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          margin-bottom: 24px;
          border-radius: var(--radius-lg);
        }
        .lqr-total-box__label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
        }
        .lqr-total-box__sub {
          font-size: 12px;
          color: var(--text-muted);
        }
        .lqr-total-box__amount {
          font-size: 32px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.03em;
        }

        .lqr-warning-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(255, 176, 32, 0.08);
          color: #ffb020;
          border: 1px solid rgba(255, 176, 32, 0.15);
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .lqr-cta-btn {
          width: 100%;
          padding: 16px 24px;
          font-size: 15px;
          font-weight: 800;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-md);
          box-shadow: var(--glass-specular);
          transition: all var(--duration-fast) var(--ease-spring);
        }
        .lqr-cta-btn:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.20);
        }
        .lqr-cta-btn:active {
          transform: scale(0.98);
        }

        .lqr-empty {
          text-align: center;
          padding: 48px;
          color: var(--text-muted);
          border-radius: var(--radius-xl);
        }

        @media (max-width: 480px) {
          .lqr-detail-card { padding: 20px; }
          .lqr-detail-card__name { font-size: 20px; }
          .lqr-total-box__amount { font-size: 26px; }
        }
      `}</style>
    </main>
  );
}

function labelFor(estado: Pedido['estado']): string {
  if (estado === 'necesita_revision') return 'Por revisar';
  if (estado === 'confirmado_pagado') return 'Confirmado / Pagado';
  return 'Despachado';
}

function pillFor(estado: Pedido['estado']): 'warn' | 'info' | 'accent' {
  if (estado === 'necesita_revision') return 'warn';
  if (estado === 'confirmado_pagado') return 'info';
  return 'accent';
}
