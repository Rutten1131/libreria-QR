async function testRealStatus() {
  const { createClient } = require('@supabase/supabase-js');
  const fs = require('fs');
  const path = require('path');

  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  });

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from('tenant_whatsapp').select('*').eq('tenant_id', 'libreria_prueba').single();
  console.log('DB Supabase data:', {
    evolution_state: data.evolution_state,
    numero_whatsapp: data.numero_whatsapp,
    evolution_instance_name: data.evolution_instance_name
  });
}

testRealStatus();
