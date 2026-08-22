const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function traceExactRoute() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const rawId = 'libreria_prueba';
  const cleanPhone = rawId.replace(/[^0-9]/g, '');

  console.log('1. Query step 1:');
  let { data: tw } = await sb
    .from('tenant_whatsapp')
    .select('tenant_id, evolution_instance_name, evolution_state, evolution_qr, numero_whatsapp')
    .or(`tenant_id.eq.${rawId},numero_whatsapp.eq.${cleanPhone || rawId}`)
    .maybeSingle();

  console.log('tw:', tw);

  console.log('2. Evolution detail:');
  const baseUrl = env.EVOLUTION_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;
  const resFetch = await fetch(`${baseUrl}/instance/fetchInstances`, {
    headers: { 'apikey': apiKey }
  });
  const list = await resFetch.json();
  const inst = list.find((i) => i.name === tw.evolution_instance_name || i.instanceName === tw.evolution_instance_name);
  console.log('inst found:', {
    name: inst?.name,
    connectionStatus: inst?.connectionStatus,
    ownerJid: inst?.ownerJid
  });

  const state = inst?.connectionStatus || '';
  const ownerJid = inst?.ownerJid || '';
  const phoneNumber = ownerJid ? String(ownerJid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : undefined;

  console.log('Calculated phoneNumber:', phoneNumber);
}

traceExactRoute();
