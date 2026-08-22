const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function resetClean() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  await sb.from('tenant_whatsapp').update({
    evolution_state: 'esperando_qr',
    numero_whatsapp: '',
    updated_at: new Date().toISOString()
  }).eq('tenant_id', 'libreria_prueba');

  console.log('✅ Supabase limpiado a esperando_qr y numero vacío');
}

resetClean();
