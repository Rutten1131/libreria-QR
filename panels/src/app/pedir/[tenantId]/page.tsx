'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface TenantInfo {
  id: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
}

interface ItemCotizado {
  item: string;
  producto_id: string | null;
  nombre_encontrado: string | null;
  precio_unitario: number;
  disponible: boolean;
  cantidad: number;
}

interface CotizacionResponse {
  items: ItemCotizado[];
  total: number;
  totalItems: number;
  encontrados: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function PedirWebPage() {
  const params = useParams();
  const tenantId = (params?.tenantId as string) || '';

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);

  // Estado del flujo
  const [paso, setPaso] = useState<'subir' | 'cotizando' | 'resumen' | 'confirmado'>('subir');
  const [modoTexto, setModoTexto] = useState(false);
  const [textoLista, setTextoLista] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Cotización
  const [cotizacion, setCotizacion] = useState<CotizacionResponse | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos de la papelería
  useEffect(() => {
    if (!tenantId) return;
    fetch(`${API_URL}/api/public/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tenant) {
          setTenant(data.tenant);
        } else {
          setTenant({ id: tenantId, nombre: tenantId.replace(/_/g, ' ') });
        }
      })
      .catch(() => {
        setTenant({ id: tenantId, nombre: tenantId.replace(/_/g, ' ') });
      })
      .finally(() => setLoadingTenant(false));
  }, [tenantId]);

  // Manejar selección de foto / archivo
  const handleFileChange = (file: File) => {
    setArchivoSeleccionado(file);
    setError(null);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // Procesar cotización
  const handleCotizar = async () => {
    setError(null);
    setPaso('cotizando');

    try {
      let lineasLista: string[] = [];

      if (modoTexto) {
        lineasLista = textoLista
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
      } else if (archivoSeleccionado) {
        // En demo/MVP si no hay OCR backend directo, usamos nombres simulados o texto descriptivo
        lineasLista = [
          'Cuaderno college 100 hojas cuadros',
          'Cuaderno universitario 100 hojas lineas',
          'Lapiz 2B Faber Castell',
          'Borrador blanco de miga',
          'Regla plastica 30cm',
          'Tijera escolar punta redonda',
          'Goma en barra 40g',
          'Caja de 12 pinturas de colores',
        ];
      }

      if (lineasLista.length === 0) {
        setError('Por favor escribe tu lista o sube una foto con los útiles escolares.');
        setPaso('subir');
        return;
      }

      const res = await fetch(`${API_URL}/api/cotizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant?.id || tenantId,
          lista: lineasLista,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al cotizar la lista');
      }

      const data = await res.json();
      setCotizacion(data);
      setPaso('resumen');
    } catch (e: any) {
      setError(e.message || 'No se pudo cotizar la lista. Intenta nuevamente.');
      setPaso('subir');
    }
  };

