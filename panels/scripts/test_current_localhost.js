async function testCurrentLocalhost() {
  try {
    const res = await fetch('http://localhost:3000/api/tenants/libreria_prueba/whatsapp/status');
    const data = await res.json();
    console.log('Respuesta de localhost:3000:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Error conectando a localhost:3000:', e.message);
  }
}

testCurrentLocalhost();
