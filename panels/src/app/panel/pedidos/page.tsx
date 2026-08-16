'use client';

import Header from '@/components/Header';

const PEDIDOS_MOCK = {
  necesita_revision: [
    {
      id: 'ped_001',
      cliente: 'María González',
      telefono: '+593999123456',
      items: [
        { nombre: 'Cuaderno college', cantidad: 3, precio: 2.50 },
        { nombre: 'Lápiz 2B', cantidad: 5, precio: 0.50 },
      ],
      total: 10.00,
      accion: 'Verificar pago recibido',
      hace: '12 min',
    },
    {
      id: 'ped_002',
      cliente: 'Carlos Pérez',
      telefono: '+593988765432',
      items: [
        { nombre: 'Compás Faber', cantidad: 1, precio: 2.00 },
        { nombre: 'Regla 30cm', cantidad: 1, precio: 0.80 },
      ],
      total: 2.80,
      accion: 'Confirmar variante',
      hace: '25 min',
    },
  ],
  confirmado: [
    {
      id: 'ped_003',
      cliente: 'Ana López',
      telefono: '+593977111222',
      items: [
        { nombre: 'Cuaderno college', cantidad: 2, precio: 2.50 },
        { nombre: 'Agenda 2026', cantidad: 1, precio: 5.00 },
      ],
      total: 10.00,
      accion: 'Separar pedido',
      hace: '1h',
    },
  ],
  despachado: [
    {
      id: 'ped_004',
      cliente: 'Jorge Rivera',
      telefono: '+593966333444',
      items: [
        { nombre: 'Tijeras escolar', cantidad: 2, precio: 1.20 },
        { nombre: 'Pegamento barra', cantidad: 3, precio: 0.70 },
      ],
      total: 4.50,
      accion: '',
      hace: '3h',
    },
  ],
};

const columnas = [
  { key: 'necesita_revision', label: 'Necesita revisión', color: '#fff3cd' },
  { key: 'confirmado', label: 'Confirmado / Pagado', color: '#d4edda' },
  { key: 'despachado', label: 'Despachado', color: '#cce5ff' },
] as const;

export default function PedidosPage() {
  return (
    <>
      <Header />
      <main>
        <h2>Pedidos — Librería El Sol</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          {columnas.map(col => (
            <div key={col.key} style={{ background: col.color, borderRadius: '8px', padding: '0.8rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.4rem' }}>
                {col.label} ({PEDIDOS_MOCK[col.key].length})
              </h3>
              {PEDIDOS_MOCK[col.key].map(pedido => (
                <div key={pedido.id} style={{ background: '#fff', borderRadius: '6px', padding: '0.8rem', marginBottom: '0.6rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong>{pedido.cliente}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{pedido.hace}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>{pedido.telefono}</div>
                  <ul style={{ fontSize: '0.82rem', marginTop: '0.4rem', paddingLeft: '1.2rem' }}>
                    {pedido.items.map((item, i) => (
                      <li key={i}>{item.cantidad}x {item.nombre}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    Total: ${pedido.total.toFixed(2)}
                  </div>
                  {pedido.accion && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ background: '#1a1a2e', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                        {pedido.accion}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
