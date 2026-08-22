const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function updateWithEmptyString() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await sb.from('tenant_whatsapp').update({
    evolution_state: 'esperando_qr',
    numero_whatsapp: '',
    updated_at: new Date().toISOString()
  }).eq('tenant_id', 'libreria_prueba').select();

  console.log('Update with empty string result:', data, error);
}

updateWithEmptyString();
