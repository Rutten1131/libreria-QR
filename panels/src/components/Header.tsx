'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const TABS = [
  { href: '/panel/pedidos',    label: 'Pedidos',    icon: 'pedidos' },
  { href: '/panel/inventario', label: 'Inventario', icon: 'inventario' },
  { href: '/panel/despachos',  label: 'Despachos',  icon: 'despachos' },
  { href: '/panel/whatsapp',   label: 'WhatsApp',   icon: 'whatsapp' },
] as const;

function TabIcon({ name }: { name: string }) {
  switch (name) {
    case 'pedidos':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 11V7a3 3 0 0 1 6 0v4" />
          <rect x="5" y="11" width="14" height="10" rx="2" />
        </svg>
      );
    case 'inventario':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
      );
    case 'despachos':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    default:
      return null;
  }
}

import { useState, useEffect } from 'react';
import { useTenantContext } from '@/lib/tenant';
import { useRouter } from 'next/navigation';

export default function Header() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { tenantNombre, tenantId, logout } = useTenantContext();
  const [mounted, setMounted] = useState(false);
  const currentTab = TABS.find((t) => pathname.startsWith(t.href));

  useEffect(() => {
    setMounted(true);
  }, []);

  // No renderizar header en páginas de login
  if (pathname.includes('/login')) return null;

  const handleLogout = () => {
    logout();
    router.push('/panel/login');
  };

  const displayName = mounted && tenantNombre ? tenantNombre : 'LibreríaQR';
  const displaySub = mounted && tenantId ? `ID: ${tenantId}` : 'Panel de Papelería';

  return (
    <div className="lqr-header-wrap">
      <header className="lqr-header glass-strong">
        {/* Brand */}
        <Link href="/panel/pedidos" className="lqr-brand" aria-label="LibreríaQR Inicio">
          <div className="lqr-brand__badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              {/* Libro abierto estilizado */}
              <path
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M8 7h8M8 11h5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
              />
            </svg>
          </div>
          <div className="lqr-brand__info">
            <span className="lqr-brand__name">{displayName}</span>
            <span className="lqr-brand__sub">{displaySub}</span>
          </div>
        </Link>

        {/* Nav — desktop pill container */}
        <nav className="lqr-nav" aria-label="Navegación principal">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`lqr-tab ${active ? 'lqr-tab--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <TabIcon name={t.icon} />
                <span>{t.label}</span>
                {active && <span className="lqr-tab__dot" aria-hidden />}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="lqr-actions">
          {mounted && tenantId && (
            <button
              onClick={handleLogout}
              className="lqr-switch-btn"
              title="Cambiar de librería"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Salir</span>
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <style jsx>{`
        .lqr-header-wrap {
          position: fixed;
          top: 14px;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 0 20px;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }

        .lqr-header {
          width: 100%;
          max-width: 1320px;
          height: var(--header-h);
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: var(--radius-xl);
          pointer-events: auto;
        }

        /* Brand */
        .lqr-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .lqr-brand__badge {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--accent-soft) 0%, rgba(34, 197, 94, 0.28) 100%);
          border: 1px solid var(--accent-border);
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: var(--accent-glow), var(--glass-specular);
        }
        .lqr-brand__info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .lqr-brand__name {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .lqr-brand__sub {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }

        /* Nav desktop */
        .lqr-nav {
          display: flex;
          gap: 10px;
          padding: 6px 10px;
          background: var(--glass-bg-deep);
          border: 1px solid var(--glass-stroke-strong);
          box-shadow: var(--glass-specular);
          border-radius: var(--radius-full);
        }
        .lqr-tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-secondary);
          border-radius: var(--radius-full);
          letter-spacing: -0.01em;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-tab:hover:not(.lqr-tab--active) {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.08);
        }
        .lqr-tab--active {
          background: var(--accent-soft);
          color: var(--accent);
          border: 1px solid var(--accent-border);
          box-shadow: var(--accent-glow), var(--glass-specular);
        }
        .lqr-tab__dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: var(--accent-glow);
        }

        /* Actions */
        .lqr-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lqr-switch-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          border-radius: var(--radius-full);
          transition: all var(--duration-fast) var(--ease-out);
        }
        .lqr-switch-btn:hover {
          color: var(--danger);
          background: var(--danger-soft);
          border-color: var(--danger-border);
        }

        .lqr-section-tag {
          display: none;
          font-size: 12px;
          font-weight: 700;
          color: var(--accent);
          background: var(--accent-soft);
          border: 1px solid var(--accent-border);
          padding: 4px 12px;
          border-radius: var(--radius-full);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .lqr-header-wrap {
            top: 10px;
            padding: 0 12px;
          }
          .lqr-header {
            padding: 0 16px;
            height: 60px;
          }
          .lqr-nav {
            display: none;
          }
          .lqr-section-tag {
            display: inline-block;
          }
          .lqr-brand__sub {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
