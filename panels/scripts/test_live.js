async function testLive() {
  const res = await fetch('http://localhost:3000/api/tenants/libreria_prueba/whatsapp/status');
  console.log('Status real:', await res.json());
}
testLive();
