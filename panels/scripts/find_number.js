const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function findNumberInSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: tw } = await sb.from('tenant_whatsapp').select('*');
  console.log('tenant_whatsapp:', tw);

  const { data: t } = await sb.from('tenants').select('*');
  console.log('tenants:', t);
}

findNumberInSupabase();
