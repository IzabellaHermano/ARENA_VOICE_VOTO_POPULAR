import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function audit() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  if (loginErr) {
    console.error('Login error:', loginErr.message);
    return;
  }
  console.log('Autenticado como:', auth.user.email);

  // Testa diretamente com anonClient e com authenticatedClient cada função para comprovar privilégios de execução efetivos
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const funcsToTest = [
    { name: 'open_round', args: { p_event_id: 'arena-voice-2026', p_project_id: 'teste' } },
    { name: 'close_round', args: { p_event_id: 'arena-voice-2026', p_round_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'prepare_next_round', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'get_admin_results', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'reconcile_results', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'grant_event_access', args: { p_event_id: 'arena-voice-2026', p_user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'revoke_event_access', args: { p_event_id: 'arena-voice-2026', p_user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'submit_vote', args: { p_event_id: 'arena-voice-2026', p_round_id: '00000000-0000-0000-0000-000000000000', p_project_id: 'teste', p_innovation: 5, p_impact: 5, p_development: 5 } },
    { name: 'has_event_access', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'is_admin', args: {} },
    { name: 'is_superadmin', args: {} }
  ];

  console.log('\n========================================================================');
  console.log('AUDITORIA DE PRIVILÉGIOS EFETIVOS NO SUPABASE REAL (ESTADO ATUAL)');
  console.log('========================================================================');
  
  for (const fn of funcsToTest) {
    // 1. Chamada sem token (Papel: anon)
    const { error: anonErr } = await anonClient.rpc(fn.name, fn.args);
    // 2. Chamada com token (Papel: authenticated / admin)
    const { error: authErr } = await adminClient.rpc(fn.name, fn.args);

    const anonStatus = anonErr ? (anonErr.code === '42501' ? 'BLOQUEADO_DCL (42501)' : `REJEITADO_INTERNO (${anonErr.code} - ${anonErr.message.substring(0, 45)})`) : 'PERMITIDO';
    const authStatus = authErr ? (authErr.code === '42501' ? 'BLOQUEADO_DCL (42501)' : `EXECUTOU (${authErr.code} - ${authErr.message.substring(0, 45)})`) : 'EXECUTOU_COM_SUCESSO';

    console.log(`Função: ${fn.name.padEnd(22)} | anon: ${anonStatus.padEnd(35)} | authenticated: ${authStatus}`);
  }
}

audit().catch(console.error);

