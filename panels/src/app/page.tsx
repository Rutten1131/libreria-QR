import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h2>Bienvenido a LibreríaQR</h2>
      <p style={{ marginTop: '0.5rem', color: '#666' }}>
        Seleccione un panel para gestionar la papelería.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/panel/inventario" style={{ display: 'block', padding: '1.2rem', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', textDecoration: 'none', color: '#222', minWidth: '160px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <strong>Inventario</strong>
          <br />
          <small>Ver y actualizar productos</small>
        </Link>
        <Link href="/panel/pedidos" style={{ display: 'block', padding: '1.2rem', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', textDecoration: 'none', color: '#222', minWidth: '160px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <strong>Pedidos</strong>
          <br />
          <small>Tablero de 3 estados</small>
        </Link>
        <Link href="/panel/despachos" style={{ display: 'block', padding: '1.2rem', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', textDecoration: 'none', color: '#222', minWidth: '160px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <strong>Despachos</strong>
          <br />
          <small>Comandas del equipo</small>
        </Link>
      </div>
    </main>
  );
}
