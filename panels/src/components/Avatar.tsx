'use client';

import { useMemo } from 'react';

/**
 * Avatar con iniciales + gradiente determinístico.
 * Sin dependencias externas. Extrae 1-2 letras del nombre.
 * El gradiente se elige por hash del nombre — mismo cliente = mismo color.
 */

const GRADIENTES = [
  ['#22c55e', '#0ea5e9'],   // emerald → sky
  ['#f59e0b', '#ef4444'],   // amber → red
  ['#8b5cf6', '#ec4899'],   // violet → pink
  ['#06b6d4', '#3b82f6'],   // cyan → blue
  ['#10b981', '#6366f1'],   // emerald → indigo
  ['#f97316', '#a855f7'],   // orange → purple
  ['#14b8a6', '#0ea5e9'],   // teal → sky
  ['#eab308', '#f43f5e'],   // yellow → rose
];

function extraerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function hash(nombre: string): number {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) {
    h = (h * 31 + nombre.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function Avatar({
  nombre,
  size = 40,
  online,
}: {
  nombre: string;
  size?: number;
  online?: boolean;
}) {
  const iniciales = useMemo(() => extraerIniciales(nombre), [nombre]);
  const [from, to] = useMemo(
    () => GRADIENTES[hash(nombre) % GRADIENTES.length],
    [nombre]
  );

  return (
    <span
      className="lqr-avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: Math.round(size * 0.36),
      }}
      aria-label={nombre}
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
          color: #fff;
          font-weight: 600;
          letter-spacing: 0;
          flex-shrink: 0;
          box-shadow: 0 0 0 2px var(--bg-base);
        }
        .lqr-avatar__text {
          font-feature-settings: 'ss01';
        }
        .lqr-avatar__online {
          position: absolute;
          right: -1px;
          bottom: -1px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--bg-base);
        }
      `}</style>
    </span>
  );
}
