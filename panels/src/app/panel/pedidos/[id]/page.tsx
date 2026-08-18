'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { listarPedidos, actualizarEstadoPedido } from '@/lib/api';
import { useTenant } from '@/lib/tenant';
import Avatar from '@/components/Avatar';
import type { Pedido, EstadoPedido } from '@/lib/types';

export default function DetallePedidoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tenant = useTenant();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);

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

  const handleCambiarEstado = async (nuevoEstado: EstadoPedido) => {
    if (!pedido || actualizando) return;
    setActualizando(true);
    try {
      const ok = await actualizarEstadoPedido(tenant, pedido.id, nuevoEstado);
      if (ok) {
        setPedido((prev) => (prev ? { ...prev, estado: nuevoEstado } : null));
        setNotif(
          nuevoEstado === 'confirmado_pagado'
            ? '✓ Pedido movido a Confirmado / Pagado (Listo para Despacho)'
            : nuevoEstado === 'despachado'
              ? '✓ Pedido marcado como Despachado / Entregado'
              : '✓ Estado actualizado'
        );
        setTimeout(() => setNotif(null), 4000);
      } else {
        alert('No se pudo actualizar el estado del pedido.');
      }
    } finally {
      setActualizando(false);
    }
  };

  const handleAbrirWhatsApp = () => {
    if (!pedido?.cliente_telefono) return;
    const phoneClean = pedido.cliente_telefono.replace(/\D/g, '');
    const numWa = phoneClean.startsWith('593') ? phoneClean : `593${phoneClean.replace(/^0/, '')}`;

    const lineasItems = pedido.items
      .slice(0, 5)
      .map((it) => `• ${it.cantidad}x ${it.nombre} ($${it.subtotal.toFixed(2)})`)
      .join('\n');
    const extraCount = pedido.items.length > 5 ? `\n... y ${pedido.items.length - 5} útiles más` : '';

    const mensaje = `Hola ${pedido.cliente_nombre || ''}, te saludamos de la papelería 👋
Hemos revisado tu pedido de útiles #${pedido.id.slice(-6)}:

${lineasItems}${extraCount}

💵 *Total a pagar:* $${pedido.total.toFixed(2)}
${pedido.items_ambiguos && pedido.items_ambiguos.length > 0 ? `\n⚠️ *Artículos por confirmar (${pedido.items_ambiguos.length}):* ${pedido.items_ambiguos.slice(0, 3).join(', ')}` : ''}

¿Deseas retirar en nuestro local o coordinamos entrega a domicilio?`;

    window.open(`https://wa.me/${numWa}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

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

  return (
    <main className="lqr-main">
      <div className="lqr-container">
        <div className="lqr-top-actions">
          <Link href="/panel/pedidos" className="lqr-back-btn glass">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
            Volver al Tablero de Pedidos
          </Link>
        </div>

        {notif && (
          <motion.div
            className="lqr-toast-notif"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {notif}
          </motion.div>
        )}

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
            <div className="lqr-contact-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <div className="lqr-contact-box__info">
                <span className="lqr-contact-box__label">WhatsApp del Cliente</span>
                <strong className="lqr-contact-box__val">{pedido.cliente_telefono || 'No registrado'}</strong>
              </div>
            </div>

            {pedido.cliente_telefono && (
              <button
                type="button"
                className="lqr-wa-direct-btn"
                onClick={handleAbrirWhatsApp}
                title="Abrir chat de WhatsApp con el resumen de la cotización"
              >
                💬 Escribir al Cliente
              </button>
            )}
          </div>

          {/* Items breakdown in Grid Tiles */}
          <div className="lqr-items-wrap">
            <div className="lqr-items-header">
              <h2 className="lqr-items-title">
                Útiles en Catálogo ({pedido.items.length})
              </h2>
              <span className="lqr-items-count-badge">✓ Listos para armar</span>
            </div>

            <div className="lqr-items-grid" aria-label="Desglose de lista escolar">
              {pedido.items.map((it, idx) => (
                <div key={idx} className="lqr-item-tile glass-card">
                  <div className="lqr-item-tile__top">
                    <span className="lqr-item-tile__qty">{it.cantidad}×</span>
                    <span className="lqr-item-tile__subtotal">${it.subtotal.toFixed(2)}</span>
                  </div>
                  <strong className="lqr-item-tile__name" title={it.nombre}>
                    {it.nombre}
                  </strong>
                  <span className="lqr-item-tile__unit">${it.precio_unitario.toFixed(2)} c/u</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ambiguous / Missing items */}
          {pedido.items_ambiguos && pedido.items_ambiguos.length > 0 && (
            <div className="lqr-items-wrap">
              <div className="lqr-items-header">
                <h2 className="lqr-items-title lqr-items-title--warn">
                  Artículos de la lista no disponibles ({pedido.items_ambiguos.length})
                </h2>
                <span className="lqr-items-count-badge lqr-items-count-badge--warn">
                  ⚠️ Consultar sustitutos
                </span>
              </div>

              <div className="lqr-items-grid">
                {pedido.items_ambiguos.map((amb: string, idx: number) => (
                  <div key={idx} className="lqr-item-tile lqr-item-tile--missing glass-card">
                    <div className="lqr-item-tile__top">
                      <span className="lqr-item-tile__qty-out">⚠️ Agotado</span>
                      <span className="lqr-item-tile__tag-out">No en tienda</span>
                    </div>
                    <strong className="lqr-item-tile__name" title={amb}>
                      {amb}
                    </strong>
                    <span className="lqr-item-tile__unit">Consultar al cliente</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grand Total */}
          <div className="lqr-total-box glass-card">
            <div>
              <span className="lqr-total-box__label">Total Liquidado</span>
              <p className="lqr-total-box__sub">{pedido.items.length} artículos disponibles listos</p>
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

          {/* ── WORKFLOW ACTION BUTTONS ── */}
          <div className="lqr-workflow-actions">
            {pedido.estado === 'necesita_revision' && (
              <>
                <button
                  type="button"
                  className="lqr-btn-primary lqr-btn-primary--confirm"
                  disabled={actualizando}
                  onClick={() => handleCambiarEstado('confirmado_pagado')}
                >
                  {actualizando ? 'Actualizando...' : '📦 Confirmar y Pasar a Despacho (Confirmado / Pagado) →'}
                </button>

                <div className="lqr-secondary-actions">
                  <button
                    type="button"
                    className="lqr-btn-secondary"
                    disabled={actualizando}
                    onClick={() => handleCambiarEstado('despachado')}
                  >
                    🚀 Marcar Despachado Directamente
                  </button>
                  <button
                    type="button"
                    className="lqr-btn-whatsapp"
                    onClick={handleAbrirWhatsApp}
                  >
                    💬 Enviar Cotización por WhatsApp
                  </button>
                </div>
              </>
            )}

            {pedido.estado === 'confirmado_pagado' && (
              <>
                <button
                  type="button"
                  className="lqr-btn-primary lqr-btn-primary--dispatch"
                  disabled={actualizando}
                  onClick={() => handleCambiarEstado('despachado')}
                >
                  {actualizando ? 'Actualizando...' : '✓ Marcar como Despachado / Entregado al Cliente'}
                </button>

                <div className="lqr-secondary-actions">
                  <button
                    type="button"
                    className="lqr-btn-whatsapp"
                    onClick={handleAbrirWhatsApp}
                  >
                    💬 Avisar al Cliente por WhatsApp
                  </button>
                  <button
                    type="button"
                    className="lqr-btn-secondary"
                    disabled={actualizando}
                    onClick={() => handleCambiarEstado('necesita_revision')}
                  >
                    ↩ Regresar a Revisión
                  </button>
                </div>
              </>
            )}

            {pedido.estado === 'despachado' && (
              <div className="lqr-completed-box">
                <div className="lqr-completed-check">✓</div>
                <div>
                  <strong>Este pedido ya fue Despachado y Entregado</strong>
                  <p>Todos los útiles fueron armados y entregados al cliente.</p>
                </div>
                <button
                  type="button"
                  className="lqr-btn-secondary"
                  disabled={actualizando}
                  onClick={() => handleCambiarEstado('confirmado_pagado')}
                >
                  ↩ Reabrir Pedido
                </button>
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <style jsx>{`
        .lqr-main {
          min-height: calc(100vh - var(--header-h) - 40px);
          padding: 20px 0 110px;
        }
        .lqr-container {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .lqr-top-actions {
          margin-bottom: 20px;
        }
        .lqr-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          padding: 10px 18px;
          border-radius: var(--radius-full);
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-back-btn:hover {
          color: var(--text-primary);
          background: var(--glass-bg-hover);
        }

        .lqr-toast-notif {
          padding: 12px 20px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 16px;
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
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          border-radius: var(--radius-lg);
          margin-bottom: 28px;
          color: var(--accent);
          flex-wrap: wrap;
        }
        .lqr-contact-left {
          display: flex;
          align-items: center;
          gap: 14px;
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
        .lqr-wa-direct-btn {
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-wa-direct-btn:hover {
          background: #22c55e;
          color: #000;
        }

        .lqr-items-wrap {
          margin-bottom: 28px;
        }
        .lqr-items-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .lqr-items-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-primary);
        }
        .lqr-items-title--warn {
          color: var(--warn);
        }
        .lqr-items-count-badge {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }
        .lqr-items-count-badge--warn {
          color: var(--warn);
          background: rgba(234, 179, 8, 0.1);
          border-color: rgba(234, 179, 8, 0.25);
        }

        /* ── Multi-Column Grid ── */
        .lqr-items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }

        .lqr-item-tile {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 14px 16px;
          border-radius: var(--radius-md);
          background: var(--glass-bg-deep);
          border: 1px solid var(--glass-stroke);
          min-height: 96px;
          gap: 8px;
          transition: transform var(--duration-fast) var(--ease-out);
        }
        .lqr-item-tile:hover {
          transform: translateY(-2px);
          border-color: var(--glass-stroke-strong);
        }

        .lqr-item-tile--missing {
          background: rgba(234, 179, 8, 0.05);
          border-color: rgba(234, 179, 8, 0.2);
        }

        .lqr-item-tile__top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .lqr-item-tile__qty {
          font-size: 12px;
          font-weight: 800;
          color: #000;
          background: var(--accent);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .lqr-item-tile__qty-out {
          font-size: 11px;
          font-weight: 700;
          color: var(--warn);
        }
        .lqr-item-tile__tag-out {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .lqr-item-tile__subtotal {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .lqr-item-tile__name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .lqr-item-tile__unit {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
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

        /* ── Action Buttons ── */
        .lqr-workflow-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 8px;
        }
        .lqr-btn-primary {
          width: 100%;
          padding: 16px 24px;
          font-size: 15px;
          font-weight: 800;
          border-radius: var(--radius-md);
          cursor: pointer;
          border: none;
          transition: all var(--duration-fast) var(--ease-spring);
        }
        .lqr-btn-primary--confirm {
          background: #22c55e;
          color: #000;
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.35);
        }
        .lqr-btn-primary--confirm:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #16a34a;
          box-shadow: 0 12px 28px rgba(34, 197, 94, 0.45);
        }
        .lqr-btn-primary--dispatch {
          background: #0a84ff;
          color: #fff;
          box-shadow: 0 8px 24px rgba(10, 132, 255, 0.35);
        }
        .lqr-btn-primary--dispatch:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #0070e0;
        }

        .lqr-secondary-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .lqr-btn-secondary {
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-btn-secondary:hover:not(:disabled) {
          background: var(--glass-bg-hover);
          border-color: var(--glass-stroke-strong);
        }
        .lqr-btn-whatsapp {
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #4ade80;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-btn-whatsapp:hover {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.5);
        }

        .lqr-completed-box {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 22px;
          border-radius: var(--radius-md);
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          color: #4ade80;
        }
        .lqr-completed-check {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #22c55e;
          color: #000;
          font-weight: 900;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lqr-completed-box p {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .lqr-empty {
          text-align: center;
          padding: 48px;
          color: var(--text-muted);
          border-radius: var(--radius-xl);
        }

        @media (max-width: 640px) {
          .lqr-items-grid {
            grid-template-columns: 1fr;
          }
          .lqr-secondary-actions {
            grid-template-columns: 1fr;
          }
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
