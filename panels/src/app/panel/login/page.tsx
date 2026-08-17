'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { buscarTenantPublico } from '@/lib/api';
import { getStoredTenant, setStoredTenant, clearStoredTenant, TenantInfo } from '@/lib/tenant';

export default function PanelLoginPage() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sesionActual, setSesionActual] = useState<TenantInfo | null>(null);

  useEffect(() => {
    const current = getStoredTenant();
    if (current?.id) {
      setSesionActual(current);
    }
  }, []);

  const handleIngresar = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = identificador.trim();
    if (!query) return;

    setLoading(true);
    setError(null);

    try {
      const match = await buscarTenantPublico(query);
      if (match?.id) {
        setStoredTenant(match.id, match.nombre);
        router.push('/panel/pedidos');
      } else {
        setError('No encontramos ninguna librería con ese identificador.');
      }
    } catch (e: any) {
      setError(e.message || 'Error al validar el identificador.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinuarSesion = () => {
    router.push('/panel/pedidos');
  };

  const handleCerrarSesion = () => {
    clearStoredTenant();
    setSesionActual(null);
    setIdentificador('');
  };

  return (
    <main className="lqr-login-screen">
      <motion.div
        className="lqr-login-box glass-strong"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header con icono y título */}
        <div className="lqr-login-header">
          <div className="lqr-login-logo" aria-hidden>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" />
              <path d="M8 7h8M8 11h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            </svg>
          </div>
          <div>
            <h1 className="lqr-login-title">Acceso de Papelería</h1>
            <p className="lqr-login-subtitle">Ingresa a tu panel privado de gestión</p>
          </div>
        </div>

        {sesionActual ? (
          /* Si ya tiene sesión activa */
          <div className="lqr-active-session">
            <div className="lqr-session-info glass-card">
              <span className="lqr-session-label">Sesión iniciada como:</span>
              <strong className="lqr-session-name">{sesionActual.nombre}</strong>
              <span className="lqr-session-id">ID: {sesionActual.id}</span>
            </div>

            <div className="lqr-session-actions">
              <button
                type="button"
                onClick={handleContinuarSesion}
                className="lqr-btn-primary"
              >
                Continuar al Panel →
              </button>
              <button
                type="button"
                onClick={handleCerrarSesion}
                className="lqr-btn-secondary"
              >
                Ingresar con otra cuenta
              </button>
            </div>
          </div>
        ) : (
          /* Formulario único privado de ingreso */
          <form onSubmit={handleIngresar} className="lqr-form">
            <label className="lqr-label">
              <span>Identificador o Teléfono de tu Librería</span>
              <input
                type="text"
                placeholder="ej: papeleria_don_pablo o +59399..."
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                required
                autoFocus
                className="lqr-input"
              />
            </label>

            {error && <div className="lqr-error">{error}</div>}

            <button
              type="submit"
              disabled={loading || !identificador.trim()}
              className="lqr-btn-primary"
            >
              {loading ? 'Verificando…' : 'Ingresar al Panel →'}
            </button>
          </form>
        )}

        {/* Footer Superadmin */}
        <div className="lqr-footer">
          <span>¿Eres el operador / administrador general?</span>
          <Link href="/admin/login" className="lqr-admin-link">
            Ir a Superadmin
          </Link>
        </div>
      </motion.div>

      <style jsx>{`
        .lqr-login-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          z-index: 10;
        }

        .lqr-login-box {
          width: 100%;
          max-width: 440px;
          padding: 38px 32px;
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .lqr-login-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .lqr-login-logo {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--accent-soft) 0%, rgba(34, 197, 94, 0.28) 100%);
          border: 1px solid var(--accent-border);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: var(--accent-glow), var(--glass-specular);
        }

        .lqr-login-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          line-height: 1.15;
        }

        .lqr-login-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 3px;
        }

        .lqr-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .lqr-label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .lqr-input {
          background: var(--glass-bg-deep);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          outline: none;
          transition: border-color var(--duration-fast) var(--ease-out);
        }

        .lqr-input:focus {
          border-color: var(--accent);
        }

        .lqr-btn-primary {
          width: 100%;
          padding: 15px 24px;
          background: var(--accent);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform var(--duration-fast) var(--ease-out), opacity var(--duration-fast) var(--ease-out);
        }

        .lqr-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .lqr-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .lqr-btn-secondary {
          width: 100%;
          padding: 12px 20px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 13px;
          border-radius: var(--radius-md);
          transition: all var(--duration-fast) var(--ease-out);
        }

        .lqr-btn-secondary:hover {
          color: var(--text-primary);
          background: var(--glass-bg-hover);
        }

        .lqr-active-session {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .lqr-session-info {
          padding: 18px 20px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .lqr-session-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          font-weight: 700;
        }

        .lqr-session-name {
          font-size: 17px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .lqr-session-id {
          font-size: 12px;
          color: var(--accent);
          font-weight: 600;
        }

        .lqr-session-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .lqr-error {
          padding: 10px 14px;
          background: var(--danger-soft);
          border: 1px solid var(--danger-border);
          color: var(--danger);
          font-size: 13px;
          font-weight: 500;
          border-radius: var(--radius-md);
        }

        .lqr-footer {
          padding-top: 18px;
          border-top: 1px solid var(--glass-stroke);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-muted);
        }

        .lqr-admin-link {
          color: var(--text-secondary);
          font-weight: 700;
          text-decoration: underline;
        }

        .lqr-admin-link:hover {
          color: var(--text-primary);
        }
      `}</style>
    </main>
  );
}
