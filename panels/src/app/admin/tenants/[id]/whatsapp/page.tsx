'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { adminApi, getToken } from '@/lib/adminApi';
import { clearToken } from '@/lib/adminApi';

interface WhatsappInfo {
  numero_whatsapp?: string;
  evolution_instance_name?: string;
  evolution_state?: 'desconectado' | 'esperando_qr' | 'conectado' | 'desconocido';
  evolution_qr?: string | null;
  evolution_qr_expires_at?: string | null;
}

interface TenantInfo {
  id: string;
  nombre: string;
  telefono: string | null;
}

export default function WhatsAppTenantPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsappInfo | null>(null);
  const [numero, setNumero] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargarTodo = useCallback(async () => {
    try {
      const [t, w] = await Promise.all([
        adminApi.verTenant(params.id),
        adminApi.verWhatsappTenant(params.id),
      ]);
      setTenant(t.tenant);
      setWhatsapp(w.whatsapp);
      if (w.whatsapp?.numero_whatsapp) setNumero(w.whatsapp.numero_whatsapp);
      if (w.whatsapp?.evolution_qr) setQr(w.whatsapp.evolution_qr);
    } catch (e: any) {
      if (String(e.message).includes('401') || String(e.message).includes('403')) {
        clearToken();
        router.push('/admin/login');
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/admin/login');
      return;
    }
    cargarTodo();
  }, [cargarTodo, router]);

  // Polling cada 30s para refrescar QR mientras esté en "esperando_qr"
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (whatsapp?.evolution_state === 'esperando_qr') {
      pollRef.current = setInterval(async () => {
        try {
          const r = await adminApi.whatsappQR(params.id);
          if (r.qr?.base64) setQr(r.qr.base64);
          const s = await adminApi.whatsappStatus(params.id);
          if (s.whatsapp?.evolution_state && s.whatsapp.evolution_state !== 'esperando_qr') {
            cargarTodo();
          }
        } catch {}
      }, 30_000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [whatsapp?.evolution_state, params.id, cargarTodo]);

  const handleConectar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      const r = await adminApi.conectarWhatsapp(params.id, numero.trim());
      if (r.qr?.base64) setQr(r.qr.base64);
      await cargarTodo();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDesconectar = async () => {
    if (!confirm('¿Eliminar la instancia de WhatsApp de esta librería?')) return;
    try {
      await adminApi.desconectarWhatsapp(params.id);
      setQr(null);
      await cargarTodo();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const estadoColor = whatsapp?.evolution_state === 'conectado'
    ? 'accent'
    : whatsapp?.evolution_state === 'esperando_qr'
      ? 'warn'
      : 'muted';

  if (loading) {
    return (
      <main className="lqr-wa">
        <div className="lqr-wa__loading"><span className="lqr-spinner" aria-hidden /><p>Cargando…</p></div>
      </main>
    );
  }

  return (
    <main className="lqr-wa">
      <header className="lqr-wa__head">
        <Link href="/admin" className="lqr-wa__back">← Admin</Link>
        <h1 className="lqr-wa__title">WhatsApp · {tenant?.nombre}</h1>
      </header>

      <div className="lqr-wa__container">
        <section className="lqr-wa__card glass">
          {!whatsapp?.evolution_instance_name ? (
            <>
              <h2 className="lqr-wa__h2">Conectar WhatsApp</h2>
              <p className="lqr-wa__sub">Ingresá el número que va a usar esta librería.</p>
              <form onSubmit={handleConectar} className="lqr-wa__form">
                <label className="lqr-wa__label">
                  Número (con código de país)
                  <input
                    type="tel"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="+593999123456"
                    required
                    className="lqr-wa__input"
                  />
                </label>
                <button type="submit" disabled={connecting} className="lqr-wa__cta">
                  {connecting ? 'Conectando…' : 'Crear instancia'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="lqr-wa__status-row">
                <h2 className="lqr-wa__h2">Instancia activa</h2>
                <span className={`lqr-wa__pill lqr-wa__pill--${estadoColor}`}>
                  {labelEstado(whatsapp.evolution_state)}
                </span>
              </div>
              <div className="lqr-wa__meta">
                <div><strong>Instancia</strong> {whatsapp.evolution_instance_name}</div>
                <div><strong>Número</strong> {whatsapp.numero_whatsapp}</div>
              </div>

              {whatsapp.evolution_state === 'esperando_qr' && (
                <div className="lqr-wa__qr-block">
                  <div className="lqr-wa__qr-frame">
                    {qr ? (
                      <img src={`data:image/png;base64,${qr}`} alt="QR de WhatsApp" />
                    ) : (
                      <div className="lqr-wa__qr-empty">Generando QR…</div>
                    )}
                  </div>
                  <p className="lqr-wa__qr-help">
                    Escaneá este QR desde <strong>WhatsApp &gt; Vincular dispositivo</strong>.
                    Se actualiza automáticamente cada 30 segundos.
                  </p>
                </div>
              )}

              {whatsapp.evolution_state === 'conectado' && (
                <div className="lqr-wa__ok glass-strong">
                  <span className="lqr-wa__ok-pulse" aria-hidden />
                  La librería está recibiendo pedidos en su WhatsApp.
                </div>
              )}

              <button onClick={handleDesconectar} className="lqr-wa__danger">Eliminar instancia</button>
            </>
          )}
          {error && <div className="lqr-wa__err">{error}</div>}
        </section>
      </div>

      <style jsx>{`
        .lqr-wa {
          min-height: 100vh;
          padding-bottom: 64px;
        }
        .lqr-wa__head {
          padding: 20px 28px;
          background: var(--glass-bg);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border-bottom: 1px solid var(--glass-stroke);
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .lqr-wa__back {
          font-size: 13px;
          color: var(--text-secondary);
          padding: 8px 12px;
          border-radius: 8px;
        }
        .lqr-wa__back:hover { background: var(--glass-bg); color: var(--text-primary); }
        .lqr-wa__title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .lqr-wa__container {
          max-width: 560px;
          margin: 0 auto;
          padding: 40px 28px 0;
        }
        .lqr-wa__card {
          padding: 32px;
        }
        .lqr-wa__h2 {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }
        .lqr-wa__sub {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }
        .lqr-wa__form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .lqr-wa__label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .lqr-wa__input {
          padding: 14px 16px;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 12px;
          outline: none;
        }
        .lqr-wa__input:focus { border-color: var(--accent); }
        .lqr-wa__cta {
          padding: 16px 24px;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border-radius: 14px;
        }
        .lqr-wa__status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .lqr-wa__pill {
          font-size: 11px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .lqr-wa__pill--accent { background: var(--accent-soft); color: var(--accent); }
        .lqr-wa__pill--warn { background: var(--warn-soft); color: var(--warn); }
        .lqr-wa__pill--muted { background: var(--glass-bg); color: var(--text-muted); }
        .lqr-wa__meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 13px;
          color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
        }
        .lqr-wa__meta strong {
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.08em;
          margin-right: 8px;
        }
        .lqr-wa__qr-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .lqr-wa__qr-frame {
          width: 260px;
          height: 260px;
          background: #fff;
          border-radius: 20px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
        }
        .lqr-wa__qr-frame img { width: 100%; height: 100%; }
        .lqr-wa__qr-empty {
          font-size: 12px;
          color: var(--text-muted);
        }
        .lqr-wa__qr-help {
          font-size: 12px;
          color: var(--text-secondary);
          text-align: center;
          max-width: 280px;
          line-height: 1.5;
        }
        .lqr-wa__ok {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: var(--accent-soft);
          color: var(--accent);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 24px;
        }
        .lqr-wa__ok-pulse {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 0 0 var(--accent);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
          70% { box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); }
        }
        .lqr-wa__danger {
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 500;
          color: var(--danger);
          background: var(--danger-soft);
          border-radius: 12px;
          width: 100%;
        }
        .lqr-wa__err {
          margin-top: 16px;
          padding: 12px 14px;
          background: var(--danger-soft);
          color: var(--danger);
          border-radius: 12px;
          font-size: 13px;
        }
        .lqr-wa__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
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
          .lqr-wa__container { padding: 24px 18px 0; }
          .lqr-wa__card { padding: 24px; }
        }
      `}</style>
    </main>
  );
}

function labelEstado(e: string | undefined): string {
  if (e === 'conectado') return 'Conectado';
  if (e === 'esperando_qr') return 'Esperando QR';
  if (e === 'desconectado') return 'Desconectado';
  return 'Desconocido';
}
