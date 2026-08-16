'use client';

import Header from '@/components/Header';
import { useState } from 'react';

const PRODUCTOS_MOCK = [
  { id: 'p1', nombre: 'Cuaderno college', familia: 'cuaderno', precio: 2.50, disponible: true },
  { id: 'p2', nombre: 'Cuaderno Universitarios', familia: 'cuaderno', precio: 3.00, disponible: true },
  { id: 'p3', nombre: 'Lápiz 2B', familia: 'lapiz', precio: 0.50, disponible: true },
  { id: 'p4', nombre: 'Lápiz HB', familia: 'lapiz', precio: 0.40, disponible: true },
  { id: 'p5', nombre: 'Borrador blanco', familia: 'borrador', precio: 0.30, disponible: true },
  { id: 'p6', nombre: 'Regla 30cm', familia: 'regla', precio: 0.80, disponible: true },
  { id: 'p7', nombre: 'Tijeras escolar', familia: 'tijeras', precio: 1.20, disponible: true },
  { id: 'p8', nombre: 'Pegamento barra', familia: 'pegamento', precio: 0.70, disponible: true },
  { id: 'p9', nombre: 'Sacapuntas metálico', familia: 'sacapuntas', precio: 0.60, disponible: true },
  { id: 'p10', nombre: 'Compás Faber', familia: 'compas', precio: 2.00, disponible: true },
  { id: 'p11', nombre: 'Compás Norma', familia: 'compas', precio: 1.80, disponible: true },
  { id: 'p12', nombre: 'Transportador 180°', familia: 'transportador', precio: 0.50, disponible: true },
  { id: 'p13', nombre: 'Escuadra 45°', familia: 'escuadra', precio: 0.60, disponible: true },
  { id: 'p14', nombre: 'Cartulina blanca', familia: 'cartulina', precio: 0.25, disponible: true },
  { id: 'p15', nombre: 'Papel craft', familia: 'papel', precio: 0.15, disponible: true },
  { id: 'p16', nombre: 'Resaltador amarillo', familia: 'resaltador', precio: 0.80, disponible: true },
  { id: 'p17', nombre: 'Corrector blanco', familia: 'corrector', precio: 1.00, disponible: true },
  { id: 'p18', nombre: 'Agenda 2026', familia: 'agenda', precio: 5.00, disponible: true },
  { id: 'p19', nombre: 'Folder manila', familia: 'folder', precio: 0.20, disponible: true },
  { id: 'p20', nombre: 'Bolso escolar', familia: 'bolso', precio: 8.00, disponible: false },
];

export default function InventarioPage() {
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState(PRODUCTOS_MOCK);

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const toggleDisponible = (id: string) => {
    setProductos(prev =>
      prev.map(p => p.id === id ? { ...p, disponible: !p.disponible } : p)
    );
  };

  return (
    <>
      <Header />
      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Inventario — Librería El Sol</h2>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>{filtrados.length} productos</span>
        </div>

        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={searchStyle}
        />

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', background: '#fff' }}>
          <thead>
            <tr style={{ background: '#f0f0f5', textAlign: 'left' }}>
              <th style={thStyle}>Producto</th>
              <th style={thStyle}>Familia</th>
              <th style={thStyle}>Precio</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{p.nombre}</td>
                <td style={tdStyle}><span style={tagStyle}>{p.familia}</span></td>
                <td style={tdStyle}>${p.precio.toFixed(2)}</td>
                <td style={tdStyle}>
                  <span style={{ ...badgeStyle, background: p.disponible ? '#d4edda' : '#f8d7da', color: p.disponible ? '#155724' : '#721c24' }}>
                    {p.disponible ? 'Disponible' : 'Agotado'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => toggleDisponible(p.id)} style={btnStyle}>
                    {p.disponible ? 'Marcar agotado' : 'Marcar disponible'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}

const searchStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: '1rem',
};

const thStyle: React.CSSProperties = { padding: '0.7rem', fontWeight: '600', fontSize: '0.85rem' };
const tdStyle: React.CSSProperties = { padding: '0.7rem', fontSize: '0.9rem' };

const tagStyle: React.CSSProperties = {
  background: '#e8e8f0',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.8rem',
};

const badgeStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: '12px',
  fontSize: '0.8rem',
  fontWeight: '500',
};

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid #1a1a2e',
  borderRadius: '4px',
  background: 'transparent',
  color: '#1a1a2e',
  cursor: 'pointer',
  fontSize: '0.8rem',
};