  // Enviar pedido
  const handleConfirmarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim() || !clienteTelefono.trim()) {
      setError('Por favor ingresa tu nombre y número de WhatsApp para confirmar.');
      return;
    }

    setEnviandoPedido(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/pedido`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotizacion,
          clienteNombre: clienteNombre.trim(),
          clienteTelefono: clienteTelefono.trim(),
          canal: 'web',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al registrar el pedido');
      }

      const data = await res.json();
      setPedidoId(data.id || `PED-${Date.now().toString().slice(-4)}`);
      setPaso('confirmado');
    } catch (e: any) {
      setError(e.message || 'No se pudo enviar el pedido.');
    } finally {
      setEnviandoPedido(false);
    }
  };

  const nombreLibreria = tenant?.nombre || 'Librería';

  if (loadingTenant) {
    return (
      <div className="lqr-web-loading">
        <div className="lqr-spinner" />
        <p>Cargando tienda...</p>
        <style jsx>{`
          .lqr-web-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: #0f172a;
            color: #94a3b8;
            font-family: system-ui, sans-serif;
          }
          .lqr-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="lqr-web-portal">
      {/* ── HEADER PÚBLICO ── */}
      <header className="lqr-web-header">
        <div className="lqr-web-header__inner">
          <div className="lqr-web-logo-wrap">
            <span className="lqr-web-logo-icon">📚</span>
            <div>
              <h1 className="lqr-web-shop-title">{nombreLibreria}</h1>
              <span className="lqr-web-shop-tag">Cotizador Oficial de Útiles Escolares</span>
            </div>
          </div>

          <div className="lqr-web-ai-badge">
            <span className="lqr-web-ai-dot" />
            <span>IA Activa 24/7</span>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="lqr-web-main">
        <div className="lqr-web-container">

          {/* Banner de Bienvenida */}
          <div className="lqr-hero-card">
            <h2 className="lqr-hero-title">¡Cotiza tu lista escolar al instante! 🎒✏️</h2>
            <p className="lqr-hero-sub">
              Sube la foto de tu lista escolar o escribe los útiles que necesitas. Nuestro sistema calcula tu presupuesto exacto con el inventario de <strong>{nombreLibreria}</strong>.
            </p>
          </div>

          {/* Alertas */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="lqr-web-alert"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── PASO 1: SUBIR LISTA O FOTO ── */}
          {paso === 'subir' && (
            <div className="lqr-step-card">
              <div className="lqr-mode-switch">
                <button
                  type="button"
                  className={`lqr-mode-btn ${!modoTexto ? 'lqr-mode-btn--active' : ''}`}
                  onClick={() => setModoTexto(false)}
                >
                  📸 Tomar Foto o Subir Archivo
                </button>
                <button
                  type="button"
                  className={`lqr-mode-btn ${modoTexto ? 'lqr-mode-btn--active' : ''}`}
                  onClick={() => setModoTexto(true)}
                >
                  ✍️ Escribir Lista en Texto
                </button>
              </div>

              {!modoTexto ? (
                /* Subida de foto */
                <div
                  className="lqr-file-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="lqr-hidden-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileChange(f);
                    }}
                  />

                  {previewUrl ? (
                    <div className="lqr-file-preview">
                      <img src={previewUrl} alt="Lista escolar" className="lqr-preview-img" />
                      <span className="lqr-preview-tag">✓ Foto seleccionada: {archivoSeleccionado?.name}</span>
                      <button
                        type="button"
                        className="lqr-change-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchivoSeleccionado(null);
                          setPreviewUrl(null);
                        }}
                      >
                        Cambiar foto
                      </button>
                    </div>
                  ) : (
                    <div className="lqr-dropzone-content">
                      <div className="lqr-dropzone-icon">📷</div>
                      <strong>Toca aquí para tomar foto a tu lista</strong>
                      <span>o selecciona una imagen o documento PDF desde tu celular</span>
                      <span className="lqr-formats-pill">JPG · PNG · PDF</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Entrada de texto */
                <div className="lqr-text-mode-wrap">
                  <label className="lqr-field-label">Escribe los útiles escolares (uno por línea):</label>
                  <textarea
                    className="lqr-textarea"
                    rows={6}
                    placeholder="Ejemplo:&#10;1 Cuaderno universitario 100 hojas líneas&#10;2 Lápices 2B Faber Castell&#10;1 Borrador de miga&#10;1 Regla de 30cm&#10;1 Caja de 12 colores"
                    value={textoLista}
                    onChange={(e) => setTextoLista(e.target.value)}
                  />
                </div>
              )}

              <button
                type="button"
                className="lqr-btn-submit"
                onClick={handleCotizar}
                disabled={!modoTexto && !archivoSeleccionado && !textoLista.trim()}
              >
                ⚡ Cotizar mi Lista con IA →
              </button>
            </div>
          )}

          {/* ── PASO 2: COTIZANDO CON IA ── */}
          {paso === 'cotizando' && (
            <div className="lqr-loading-card">
              <div className="lqr-ai-pulse-icon">🤖</div>
              <h3 className="lqr-loading-title">Analizando tu lista de útiles...</h3>
              <p className="lqr-loading-sub">
                La Inteligencia Artificial está verificando los precios y disponibilidad en el inventario de <strong>{nombreLibreria}</strong>.
              </p>
              <div className="lqr-progress-bar">
                <div className="lqr-progress-bar__fill" />
              </div>
            </div>
          )}

          {/* ── PASO 3: RESUMEN Y CONFIRMAR PEDIDO ── */}
          {paso === 'resumen' && cotizacion && (
            <div className="lqr-step-card">
              <div className="lqr-summary-header">
                <div>
                  <h3 className="lqr-summary-title">Resumen de tu Cotización</h3>
                  <span className="lqr-summary-count">
                    {cotizacion.encontrados} de {cotizacion.totalItems} útiles disponibles
                  </span>
                </div>
                <div className="lqr-summary-total-badge">
                  <span>Total a pagar:</span>
                  <strong>${cotizacion.total.toFixed(2)}</strong>
                </div>
              </div>

              {/* Lista de productos cotizados */}
              <div className="lqr-items-list">
                {cotizacion.items.map((item, idx) => (
                  <div key={idx} className="lqr-item-row">
                    <div className="lqr-item-info">
                      <strong className="lqr-item-name">{item.nombre_encontrado || item.item}</strong>
                      <span className="lqr-item-orig">Buscado: "{item.item}"</span>
                    </div>

                    <div className="lqr-item-price-zone">
                      {item.disponible ? (
                        <span className="lqr-item-price">${(item.precio_unitario * (item.cantidad || 1)).toFixed(2)}</span>
                      ) : (
                        <span className="lqr-item-out">Agotado</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulario de confirmación */}
              <form onSubmit={handleConfirmarPedido} className="lqr-order-form">
                <h4 className="lqr-form-title">Completa tus datos para preparar el pedido:</h4>

                <div className="lqr-fields-grid">
                  <div className="lqr-field">
                    <label className="lqr-label">Tu Nombre y Apellido *</label>
                    <input
                      type="text"
                      className="lqr-input"
                      placeholder="Ej. María Pérez"
                      required
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                    />
                  </div>

                  <div className="lqr-field">
                    <label className="lqr-label">Tu Número de WhatsApp *</label>
                    <input
                      type="tel"
                      className="lqr-input"
                      placeholder="Ej. 0991234567"
                      required
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                    />
                  </div>
                </div>

                <div className="lqr-form-actions">
                  <button
                    type="submit"
                    className="lqr-btn-submit"
                    disabled={enviandoPedido}
                  >
                    {enviandoPedido ? 'Enviando pedido a la tienda...' : '📦 Confirmar y Enviar Pedido →'}
                  </button>
                  <button
                    type="button"
                    className="lqr-btn-back"
                    onClick={() => setPaso('subir')}
                  >
                    Volver a subir lista
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── PASO 4: PEDIDO CONFIRMADO ── */}
          {paso === 'confirmado' && (
            <div className="lqr-step-card lqr-confirmed-card">
              <div className="lqr-confirmed-badge">✓</div>
              <h2 className="lqr-confirmed-title">¡Pedido Recibido con Éxito!</h2>
              <p className="lqr-confirmed-sub">
                Tu pedido <strong>#{pedidoId}</strong> ha sido enviado directamente al panel de <strong>{nombreLibreria}</strong>.
              </p>

              <div className="lqr-confirmed-info-box">
                <div className="lqr-cinfo-row">
                  <span>Cliente:</span>
                  <strong>{clienteNombre}</strong>
                </div>
                <div className="lqr-cinfo-row">
                  <span>WhatsApp:</span>
                  <strong>{clienteTelefono}</strong>
                </div>
                <div className="lqr-cinfo-row">
                  <span>Total a pagar:</span>
                  <strong>${cotizacion?.total.toFixed(2)}</strong>
                </div>
              </div>

              <p className="lqr-next-step-hint">
                La papelería te contactará por WhatsApp cuando tus útiles estén listos para retiro o entrega.
              </p>

              <button
                type="button"
                className="lqr-btn-submit"
                onClick={() => {
                  setPaso('subir');
                  setCotizacion(null);
                  setArchivoSeleccionado(null);
                  setTextoLista('');
                }}
              >
                Cotizar otra lista
              </button>
            </div>
          )}

        </div>
      </main>

      <style jsx>{`
        .lqr-web-portal {
          min-height: 100vh;
          background: #0b132b;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        /* ── Header ── */
        .lqr-web-header {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 16px 20px;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .lqr-web-header__inner {
          max-width: 640px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .lqr-web-logo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lqr-web-logo-icon {
          font-size: 28px;
        }
        .lqr-web-shop-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          line-height: 1.2;
          text-transform: capitalize;
        }
        .lqr-web-shop-tag {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        }
        .lqr-web-ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
        }
        .lqr-web-ai-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 8px #34d399;
        }

        /* ── Container ── */
        .lqr-web-main {
          padding: 24px 16px 60px;
        }
        .lqr-web-container {
          max-width: 640px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ── Hero Card ── */
        .lqr-hero-card {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(30, 41, 59, 0.7));
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 20px;
          padding: 24px 20px;
          text-align: center;
        }
        .lqr-hero-title {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }
        .lqr-hero-sub {
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.5;
        }

        /* ── Step Card ── */
        .lqr-step-card {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 24px 20px;
          backdrop-filter: blur(16px);
        }

        /* ── Mode Switch ── */
        .lqr-mode-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: rgba(15, 23, 42, 0.6);
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .lqr-mode-btn {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          background: transparent;
          color: #94a3b8;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .lqr-mode-btn--active {
          background: #10b981;
          color: #000;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        /* ── Dropzone ── */
        .lqr-file-dropzone {
          border: 2px dashed rgba(16, 185, 129, 0.4);
          border-radius: 16px;
          padding: 32px 16px;
          text-align: center;
          cursor: pointer;
          background: rgba(16, 185, 129, 0.03);
          transition: background 0.2s;
          margin-bottom: 20px;
        }
        .lqr-file-dropzone:hover {
          background: rgba(16, 185, 129, 0.08);
        }
        .lqr-hidden-input {
          display: none;
        }
        .lqr-dropzone-icon {
          font-size: 40px;
          margin-bottom: 8px;
        }
        .lqr-dropzone-content strong {
          display: block;
          font-size: 15px;
          color: #ffffff;
          margin-bottom: 4px;
        }
        .lqr-dropzone-content span {
          display: block;
          font-size: 12px;
          color: #94a3b8;
        }
        .lqr-formats-pill {
          display: inline-block;
          margin-top: 10px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 10px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 9999px;
          color: #64748b;
        }

        /* ── Preview ── */
        .lqr-file-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .lqr-preview-img {
          max-height: 180px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .lqr-preview-tag {
          font-size: 12px;
          font-weight: 700;
          color: #34d399;
        }
        .lqr-change-file-btn {
          font-size: 11px;
          color: #94a3b8;
          background: none;
          border: none;
          text-decoration: underline;
          cursor: pointer;
        }

        /* ── Text Mode ── */
        .lqr-text-mode-wrap {
          margin-bottom: 20px;
        }
        .lqr-field-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 8px;
        }
        .lqr-textarea {
          width: 100%;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 12px;
          color: #ffffff;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          outline: none;
        }
        .lqr-textarea:focus {
          border-color: #10b981;
        }

        /* ── Buttons ── */
        .lqr-btn-submit {
          width: 100%;
          padding: 14px 20px;
          background: #10b981;
          color: #000;
          font-size: 15px;
          font-weight: 800;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35);
          transition: filter 0.15s, transform 0.1s;
        }
        .lqr-btn-submit:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        .lqr-btn-submit:active:not(:disabled) {
          transform: scale(0.98);
        }
        .lqr-btn-submit:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .lqr-btn-back {
          width: 100%;
          padding: 10px;
          background: transparent;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          margin-top: 8px;
        }

        /* ── Loading Card ── */
        .lqr-loading-card {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .lqr-ai-pulse-icon {
          font-size: 48px;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        .lqr-loading-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
        }
        .lqr-loading-sub {
          font-size: 13px;
          color: #94a3b8;
          max-width: 400px;
          line-height: 1.4;
        }
        .lqr-progress-bar {
          width: 100%;
          max-width: 280px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          overflow: hidden;
          margin-top: 10px;
        }
        .lqr-progress-bar__fill {
          width: 60%;
          height: 100%;
          background: #10b981;
          border-radius: 9999px;
          animation: prog 2s ease-in-out infinite;
        }
        @keyframes prog {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        /* ── Summary ── */
        .lqr-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap;
          gap: 12px;
        }
        .lqr-summary-title {
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
        }
        .lqr-summary-count {
          font-size: 12px;
          color: #34d399;
          font-weight: 600;
        }
        .lqr-summary-total-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .lqr-summary-total-badge span {
          font-size: 11px;
          color: #94a3b8;
        }
        .lqr-summary-total-badge strong {
          font-size: 24px;
          color: #34d399;
          font-weight: 900;
        }

        .lqr-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 240px;
          overflow-y: auto;
          margin-bottom: 24px;
          padding-right: 4px;
        }
        .lqr-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .lqr-item-info {
          flex: 1;
          min-width: 0;
        }
        .lqr-item-name {
          display: block;
          font-size: 13px;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lqr-item-orig {
          font-size: 11px;
          color: #64748b;
        }
        .lqr-item-price {
          font-size: 14px;
          font-weight: 800;
          color: #34d399;
        }
        .lqr-item-out {
          font-size: 11px;
          font-weight: 700;
          color: #f87171;
        }

        /* ── Order Form ── */
        .lqr-order-form {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 18px;
        }
        .lqr-form-title {
          font-size: 13px;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 12px;
        }
        .lqr-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 18px;
        }
        @media (max-width: 480px) {
          .lqr-fields-grid {
            grid-template-columns: 1fr;
          }
        }
        .lqr-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .lqr-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .lqr-input {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 10px 12px;
          color: #ffffff;
          font-size: 13px;
          outline: none;
        }
        .lqr-input:focus {
          border-color: #10b981;
        }

        /* ── Confirmed Card ── */
        .lqr-confirmed-card {
          text-align: center;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .lqr-confirmed-badge {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          font-size: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #10b981;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.3);
        }
        .lqr-confirmed-title {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
        }
        .lqr-confirmed-sub {
          font-size: 14px;
          color: #94a3b8;
          max-width: 400px;
        }
        .lqr-confirmed-info-box {
          width: 100%;
          max-width: 320px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 12px 0;
          font-size: 13px;
        }
        .lqr-cinfo-row {
          display: flex;
          justify-content: space-between;
          color: #cbd5e1;
        }
        .lqr-cinfo-row strong {
          color: #ffffff;
        }
        .lqr-next-step-hint {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 12px;
        }

        .lqr-web-alert {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
