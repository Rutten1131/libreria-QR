'use client';

import { useEffect, useState } from 'react';

/**
 * Tenant demo. En produccion este id viene del link firmado
 * (PRD A.6: "acceso via enlace enviado por WhatsApp, sin password").
 */
const DEMO_TENANT_ID = 'libreria_el_sol';
const STORAGE_KEY = 'libreriasqr-tenant';

export function useTenant(): string {
  const [tenant] = useState<string>(DEMO_TENANT_ID);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Solo lectura — no exponemos setter todavia porque el PRD
        // dice que el tenant se setea una sola vez por el QR.
      }
    } catch {}
  }, []);
  return tenant;
}
