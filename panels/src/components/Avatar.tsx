'use client';

import { useMemo } from 'react';

/**
 * Avatar monochromático estilo visionOS.
 * Fondo: glass translúcido. Texto: blanco. Sin gradientes de color saturado.
 */

function extraerIniciales(nombre?: string | null): string {
  if (!nombre || typeof nombre !== 'string') return '?';
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function Avatar({
  nombre,
  size = 40,
  online,
}: {
  nombre?: string | null;
  size?: number;
  online?: boolean;
}) {
  const iniciales = useMemo(() => extraerIniciales(nombre), [nombre]);

  return (
    <span
      className="lqr-avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
      }}
      aria-label={nombre || undefined}
    >
      <span className="lqr-avatar__text">{iniciales}</span>
      {online && <span className="lqr-avatar__online" aria-hidden />}

      <style jsx>{`
        .lqr-avatar {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.90);
          font-weight: 700;
          letter-spacing: 0;
          flex-shrink: 0;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .lqr-avatar__text {
          font-feature-settings: 'ss01';
        }
        .lqr-avatar__online {
          position: absolute;
          right: 0px;
          bottom: 0px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.80);
          border: 2px solid rgba(0,0,0,0.3);
        }
      `}</style>
    </span>
  );
}
