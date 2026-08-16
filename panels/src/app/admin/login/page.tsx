'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { adminApi, setToken } from '@/lib/adminApi';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<'email' | 'token'>('email');
  const [email, setEmail] = useState('');
  const [token, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await adminApi.enviarMagicLink(email);
      setInfo('Te enviamos un magic link. Revisá tu email y pegá el código de 6 dígitos.');
      setPaso('token');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await adminApi.verificarOTP(email, token);
      setToken(r.access_token);
      router.push('/admin');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="lqr-auth">
      <motion.section
        className="lqr-auth__card glass"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href="/" className="lqr-auth__brand">
          <div className="lqr-auth__logo" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h18M3 12h18M3 17h12" />
            </svg>
          </div>
          <span>LibreríaQR</span>
        </Link>

        <h1 className="lqr-auth__title">Acceso operador</h1>
        <p className="lqr-auth__sub">
          {paso === 'email'
            ? 'Ingresá tu email para recibir un magic link.'
            : 'Pegá el código que te enviamos.'}
        </p>

        {paso === 'email' ? (
          <form onSubmit={handleMagicLink} className="lqr-auth__form">
            <label className="lqr-auth__label">
              Email
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="lqr-auth__input"
              />
            </label>
            <button type="submit" disabled={loading} className="lqr-auth__cta">
              {loading ? 'Enviando…' : 'Enviar magic link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="lqr-auth__form">
            <label className="lqr-auth__label">
              Código de 6 dígitos
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={token}
                onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, ''))}
                required
                className="lqr-auth__input"
              />
            </label>
            <button type="submit" disabled={loading || token.length !== 6} className="lqr-auth__cta">
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => { setPaso('email'); setTokenInput(''); }}
              className="lqr-auth__back"
            >
              ← Cambiar email
            </button>
          </form>
        )}

        {info && <div className="lqr-auth__info">{info}</div>}
        {error && <div className="lqr-auth__err">{error}</div>}
      </motion.section>

      <style jsx>{`
        .lqr-auth {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .lqr-auth__card {
          width: 100%;
          max-width: 420px;
          padding: 36px 32px;
        }
        .lqr-auth__brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 28px;
          letter-spacing: -0.01em;
        }
        .lqr-auth__logo {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: var(--accent-soft);
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .lqr-auth__title {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          margin-bottom: 6px;
          line-height: 1.1;
        }
        .lqr-auth__sub {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }
        .lqr-auth__form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .lqr-auth__label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .lqr-auth__input {
          padding: 14px 16px;
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 12px;
          outline: none;
          transition: border-color 180ms var(--ease-out);
          letter-spacing: 0.02em;
        }
        .lqr-auth__input:focus {
          border-color: var(--accent);
        }
        .lqr-auth__cta {
          padding: 16px 24px;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border-radius: 14px;
          margin-top: 8px;
          transition: transform 180ms var(--ease-out), opacity 180ms var(--ease-out);
        }
        .lqr-auth__cta:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .lqr-auth__cta:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lqr-auth__back {
          padding: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .lqr-auth__info {
          margin-top: 16px;
          padding: 12px 14px;
          background: var(--info-soft);
          color: var(--info);
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }
        .lqr-auth__err {
          margin-top: 16px;
          padding: 12px 14px;
          background: var(--danger-soft);
          color: var(--danger);
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }
        @media (max-width: 480px) {
          .lqr-auth__card { padding: 28px 22px; }
          .lqr-auth__title { font-size: 22px; }
        }
      `}</style>
    </main>
  );
}
