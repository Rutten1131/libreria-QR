const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testStatusRouteDirectly() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('1. Sincronizando estado real de Evolution a Supabase...');
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;
  const resFetch = await fetch(`${baseUrl}/instance/fetchInstances`, { headers: { 'apikey': apiKey } });
  const list = await resFetch.json();
  const inst = list.find(i => i.name === 'qr_libreria_prueba');
  console.log('Instancia qr_libreria_prueba en Evolution:', inst?.connectionStatus, inst?.ownerJid);

  const isConnected = inst?.connectionStatus === 'open';
  const livePhone = isConnected && inst?.ownerJid ? inst.ownerJid.split('@')[0].replace(/[^0-9]/g, '') : null;
  const liveState = isConnected ? 'conectado' : 'esperando_qr';

  await sb.from('tenant_whatsapp').update({
    evolution_state: liveState,
    numero_whatsapp: livePhone
  }).eq('tenant_id', 'libreria_prueba');

  const { data: updated } = await sb.from('tenant_whatsapp').select('*').eq('tenant_id', 'libreria_prueba').single();
  console.log('Supabase actualizado:', updated.evolution_state, updated.numero_whatsapp);
}

testStatusRouteDirectly();
