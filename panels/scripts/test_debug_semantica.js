const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  process.env[k?.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testGroq() {
  const { interpretarIntencionSemantica } = require('../src/server/adapters/iaAdapter');
  
  console.log('Testing "necesito un cuaderno":');
  const res = await interpretarIntencionSemantica('necesito un cuaderno', '', []);
  console.log('Output:', res);
}

testGroq();
