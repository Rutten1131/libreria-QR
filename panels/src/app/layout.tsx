import './globals.css';

export const metadata = {
  title: 'LibreríaQR — Paneles',
  description: 'Panel de gestión para papelerías',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
