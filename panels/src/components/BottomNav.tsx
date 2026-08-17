'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/panel/pedidos',    label: 'Pedidos',    icon: 'pedidos' },
  { href: '/panel/inventario', label: 'Inventario', icon: 'inventario' },
  { href: '/panel/despachos',  label: 'Despachos',  icon: 'despachos' },
  { href: '/panel/whatsapp',   label: 'WhatsApp',   icon: 'whatsapp' },
] as const;

function Icon({ name, active }: { name: string; active: boolean }) {
  const sw = active ? 2 : 1.6;
  switch (name) {
    case 'pedidos':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 11V7a3 3 0 0 1 6 0v4" />
          <rect x="5" y="11" width="14" height="10" rx="2" />
        </svg>
      );
    case 'inventario':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
      );
    case 'despachos':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function BottomNav() {
  const pathname = usePathname() || '';
  if (pathname.includes('/login')) return null;

  return (
    <nav className="lqr-bottomnav" aria-label="Navegación principal">
      <div className="lqr-bottomnav__inner glass-strong">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`lqr-bnav-item ${active ? 'lqr-bnav-item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="lqr-bnav-item__icon">
                <Icon name={t.icon} active={active} />
              </span>
              <span className="lqr-bnav-item__label">{t.label}</span>
              {active && <span className="lqr-bnav-item__dot" aria-hidden />}
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .lqr-bottomnav {
          display: none;
        }

        @media (max-width: 720px) {
          .lqr-bottomnav {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 100;
            padding: 8px 12px;
            padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
          }

          .lqr-bottomnav__inner {
            display: flex;
            padding: 6px;
            border-radius: 24px;
            background: var(--glass-bg-hover);
            backdrop-filter: blur(48px) saturate(220%);
            -webkit-backdrop-filter: blur(48px) saturate(220%);
            border: 1px solid var(--glass-stroke-strong);
            box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.12);
          }

          .lqr-bnav-item {
            position: relative;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 10px 6px 8px;
            border-radius: 18px;
            color: var(--text-muted);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.02em;
            transition:
              background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-spring);
          }

          .lqr-bnav-item:active {
            transform: scale(0.92);
          }

          .lqr-bnav-item__icon {
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform var(--duration-fast) var(--ease-spring);
          }

          .lqr-bnav-item__label {
            line-height: 1;
          }

          /* Dot indicator debajo del label */
          .lqr-bnav-item__dot {
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: var(--accent);
            box-shadow: var(--accent-glow);
          }

          /* Estado activo */
          .lqr-bnav-item--active {
            background: var(--accent-soft);
            color: var(--accent);
            border: 1px solid var(--accent-border);
          }

          .lqr-bnav-item--active .lqr-bnav-item__icon {
            transform: translateY(-1px) scale(1.06);
          }
        }
      `}</style>
    </nav>
  );
}
