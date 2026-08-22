const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function syncExactNow() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;

  const resFetch = await fetch(`${baseUrl}/instance/fetchInstances`, {
    headers: { 'apikey': apiKey }
  });
  const list = await resFetch.json();
  const inst = list.find(i => i.name === 'qr_libreria_prueba');

  const owner = inst?.ownerJid ? inst.ownerJid.split('@')[0].replace(/[^0-9]/g, '') : '';
  const state = inst?.connectionStatus === 'open' ? 'conectado' : 'esperando_qr';

  console.log(`Actualizando Supabase con datos en vivo de Evolution: estado=${state}, numero=${owner}`);

  await sb.from('tenant_whatsapp').update({
    evolution_state: state,
    numero_whatsapp: owner,
    updated_at: new Date().toISOString()
  }).eq('tenant_id', 'libreria_prueba');

  const { data } = await sb.from('tenant_whatsapp').select('*').eq('tenant_id', 'libreria_prueba').single();
  console.log('✅ Supabase ahora tiene:', data.evolution_state, data.numero_whatsapp);
}

syncExactNow();
