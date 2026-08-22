async function testNow() {
  const res = await fetch('http://localhost:3000/api/tenants/libreria_prueba/whatsapp/status');
  console.log('Response status:', res.status);
  console.log('JSON:', await res.json());
}
testNow();
