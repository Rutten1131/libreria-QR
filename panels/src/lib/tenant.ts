'use client';

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'libreriasqr-tenant';
const STORAGE_NAME_KEY = 'libreriasqr-tenant-nombre';

export interface TenantInfo {
  id: string;
  nombre: string;
}

export function getStoredTenant(): TenantInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    const nombre = localStorage.getItem(STORAGE_NAME_KEY) || id || '';
    if (id) return { id, nombre };
  } catch {}
  return null;
}

export function setStoredTenant(id: string, nombre?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
    if (nombre) {
      localStorage.setItem(STORAGE_NAME_KEY, nombre);
    } else {
      localStorage.setItem(STORAGE_NAME_KEY, id);
    }
  } catch {}
}

export function clearStoredTenant(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_NAME_KEY);
  } catch {}
}

export function useTenant(): string {
  const [tenant, setTenant] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || '';
    }
    return '';
  });

  useEffect(() => {
    const stored = getStoredTenant();
    if (stored?.id && stored.id !== tenant) {
      setTenant(stored.id);
    }
  }, [tenant]);

  return tenant;
}

export function useTenantContext() {
  const [tenant, setTenantState] = useState<TenantInfo | null>(() => getStoredTenant());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = getStoredTenant();
    if (stored?.id) {
      if (stored.id !== tenant?.id || stored.nombre !== tenant?.nombre) {
        setTenantState(stored);
      }
      // Sincronizar nombre real desde la BD si difiere del almacenamiento local
      fetch(`/api/tenants/${stored.id}`)
        .then((r) => r.json())
        .then((d) => {
          const freshNombre = d?.tenant?.nombre;
          if (freshNombre && freshNombre !== stored.nombre) {
            setStoredTenant(stored.id, freshNombre);
            setTenantState({ id: stored.id, nombre: freshNombre });
          }
        })
        .catch(() => {});
    }
  }, [tenant?.id, tenant?.nombre]);

  const login = useCallback((id: string, nombre?: string) => {
    setStoredTenant(id, nombre);
    setTenantState({ id, nombre: nombre || id });
  }, []);

  const logout = useCallback(() => {
    clearStoredTenant();
    setTenantState(null);
  }, []);

  return {
    tenant,
    tenantId: tenant?.id || '',
    tenantNombre: tenant?.nombre || '',
    loading,
    login,
    logout,
  };
}
