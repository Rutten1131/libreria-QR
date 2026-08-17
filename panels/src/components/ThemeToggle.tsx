'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('libreriasqr-theme') as 'dark' | 'light' | null;
      if (saved) {
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch {}
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('libreriasqr-theme', next); } catch {}
  };

  const isDark = mounted ? theme === 'dark' : true;

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="theme-toggle"
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
    >
      <span className="theme-toggle__icon">
        {isDark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </span>

      <style jsx>{`
        .theme-toggle {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--glass-bg);
          border: 1px solid var(--glass-stroke);
          color: var(--text-secondary);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          cursor: pointer;
          transition: background 180ms var(--ease-out),
                      border-color 180ms var(--ease-out),
                      color 180ms var(--ease-out),
                      transform 180ms var(--ease-out);
        }
        .theme-toggle:hover {
          background: var(--glass-bg-hover);
          border-color: var(--glass-stroke-strong);
          color: var(--text-primary);
          transform: translateY(-1px);
        }
        .theme-toggle:active {
          transform: translateY(0);
        }
        .theme-toggle__icon {
          display: inline-flex;
        }
      `}</style>
    </button>
  );
}
