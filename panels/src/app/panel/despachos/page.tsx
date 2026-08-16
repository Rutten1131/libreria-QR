'use client';

import Header from '@/components/Header';

const COMANDAS_MOCK = [
  {
    id: 'ped_003',
    cliente: 'Ana López',
    direccion: 'Av. Amazonas 1234, Quito',
    items: ['2x Cuaderno college', '1x Agenda 2026'],
    total: 10.00,
    despachador: null,
    estado: 'pendiente',
    hora: '14:30',
  },
  {
    id: 'ped_001',
    cliente: 'María González',
    direccion: 'Av. España 567, Quito',
    items: ['3x Cuaderno college', '5x Lápiz 2B'],
    total: 10.00,
    despachador: 'Juan',
    estado: 'tomado',
    hora: '14:45',
  },
];

export default function DespachosPage() {
  const tomarComanda = (id: string) => {
    console.log('Tomar comanda:', id);
  };

  return (
    <>
      <Header />
      <main>
        <h2>Despachos — Librería El Sol</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Cada pedido confirmado aparece como comanda. Quien lo toma queda responsable del despacho.
        </p>
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {COMANDAS_MOCK.map(comanda => (
            <div key={comanda.id} style={{ background: '#fff', borderRadius: '8px', padding: '1rem', border: '2px solid #e0e0e0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{comanda.cliente}</strong>
                  <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.2rem' }}>{comanda.direccion}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>{comanda.hora}</div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginTop: '0.2rem' }}>${comanda.total.toFixed(2)}</div>
                </div>
              </div>
              <div style={{ marginTop: '0.6rem', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px' }}>
                {comanda.items.map((item, i) => (
                  <div key={i} style={{ fontSize: '0.9rem' }}>• {item}</div>
                ))}
              </div>
              <div style={{ marginTop: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#888' }}>
                  {comanda.despachador ? `Tomado por: ${comanda.despachador}` : 'Sin tomar'}
                </span>
                {!comanda.despachador && (
                  <button onClick={() => tomarComanda(comanda.id)} style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    Tomar comanda
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
