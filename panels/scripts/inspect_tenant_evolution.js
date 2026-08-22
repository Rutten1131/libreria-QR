const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function inspectTenantAndEvolution() {
  console.log('=== 1. CONSULTANDO SUPABASE TENANTS ===');
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: tenants, error: tErr } = await sb.from('tenants').select('*');
  console.log('Tenants encontrados:', tenants, tErr);

  const { data: tw, error: twErr } = await sb.from('tenant_whatsapp').select('*');
  console.log('Tenant WhatsApp records:', tw, twErr);

  console.log('\n=== 2. CONSULTANDO EVOLUTION API ===');
  try {
    const evoUrl = `${env.EVOLUTION_BASE_URL}/instance/fetchInstances`;
    const res = await fetch(evoUrl, {
      headers: { 'apikey': env.EVOLUTION_API_KEY }
    });
    const instances = await res.json();
    console.log('Instancias en Evolution API:', JSON.stringify(instances, null, 2));
  } catch (e) {
    console.log('Error conectando a Evolution API:', e.message);
  }
}

inspectTenantAndEvolution();
