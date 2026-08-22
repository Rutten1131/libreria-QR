const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function checkCurrentLiveState() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: tw } = await sb.from('tenant_whatsapp').select('*').eq('tenant_id', 'libreria_prueba').single();
  console.log('Supabase tenant_whatsapp:', {
    tenant_id: tw.tenant_id,
    evolution_instance_name: tw.evolution_instance_name,
    evolution_state: tw.evolution_state,
    numero_whatsapp: tw.numero_whatsapp
  });

  const evoUrl = `${env.EVOLUTION_BASE_URL}/instance/connectionState/qr_libreria_prueba`;
  const res = await fetch(evoUrl, { headers: { 'apikey': env.EVOLUTION_API_KEY } });
  const data = await res.json();
  console.log('Evolution API Live state:', data);
}

checkCurrentLiveState();
