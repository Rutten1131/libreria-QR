'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { adminApi, clearToken, getToken } from '@/lib/adminApi';

interface Tenant {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/admin/login');
      return;
    }
    adminApi
      .listarTenants()
      .then((r) => setTenants(r.tenants ?? []))
      .catch((e) => {
        if (String(e.message).includes('401') || String(e.message).includes('403')) {
          clearToken();
          router.push('/admin/login');
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await adminApi.crearTenant({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
      });
      setTenants((prev) => [r.tenant, ...prev]);
      setShowNew(false);
      setForm({ nombre: '', telefono: '', direccion: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push('/admin/login');
  };

  return (
    <main className="lqr-admin">
      <header className="lqr-admin__head">
        <div className="lqr-admin__brand">
          <div className="lqr-admin__logo" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h18M3 12h18M3 17h12" />
            </svg>
          </div>
          <div>
            <div className="lqr-admin__name">LibreríaQR</div>
            <div className="lqr-admin__role">Admin</div>
          </div>
        </div>
        <button onClick={handleLogout} className="lqr-admin__logout">Cerrar sesión</button>
      </header>

      <div className="lqr-admin__container">
        <section className="lqr-admin__title-row">
          <div>
            <h1 className="lqr-admin__title">Librerías</h1>
            <p className="lqr-admin__sub">
              {loading ? 'Cargando…' : `${tenants.length} ${tenants.length === 1 ? 'librería' : 'librerías'}`}
            </p>
          </div>
          <button onClick={() => setShowNew(true)} className="lqr-admin__new">
            + Nueva librería
          </button>
        </section>

        {error && <div className="lqr-admin__err">{error}</div>}

        {showNew && (
          <motion.form
            className="lqr-admin__form glass"
            onSubmit={handleCreate}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="lqr-admin__form-title">Nueva librería</h2>
            <label className="lqr-admin__label">
              Nombre comercial *
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Librería El Sol"
                required
                autoFocus
                className="lqr-admin__input"
              />
            </label>
            <label className="lqr-admin__label">
              Teléfono
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+593999123456"
                className="lqr-admin__input"
              />
            </label>
            <label className="lqr-admin__label">
              Dirección
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Av. Amazonas 1234, Quito"
                className="lqr-admin__input"
              />
            </label>
            <div className="lqr-admin__form-actions">
              <button type="button" onClick={() => setShowNew(false)} className="lqr-admin__btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className="lqr-admin__btn-primary">
                {submitting ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </motion.form>
        )}

        {loading ? (
          <div className="lqr-admin__loading">
            <span className="lqr-spinner" aria-hidden />
            <p>Cargando librerías…</p>
          </div>
        ) : tenants.length === 0 ? (
          <div className="lqr-admin__empty">
            <p>No hay librerías todavía.</p>
            <button onClick={() => setShowNew(true)} className="lqr-admin__btn-primary">
              Crear la primera
            </button>
          </div>
        ) : (
          <ul className="lqr-admin__list">
            {tenants.map((t, i) => (
              <motion.li
                key={t.id}
                className="lqr-admin__row glass"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <div className="lqr-admin__row-main">
                  <strong className="lqr-admin__row-name">{t.nombre}</strong>
                  <span className="lqr-admin__row-meta">
                    {t.telefono || 'sin teléfono'} · {t.direccion || 'sin dirección'}
                  </span>
                </div>
                <div className="lqr-admin__row-actions">
                  <Link href={`/admin/tenants/${t.id}`} className="lqr-admin__btn-tiny">
                    Detalle
                  </Link>
                  <Link href={`/admin/tenants/${t.id}/whatsapp`} className="lqr-admin__btn-tiny lqr-admin__btn-tiny--accent">
                    WhatsApp
                  </Link>
                  <Link href={`/panel/pedidos?tenantId=${t.id}`} className="lqr-admin__btn-tiny">
                    Ir al panel
                  </Link>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <style jsx>{`
        .lqr-admin {
          min-height: 100vh;
          padding-bottom: 64px;
        }
        .lqr-admin__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 28px;
          background: var(--glass-bg);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border-bottom: 1px solid var(--glass-stroke);
        }
        .lqr-admin__brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lqr-admin__logo {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: var(--accent-soft);
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .lqr-admin__name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .lqr-admin__role {
          font-size: 10px;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .lqr-admin__logout {
          padding: 8px 14px;
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 10px;
          font-weight: 500;
        }
        .lqr-admin__container {
          max-width: 920px;
          margin: 0 auto;
          padding: 40px 28px 0;
        }
        .lqr-admin__title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 28px;
          gap: 16px;
        }
        .lqr-admin__title {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          line-height: 1.1;
        }
        .lqr-admin__sub {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .lqr-admin__new {
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border-radius: 12px;
          white-space: nowrap;
        }
        .lqr-admin__err {
          margin-bottom: 16px;
          padding: 12px 14px;
          background: var(--danger-soft);
          color: var(--danger);
          border-radius: 12px;
          font-size: 13px;
        }
        .lqr-admin__form {
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .lqr-admin__form-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
          letter-spacing: -0.01em;
        }
        .lqr-admin__label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .lqr-admin__input {
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 10px;
          outline: none;
        }
        .lqr-admin__input:focus {
          border-color: var(--accent);
        }
        .lqr-admin__form-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 8px;
        }
        .lqr-admin__btn-primary {
          padding: 12px 22px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border-radius: 12px;
        }
        .lqr-admin__btn-secondary {
          padding: 12px 22px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 12px;
        }
        .lqr-admin__btn-secondary:hover { color: var(--text-primary); }

        .lqr-admin__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lqr-admin__row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 22px;
        }
        .lqr-admin__row-main {
          flex: 1;
          min-width: 0;
        }
        .lqr-admin__row-name {
          display: block;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
          letter-spacing: -0.01em;
        }
        .lqr-admin__row-meta {
          font-size: 12px;
          color: var(--text-muted);
        }
        .lqr-admin__row-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .lqr-admin__btn-tiny {
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 8px;
          transition: color 180ms var(--ease-out);
        }
        .lqr-admin__btn-tiny:hover { color: var(--text-primary); }
        .lqr-admin__btn-tiny--accent {
          background: var(--accent-soft);
          color: var(--accent);
          border-color: transparent;
        }
        .lqr-admin__empty {
          padding: 60px 0;
          text-align: center;
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-xl);
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .lqr-admin__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 0;
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
          .lqr-admin__container { padding: 24px 18px 0; }
          .lqr-admin__title { font-size: 26px; }
          .lqr-admin__row-actions { flex-wrap: wrap; }
        }
      `}</style>
    </main>
  );
}
