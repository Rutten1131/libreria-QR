'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header>
      <h1>📚 LibreríaQR</h1>
      <nav>
        <Link href="/" className={pathname === '/' ? 'active' : ''}>Inicio</Link>
        <Link href="/panel/inventario" className={pathname?.includes('/inventario') ? 'active' : ''}>Inventario</Link>
        <Link href="/panel/pedidos" className={pathname?.includes('/pedidos') ? 'active' : ''}>Pedidos</Link>
        <Link href="/panel/despachos" className={pathname?.includes('/despachos') ? 'active' : ''}>Despachos</Link>
      </nav>
    </header>
  );
}
