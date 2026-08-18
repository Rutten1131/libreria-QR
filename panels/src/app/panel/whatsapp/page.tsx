'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredTenant, useTenantContext } from '@/lib/tenant';

interface WhatsappStatus {
  estado: 'conectado' | 'esperando_qr' | 'desconectado' | 'desconocido';
  numero?: string;
  qr?: string | null;
  instanceName?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function TenantWhatsappPage() {
  const router = useRouter();
  const { tenantId, tenantNombre } = useTenantContext();
  const [status, setStatus] = useState<WhatsappStatus>({ estado: 'desconectado' });
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generandoQR, setGenerandoQR] = useState(false);
  const [tabActiva, setTabActiva] = useState<'vinculacion' | 'mostrador'>('vinculacion');
  const [modoPoster, setModoPoster] = useState<'doble' | 'whatsapp' | 'web'>('doble');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiadoWa, setCopiadoWa] = useState(false);
  const [copiadoWeb, setCopiadoWeb] = useState(false);

  const posterRef = useRef<HTMLDivElement>(null);
  const activeTenant = tenantId || getStoredTenant()?.id || '';
  const rawNombre = tenantNombre || (getStoredTenant() as any)?.nombre || '';
  const [nombreNegocio, setNombreNegocio] = useState(
    rawNombre && !/^\d+$/.test(rawNombre) ? rawNombre : 'Librería Prueba'
  );

  useEffect(() => {
    setMounted(true);
    if (activeTenant) {
      fetch(`${API_URL}/api/public/tenants/${activeTenant}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.tenant?.nombre) setNombreNegocio(d.tenant.nombre);
        })
        .catch(() => {});
    }
  }, [activeTenant]);

  const nombreLibreria = nombreNegocio;

  const consultarEstado = useCallback(async () => {
    if (!activeTenant) return;
    try {
      const res = await fetch(`${API_URL}/api/tenants/${activeTenant}/whatsapp/status`);
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          const wa = data.whatsapp || data;
          const newEstado = wa.evolution_state || data.estado || 'desconectado';
          const newNumero = (wa.numero_whatsapp || data.numero || '')
            .replace(/[^0-9]/g, '');

          setStatus((prev) => ({
            estado: newEstado,
            numero: newNumero || prev.numero,
            qr: newEstado === 'conectado' ? null : (wa.evolution_qr || data.qr || prev.qr),
            instanceName: wa.evolution_instance_name || data.instanceName || prev.instanceName,
          }));
        } catch {}
      }
    } catch {
      // Ignorar si está offline
    } finally {
      setLoading(false);
    }
  }, [activeTenant]);

  useEffect(() => {
    const stored = getStoredTenant();
    if (!stored?.id && !tenantId) {
      router.replace('/panel/login');
      return;
    }
    consultarEstado();
    const interval = setInterval(consultarEstado, 4000);
    return () => clearInterval(interval);
  }, [tenantId, router, consultarEstado]);

  const handleGenerarQR = async () => {
    setGenerandoQR(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/api/tenants/${activeTenant}/whatsapp/conectar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('El backend devolvió una respuesta no válida.');
      }

      if (!res.ok) throw new Error(data.error || 'Error al conectar con Evolution API');

      const qrCode = data.qr?.base64 || data.qr || data.whatsapp?.evolution_qr;
      if (qrCode) {
        setStatus((prev) => ({
          ...prev,
          estado: 'esperando_qr',
          qr: qrCode,
        }));
        setSuccess('Código QR activo. Escanéalo desde tu WhatsApp antes de que expire.');
      } else {
        await consultarEstado();
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo generar el código QR.');
    } finally {
      setGenerandoQR(false);
    }
  };

  const handleDesconectar = async () => {
    if (!confirm('¿Seguro que deseas desconectar tu WhatsApp?')) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/tenants/${activeTenant}/whatsapp`, {
        method: 'DELETE',
      });
      setStatus({ estado: 'desconectado', qr: null });
      setSuccess('WhatsApp desconectado correctamente.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. Enlaces y QR de WhatsApp (Canal 1 - Número Real Vinculado)
  const rawNumero = status.numero ? status.numero.replace(/[^0-9]/g, '') : '';
  const mensajeDefault = encodeURIComponent(`¡Hola ${nombreLibreria}! Quiero cotizar mi lista de útiles escolares 📚✏️`);
  const enlaceWhatsApp = rawNumero
    ? `https://wa.me/${rawNumero}?text=${mensajeDefault}`
    : `https://wa.me/?text=${mensajeDefault}`;
  const qrWhatsAppUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(enlaceWhatsApp)}&margin=10`;

  // 2. Enlaces y QR de la Web (Canal 2 - Portal Web de Cotizaciones)
  const originWeb = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const enlaceWeb = `${originWeb}/pedir/${activeTenant}`;
  const qrWebUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(enlaceWeb)}&margin=10`;

  const handleCopiarWa = () => {
    navigator.clipboard.writeText(enlaceWhatsApp);
    setCopiadoWa(true);
    setTimeout(() => setCopiadoWa(false), 2500);
  };

  const handleCopiarWeb = () => {
    navigator.clipboard.writeText(enlaceWeb);
    setCopiadoWeb(true);
    setTimeout(() => setCopiadoWeb(false), 2500);
  };

  const handleImprimirPoster = () => {
    window.print();
  };

  return (
    <main className="lqr-main">
      <div className="lqr-container">

        {/* ── Page Header Island ── */}
        <div className="lqr-page-head glass">
          <div>
            <div className="lqr-page-head__title-wrap">
              <h1 className="lqr-title">WhatsApp & Códigos QR</h1>
              <span
                className={`lqr-badge ${
                  status.estado === 'conectado'
                    ? 'lqr-badge--success'
                    : status.estado === 'esperando_qr'
                    ? 'lqr-badge--warning'
                    : 'lqr-badge--danger'
                }`}
              >
                {status.estado === 'conectado' && '🟢 Conectado'}
                {status.estado === 'esperando_qr' && '🟡 Esperando Escaneo'}
                {status.estado === 'desconectado' && '🔴 Desconectado'}
                {status.estado === 'desconocido' && '⚪ Sin Vincular'}
              </span>
            </div>
            <p className="lqr-sub">
              Vincula el bot de IA e imprime tus códigos QR (WhatsApp y Web) para que tus clientes coticen sus listas.
            </p>
          </div>
        </div>

        {/* ── Selector de Pestañas ── */}
        <div className="lqr-tabs-nav">
          <button
            type="button"
            className={`lqr-nav-tab ${tabActiva === 'vinculacion' ? 'lqr-nav-tab--active' : ''}`}
            onClick={() => setTabActiva('vinculacion')}
          >
            <span className="lqr-tab-icon">📱</span>
            <span>1. Vincular WhatsApp (Bot IA)</span>
          </button>
          <button
            type="button"
            className={`lqr-nav-tab ${tabActiva === 'mostrador' ? 'lqr-nav-tab--active' : ''}`}
            onClick={() => setTabActiva('mostrador')}
          >
            <span className="lqr-tab-icon">🖨️</span>
            <span>2. Códigos QR de Mostrador (Clientes)</span>
          </button>
        </div>

        {/* Alertas */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="lqr-alert lqr-alert--error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span>⚠️</span> {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              className="lqr-alert lqr-alert--success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span>✅</span> {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PESTAÑA 1: VINCULACIÓN DEL WHATSAPP ── */}
        {tabActiva === 'vinculacion' && (
          <div>
            {status.estado === 'conectado' ? (
              <div className="lqr-connected-card glass-card">
                <div className="lqr-connected-badge">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="lqr-connected-title">¡WhatsApp Conectado y Activo!</h2>
                <p className="lqr-connected-sub">
                  Número vinculado: <strong>{status.numero ? `+${status.numero}` : 'Detectado'}</strong>. El bot está respondiendo en vivo.
                </p>

                <div className="lqr-connected-steps">
                  <div className="lqr-step-box">
                    <span className="lqr-step-icon">📸</span>
                    <strong>Recepción de Fotos</strong>
                    <span>Los clientes escanean el QR de tu mostrador y envían fotos de sus listas.</span>
                  </div>
                  <div className="lqr-step-box">
                    <span className="lqr-step-icon">⚡</span>
                    <strong>Cotización IA</strong>
                    <span>La IA analiza los útiles de tu inventario y responde el total en segundos.</span>
                  </div>
                  <div className="lqr-step-box">
                    <span className="lqr-step-icon">📦</span>
                    <strong>Panel de Pedidos</strong>
                    <span>Los pedidos entran directamente a tu pestaña de Pedidos.</span>
                  </div>
                </div>

                <div className="lqr-connected-actions">
                  <button
                    type="button"
                    className="lqr-btn-primary-action"
                    onClick={() => setTabActiva('mostrador')}
                  >
                    🖨️ Ver e Imprimir Códigos QR de Mostrador →
                  </button>
                  <button
                    type="button"
                    className="lqr-btn-danger"
                    onClick={handleDesconectar}
                  >
                    Desconectar WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              /* ── Estado Desconectado / Esperando QR ── */
              <div className="lqr-qr-panel glass-card">
                <div className="lqr-qr-panel__left">
                  <h2 className="lqr-card-title">Vincular tu WhatsApp</h2>
                  <p className="lqr-card-sub">
                    Escanea el código QR desde tu teléfono para conectar el bot de tu papelería con Evolution API.
                  </p>

                  <div className="lqr-steps-guide">
                    <div className="lqr-guide-item">
                      <span className="lqr-guide-num">1</span>
                      <span>Abre <strong>WhatsApp</strong> en tu teléfono celular.</span>
                    </div>
                    <div className="lqr-guide-item">
                      <span className="lqr-guide-num">2</span>
                      <span>Toca <strong>Ajustes</strong> o <strong>Menú (⋮)</strong> → <strong>Dispositivos vinculados</strong>.</span>
                    </div>
                    <div className="lqr-guide-item">
                      <span className="lqr-guide-num">3</span>
                      <span>Toca <strong>Vincular un dispositivo</strong> y apunta tu cámara al código QR de la derecha.</span>
                    </div>
                  </div>

                  <div className="lqr-action-zone">
                    <button
                      type="button"
                      className="lqr-btn-generate"
                      onClick={handleGenerarQR}
                      disabled={generandoQR}
                    >
                      {generandoQR ? (
                        '⏳ Generando código QR...'
                      ) : status.qr ? (
                        '🔄 Actualizar Código QR'
                      ) : (
                        '📱 Generar Código QR para Vincular →'
                      )}
                    </button>
                  </div>
                </div>

                <div className="lqr-qr-panel__right">
                  <div className="lqr-qr-container">
                    {generandoQR ? (
                      <div className="lqr-qr-loader">
                        <div className="lqr-spinner" />
                        <span>Generando código QR con Evolution API...</span>
                      </div>
                    ) : status.qr ? (
                      <div className="lqr-qr-display">
                        <img
                          src={status.qr.startsWith('data:') ? status.qr : `data:image/png;base64,${status.qr}`}
                          alt="Código QR de Vinculación"
                          className="lqr-qr-image"
                        />
                        <span className="lqr-qr-hint">🟢 Código QR activo · Escanéalo con WhatsApp</span>
                      </div>
                    ) : (
                      <div className="lqr-qr-placeholder">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01M7 12h10M12 7v10" />
                        </svg>
                        <p>Haz clic en <strong>"Generar Código QR"</strong> para vincular tu WhatsApp.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PESTAÑA 2: CÓDIGOS QR DE MOSTRADOR (CLIENTES) ── */}
        {tabActiva === 'mostrador' && (
          <div className="lqr-poster-section">
            <div className="lqr-poster-controls glass-card">
              <div>
                <div className="lqr-poster-badge-highlight">
                  ✨ Cartel de Mostrador Oficial: Doble QR (WhatsApp + Web)
                </div>
                <h2 className="lqr-card-title">Póster Listo para tus Clientes</h2>
                <p className="lqr-card-sub">
                  Tus clientes pueden cotizar de 2 formas con este cartel: enviando foto por <strong>WhatsApp</strong> o cotizando directamente en la <strong>Página Web</strong>.
                </p>

                {rawNumero ? (
                  <div className="lqr-phone-connected-pill">
                    <span>📱 Número oficial conectado:</span>
                    <strong>+{rawNumero}</strong>
                  </div>
                ) : (
                  <div className="lqr-phone-warning-pill" onClick={() => setTabActiva('vinculacion')}>
                    <span>⚠️ WhatsApp no vinculado todavía.</span>
                    <u>Haz clic aquí para escanear en el Paso 1 y asignar tu número</u>
                  </div>
                )}
              </div>

              {/* Botones de acción principales */}
              <div className="lqr-poster-btn-group">
                <button
                  type="button"
                  className="lqr-btn-print"
                  onClick={handleImprimirPoster}
                >
                  🖨️ Imprimir Cartel de Mostrador (A4)
                </button>
                <button
                  type="button"
                  className="lqr-btn-secondary"
                  onClick={handleCopiarWa}
                >
                  {copiadoWa ? '✓ ¡Enlace copiado!' : '💬 Copiar Enlace WhatsApp'}
                </button>
                <button
                  type="button"
                  className="lqr-btn-secondary"
                  onClick={handleCopiarWeb}
                >
                  {copiadoWeb ? '✓ ¡Enlace copiado!' : '🌐 Copiar Enlace Web'}
                </button>
                <a
                  href={enlaceWeb}
                  target="_blank"
                  rel="noreferrer"
                  className="lqr-btn-ghost"
                >
                  🔗 Probar Portal Web →
                </a>
              </div>
            </div>

            {/* ── VISTA PREVIA DEL PÓSTER DE MOSTRADOR ── */}
            <div className="lqr-poster-preview-wrap">
              <div className="lqr-printable-poster" ref={posterRef}>
                {/* Header del Cartel */}
                <div className="lqr-poster-head">
                  <div className="lqr-poster-logo-badge">📚 LibreríaQR</div>
                  <h1 className="lqr-poster-shop-name">{nombreLibreria}</h1>
                  <h2 className="lqr-poster-hero-text">¡Cotiza tu Lista de Útiles Escolares Aquí! ✏️🎒</h2>
                  <p className="lqr-poster-subtext">Escanea el código QR que prefieras para recibir tu presupuesto al instante sin filas.</p>
                </div>

                {/* Zona de Códigos QR */}
                <div className="lqr-poster-qrs-grid lqr-poster-qrs-grid--double">

                  {/* QR 1: WhatsApp */}
                  <div className="lqr-poster-qr-card lqr-poster-qr-card--wa">
                    <span className="lqr-pqr-channel-badge">💬 OPCIÓN 1: VÍA WHATSAPP</span>
                    <img
                      src={qrWhatsAppUrl}
                      alt={`QR WhatsApp ${nombreLibreria}`}
                      className="lqr-poster-qr-img"
                    />
                    <strong className="lqr-pqr-title">Enviar foto al WhatsApp</strong>
                    <span className="lqr-pqr-sub">
                      {status.numero ? `Número: +${status.numero}` : 'Abre WhatsApp directo'}
                    </span>
                    <a
                      href={qrWhatsAppUrl}
                      download={`QR_WhatsApp_${activeTenant}.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="lqr-pqr-download-btn"
                    >
                      📥 Descargar QR WhatsApp (.png)
                    </a>
                  </div>

                  {/* QR 2: Página Web */}
                  <div className="lqr-poster-qr-card lqr-poster-qr-card--web">
                    <span className="lqr-pqr-channel-badge lqr-pqr-channel-badge--web">🌐 OPCIÓN 2: EN LA PÁGINA WEB</span>
                    <img
                      src={qrWebUrl}
                      alt={`QR Web ${nombreLibreria}`}
                      className="lqr-poster-qr-img"
                    />
                    <strong className="lqr-pqr-title">Cotizar y pedir en la Web</strong>
                    <span className="lqr-pqr-sub">Sube foto o PDF en el navegador</span>
                    <a
                      href={qrWebUrl}
                      download={`QR_Web_${activeTenant}.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="lqr-pqr-download-btn lqr-pqr-download-btn--web"
                    >
                      📥 Descargar QR Web (.png)
                    </a>
                  </div>

                </div>

                {/* Pasos para el cliente */}
                <div className="lqr-poster-steps">
                  <div className="lqr-poster-step">
                    <span className="lqr-pstep-num">1</span>
                    <strong>Escanea el QR</strong>
                    <span>Con la cámara de tu celular.</span>
                  </div>
                  <div className="lqr-poster-step">
                    <span className="lqr-pstep-num">2</span>
                    <strong>Sube tu Lista</strong>
                    <span>Foto de la lista escolar.</span>
                  </div>
                  <div className="lqr-poster-step">
                    <span className="lqr-pstep-num">3</span>
                    <strong>Total en Segundos</strong>
                    <span>Recibe el precio y confirma.</span>
                  </div>
                </div>

                {/* Footer del Cartel */}
                <div className="lqr-poster-foot">
                  <span>⚡ Atención rápida e inteligente impulsada por IA · {nombreLibreria}</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
          padding: 24px 28px;
          margin-bottom: 20px;
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

        /* ── Tabs Nav ── */
        .lqr-tabs-nav {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--glass-stroke);
          padding-bottom: 12px;
          flex-wrap: wrap;
        }
        .lqr-nav-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: var(--radius-full);
          font-size: 14px;
          font-weight: 700;
          color: var(--text-secondary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          cursor: pointer;
          transition: all 0.2s var(--ease-spring);
        }
        .lqr-nav-tab:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }
        .lqr-nav-tab--active {
          background: var(--accent) !important;
          color: #000 !important;
          border-color: var(--accent) !important;
          box-shadow: var(--accent-glow);
        }
        .lqr-tab-icon {
          font-size: 16px;
        }

        /* ── Alertas ── */
        .lqr-alert {
          padding: 14px 20px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lqr-alert--error {
          background: rgba(255, 69, 58, 0.1);
          border: 1px solid rgba(255, 69, 58, 0.25);
          color: #ff453a;
        }
        .lqr-alert--success {
          background: rgba(48, 209, 88, 0.1);
          border: 1px solid rgba(48, 209, 88, 0.25);
          color: #30d158;
        }

        /* ── Connected Card ── */
        .lqr-connected-card {
          padding: 44px 32px;
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .lqr-connected-badge {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(48, 209, 88, 0.12);
          color: #30d158;
          border: 1px solid rgba(48, 209, 88, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 0 30px rgba(48, 209, 88, 0.2);
        }
        .lqr-connected-title {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }
        .lqr-connected-sub {
          font-size: 15px;
          color: var(--text-secondary);
          max-width: 500px;
          margin-bottom: 32px;
        }
        .lqr-connected-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          width: 100%;
          margin-bottom: 32px;
        }
        .lqr-step-box {
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }
        .lqr-step-icon {
          font-size: 28px;
        }
        .lqr-step-box strong {
          font-size: 14px;
          color: var(--text-primary);
        }
        .lqr-step-box span {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .lqr-connected-actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .lqr-btn-primary-action {
          padding: 12px 24px;
          background: var(--accent);
          color: #000;
          border-radius: var(--radius-full);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          box-shadow: var(--accent-glow);
          transition: filter 0.15s;
        }
        .lqr-btn-primary-action:hover {
          filter: brightness(1.1);
        }
        .lqr-btn-danger {
          padding: 12px 24px;
          background: rgba(255, 69, 58, 0.1);
          border: 1px solid rgba(255, 69, 58, 0.25);
          color: #ff453a;
          border-radius: var(--radius-full);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }
        .lqr-btn-danger:hover {
          background: rgba(255, 69, 58, 0.2);
        }

        /* ── QR Panel (Vinculación) ── */
        .lqr-qr-panel {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 32px;
          padding: 36px;
          border-radius: var(--radius-xl);
          align-items: center;
        }
        @media (max-width: 768px) {
          .lqr-qr-panel {
            grid-template-columns: 1fr;
          }
        }
        .lqr-card-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }
        .lqr-card-sub {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .lqr-steps-guide {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 28px;
        }
        .lqr-guide-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .lqr-guide-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--accent-soft);
          color: var(--accent);
          border: 1px solid var(--accent-border);
          font-weight: 800;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lqr-btn-generate {
          padding: 14px 28px;
          background: var(--accent);
          color: #000;
          font-size: 15px;
          font-weight: 700;
          border-radius: var(--radius-full);
          border: none;
          cursor: pointer;
          box-shadow: var(--accent-glow);
          transition: all 0.2s var(--ease-spring);
          width: 100%;
        }
        .lqr-btn-generate:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        .lqr-btn-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── QR Display Box ── */
        .lqr-qr-container {
          background: var(--glass-bg-deep);
          border: 1px solid var(--glass-stroke-strong);
          border-radius: var(--radius-xl);
          padding: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 320px;
        }
        .lqr-qr-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .lqr-qr-image {
          width: 220px;
          height: 220px;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .lqr-qr-hint {
          font-size: 12px;
          font-weight: 700;
          color: #30d158;
        }
        .lqr-qr-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text-muted);
          text-align: center;
          padding: 20px;
          font-size: 13px;
        }
        .lqr-qr-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
        }
        .lqr-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid var(--glass-stroke-strong);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Poster Section ── */
        .lqr-poster-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .lqr-poster-badge-highlight {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-soft);
          border: 1px solid var(--accent-border);
          color: var(--accent);
          font-size: 13px;
          font-weight: 800;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          margin-bottom: 8px;
        }

        .lqr-phone-connected-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(48, 209, 88, 0.1);
          border: 1px solid rgba(48, 209, 88, 0.25);
          color: #30d158;
          font-size: 13px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: var(--radius-md);
          margin-top: 4px;
        }
        .lqr-phone-warning-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 214, 10, 0.1);
          border: 1px solid rgba(255, 214, 10, 0.25);
          color: #ffd60a;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: var(--radius-md);
          margin-top: 4px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .lqr-phone-warning-pill:hover {
          background: rgba(255, 214, 10, 0.18);
        }

        .lqr-poster-btn-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .lqr-btn-print {
          padding: 12px 24px;
          background: var(--accent);
          color: #000;
          border-radius: var(--radius-full);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          box-shadow: var(--accent-glow);
          transition: filter 0.15s;
        }
        .lqr-btn-print:hover {
          filter: brightness(1.1);
        }
        .lqr-btn-secondary {
          padding: 12px 18px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          color: var(--text-primary);
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }
        .lqr-btn-secondary:hover {
          background: var(--glass-bg-hover);
        }
        .lqr-btn-ghost {
          padding: 12px 18px;
          color: var(--accent);
          background: var(--accent-soft);
          border: 1px solid var(--accent-border);
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }

        /* ── Poster Impreso Preview ── */
        .lqr-poster-preview-wrap {
          display: flex;
          justify-content: center;
          padding: 10px;
        }
        .lqr-printable-poster {
          width: 100%;
          max-width: 600px;
          background: #ffffff;
          color: #111827;
          border-radius: 24px;
          padding: 36px 32px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border: 4px solid #10b981;
        }
        .lqr-poster-logo-badge {
          display: inline-block;
          background: #10b981;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          padding: 4px 14px;
          border-radius: 9999px;
          margin-bottom: 12px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .lqr-poster-shop-name {
          font-size: 28px;
          font-weight: 900;
          color: #111827;
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }
        .lqr-poster-hero-text {
          font-size: 18px;
          font-weight: 800;
          color: #059669;
          margin-bottom: 6px;
          line-height: 1.25;
        }
        .lqr-poster-subtext {
          font-size: 13px;
          color: #4b5563;
          margin-bottom: 24px;
          max-width: 440px;
        }

        /* ── QRs Grid en Póster ── */
        .lqr-poster-qrs-grid {
          display: flex;
          justify-content: center;
          gap: 20px;
          width: 100%;
          margin-bottom: 24px;
        }
        .lqr-poster-qrs-grid--double {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 540px) {
          .lqr-poster-qrs-grid--double {
            grid-template-columns: 1fr;
          }
        }
        .lqr-poster-qr-card {
          background: #f9fafb;
          border: 2px dashed #10b981;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .lqr-poster-qr-card--web {
          border-color: #3b82f6;
        }
        .lqr-pqr-channel-badge {
          font-size: 10px;
          font-weight: 800;
          color: #059669;
          letter-spacing: 0.04em;
        }
        .lqr-pqr-channel-badge--web {
          color: #2563eb;
        }
        .lqr-poster-qr-img {
          width: 160px;
          height: 160px;
          border-radius: 8px;
        }
        .lqr-pqr-title {
          font-size: 13px;
          font-weight: 800;
          color: #111827;
        }
        .lqr-pqr-sub {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        /* ── Botones de descarga bajo cada QR ── */
        .lqr-pqr-download-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          background: #10b981;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          border-radius: 8px;
          text-decoration: none;
          transition: filter 0.15s, transform 0.1s;
        }
        .lqr-pqr-download-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .lqr-pqr-download-btn:active {
          transform: scale(0.98);
        }
        .lqr-pqr-download-btn--web {
          background: #2563eb;
        }

        .lqr-poster-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          width: 100%;
          margin-bottom: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        .lqr-poster-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .lqr-pstep-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #10b981;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lqr-poster-step strong {
          font-size: 12px;
          color: #111827;
        }
        .lqr-poster-step span {
          font-size: 10px;
          color: #6b7280;
          line-height: 1.3;
        }
        .lqr-poster-foot {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
        }

        /* ── Estilos de Impresión Directa (Ctrl + P) ── */
        @media print {
          body * {
            visibility: hidden;
          }
          .lqr-printable-poster, .lqr-printable-poster * {
            visibility: visible;
          }
          .lqr-pqr-download-btn {
            display: none !important;
          }
          .lqr-printable-poster {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 92% !important;
            max-width: 650px !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}
