const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function checkDirect() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: tw } = await sb.from('tenant_whatsapp').select('*').eq('tenant_id', 'libreria_prueba').single();
  console.log('Estado actual en Supabase:', {
    evolution_state: tw.evolution_state,
    numero_whatsapp: tw.numero_whatsapp,
    updated_at: tw.updated_at
  });
}

checkDirect();
