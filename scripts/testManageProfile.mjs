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

async function testManageProfile() {
  await client.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  const res = await client.rpc('admin_manage_profile', {
    p_action: 'create',
    p_user_id: 'f7efad47-a74f-49c8-832c-e9f78356880e',
    p_name: 'Usuario Teste',
    p_email: 'teste_user_1795095439790@cptm.sp.gov.br',
    p_role: 'operator',
    p_active: true,
  });

  console.log('admin_manage_profile result:', res);

  const { data: profiles } = await client.from('admin_profiles').select('*');
  console.log('admin_profiles after rpc:');
  console.table(profiles);
}

testManageProfile().catch(console.error);

