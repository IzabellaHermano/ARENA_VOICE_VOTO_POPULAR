import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function checkCatalogFunctions() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  if (loginErr) {
    console.error('Erro de login:', loginErr);
    return;
  }
  console.log('Login OK:', auth.user.email);

  // Testa chamadas RPC para comprovar existência real
  console.log('\n--- VERIFICAÇÃO DE EXISTÊNCIA E COMPORTAMENTO DAS FUNÇÕES ---');
  
  // 1. is_admin()
  const { data: isAdminData, error: isAdminErr } = await adminClient.rpc('is_admin');
  console.log('is_admin() ->', isAdminErr ? `ERRO: ${isAdminErr.message}` : `SUCESSO: ${isAdminData}`);

  // 2. is_superadmin()
  const { data: isSuperData, error: isSuperErr } = await adminClient.rpc('is_superadmin');
  console.log('is_superadmin() ->', isSuperErr ? `ERRO: ${isSuperErr.message}` : `SUCESSO: ${isSuperData}`);

  // 3. admin_manage_profile
  // Testa chamada com ação inválida apenas para ver se o PostgREST encontra a função e executa
  const { data: ampData, error: ampErr } = await adminClient.rpc('admin_manage_profile', {
    p_action: 'ping',
    p_user_id: auth.user.id
  });
  console.log('admin_manage_profile ->', ampErr ? `Retorno esperado da execução: [${ampErr.code}] ${ampErr.message}` : `Retorno: ${JSON.stringify(ampData)}`);
}

checkCatalogFunctions().catch(console.error);

