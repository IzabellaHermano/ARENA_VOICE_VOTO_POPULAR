import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let v = match[2] || '';
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[match[1]] = v.trim();
  }
});

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspectEtapa2() {
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  if (authErr) {
    console.error('Erro de autenticação:', authErr);
    return;
  }
  console.log('✓ Admin autenticado com sucesso.');

  // 1. admin_profiles
  const { data: profiles, error: pErr } = await client.from('admin_profiles').select('*');
  console.log('\n--- ADMIN_PROFILES ATUAIS ---');
  console.table(profiles);

  // 2. event_admins colunas e registros
  const { data: eaSample, error: eaErr } = await client.from('event_admins').select('*').limit(5);
  console.log('\n--- EVENT_ADMINS ---');
  console.log('Error:', eaErr);
  console.log('Total registros:', eaSample?.length);
  if (eaSample && eaSample.length > 0) {
    console.log('Colunas:', Object.keys(eaSample[0]));
    console.table(eaSample);
  }

  // 3. Teste das RPCs de acesso e gestão de usuários existentes
  const rpcs = [
    'admin_manage_profile',
    'grant_event_access',
    'revoke_event_access',
    'has_event_access',
    'is_superadmin',
    'is_admin'
  ];

  console.log('\n--- TESTE DE EXISTÊNCIA DE RPCs ---');
  for (const rpc of rpcs) {
    const res = await client.rpc(rpc, {});
    console.log(`RPC "${rpc}":`, res.error ? `Erro: ${res.error.code} - ${res.error.message}` : 'Existe e respondeu');
  }
}

inspectEtapa2().catch(console.error);

