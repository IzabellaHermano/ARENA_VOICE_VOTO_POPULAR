import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .forEach((l) => {
    const idx = l.indexOf('=');
    if (idx !== -1) {
      let val = l.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[l.slice(0, idx).trim()] = val;
    }
  });

async function main() {
  const superClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  const { data: auth, error: authErr } = await superClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  if (authErr) {
    console.error('Superadmin login error:', authErr);
    process.exit(1);
  }
  console.log('Superadmin logado:', auth.user.email);

  const isolatedClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const testEmail = `real_test_${Date.now()}@cptm.sp.gov.br`;
  console.log('Criando usuário de teste via isolated client:', testEmail);

  const { data: signData, error: signError } = await isolatedClient.auth.signUp({
    email: testEmail,
    password: 'Password@123456',
    options: { data: { name: 'Operador Teste Real', role: 'operator' } },
  });

  if (signError) {
    console.error('Erro signUp:', signError);
    process.exit(1);
  }

  const newUid = signData.user?.id;
  console.log('signUp OK! UID:', newUid);

  const { data: rpcData, error: rpcError } = await superClient.rpc('admin_manage_profile', {
    p_action: 'create',
    p_user_id: newUid,
    p_name: 'Operador Teste Real',
    p_email: testEmail,
    p_role: 'operator',
    p_active: true,
  });

  console.log('admin_manage_profile RPC:', { rpcData, rpcError });

  // Testa remoção
  const { data: delData, error: delError } = await superClient.rpc('admin_manage_profile', {
    p_action: 'delete',
    p_user_id: newUid,
  });
  console.log('admin_manage_profile delete RPC:', { delData, delError });
  console.log('Validação concluída com sucesso!');
}

main().catch(console.error);

