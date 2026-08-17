'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredTenant } from '@/lib/tenant';

export default function PanelRootPage() {
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredTenant();
    if (stored?.id) {
      router.replace('/panel/pedidos');
    } else {
      router.replace('/panel/login');
    }
  }, [router]);

  return (
    <div className="lqr-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="lqr-spinner" aria-hidden />
    </div>
  );
}
