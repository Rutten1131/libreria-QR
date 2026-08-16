'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const TABS = [
  { href: '/panel/pedidos', label: 'Pedidos', icon: 'pedidos' },
  { href: '/panel/inventario', label: 'Inventario', icon: 'inventario' },
  { href: '/panel/despachos', label: 'Despachos', icon: 'despachos' },
] as const;

export default function Header() {
  const pathname = usePathname() || '';

  return (
    <header className="lqr-header">
      <div className="lqr-header__brand">
        <div className="lqr-header__logo" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h18M3 12h18M3 17h12" />
          </svg>
        </div>
        <div className="lqr-header__title">
          <span className="lqr-header__name">LibreríaQR</span>
          <span className="lqr-header__sub">Panel</span>
        </div>
      </div>

      <nav className="lqr-header__nav" aria-label="Secciones">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`lqr-tab ${active ? 'lqr-tab--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="lqr-header__right">
        <ThemeToggle />
      </div>

      <style jsx>{`
        .lqr-header {
          position: sticky;
          top: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
          background: var(--glass-bg);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-bottom: 1px solid var(--glass-stroke);
        }
        .lqr-header__brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lqr-header__logo {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: var(--accent-soft);
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .lqr-header__title {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .lqr-header__name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        .lqr-header__sub {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .lqr-header__nav {
          display: flex;
          gap: 4px;
          margin-left: auto;
          padding: 4px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: 14px;
        }
        .lqr-tab {
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          border-radius: 10px;
          transition: background 180ms var(--ease-out), color 180ms var(--ease-out);
        }
        .lqr-tab:hover { color: var(--text-primary); }
        .lqr-tab--active {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }
        .lqr-header__right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Mobile: tabs abajo mas espacioso, header mas compacto */
        @media (max-width: 720px) {
          .lqr-header {
            padding: 10px 14px;
            gap: 10px;
          }
          .lqr-header__logo { width: 34px; height: 34px; }
          .lqr-header__sub { display: none; }
          .lqr-header__nav {
            margin-left: 0;
            flex: 1;
            justify-content: space-between;
          }
          .lqr-tab {
            padding: 8px 10px;
            font-size: 12px;
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </header>
  );
}
