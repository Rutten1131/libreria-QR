'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isLoginPage = pathname.includes('/login');

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="lqr-shell">
      <Header />
      {/* padding-top compensa el header fixed */}
      <div className="lqr-shell__content lqr-page">{children}</div>
      <BottomNav />
    </div>
  );
}
