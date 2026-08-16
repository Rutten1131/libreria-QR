'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/panel/pedidos', label: 'Pedidos', icon: 'pedidos' },
  { href: '/panel/inventario', label: 'Inventario', icon: 'inventario' },
  { href: '/panel/despachos', label: 'Despachos', icon: 'despachos' },
] as const;

function Icon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? 'currentColor' : 'currentColor';
  const sw = 1.6;
  switch (name) {
    case 'pedidos':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 11V7a3 3 0 0 1 6 0v4" />
          <rect x="5" y="11" width="14" height="10" rx="2" />
        </svg>
      );
    case 'inventario':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
      );
    case 'despachos':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function BottomNav() {
  const pathname = usePathname() || '';

  return (
    <nav className="lqr-bottomnav" aria-label="Navegación principal">
      <div className="lqr-bottomnav__inner glass-strong">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`lqr-bottomnav__item ${active ? 'lqr-bottomnav__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={t.icon} active={active} />
              <span>{t.label}</span>
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
            bottom: 14px;
            left: 14px;
            right: 14px;
            z-index: 50;
          }
          .lqr-bottomnav__inner {
            display: flex;
            padding: 6px;
            border-radius: 22px;
          }
          .lqr-bottomnav__item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 10px 6px;
            border-radius: 16px;
            color: var(--text-muted);
            font-size: 11px;
            font-weight: 500;
            transition: background 180ms var(--ease-out), color 180ms var(--ease-out);
          }
          .lqr-bottomnav__item--active {
            background: var(--accent-soft);
            color: var(--accent);
          }
        }
      `}</style>
    </nav>
  );
}
