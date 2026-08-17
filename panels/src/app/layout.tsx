import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'LibreríaQR — Paneles',
  description: 'Panel de gestión para papelerías y librerías',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0e1a',
};

/**
 * Script anti-FOOC: corre antes del primer paint para aplicar el tema
 * guardado en localStorage (default: oscuro).
 */
const themeBootstrap = `
(function() {
  try {
    var t = localStorage.getItem('libreriasqr-theme');
    if (!t) t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Plus Jakarta Sans — cargado vía @import en globals.css */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
