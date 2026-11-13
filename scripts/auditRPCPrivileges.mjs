import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function main() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  if (loginErr) {
    console.error('Login error:', loginErr.message);
    return;
  }
  console.log('Admin logado:', auth.user.email);

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Testa chamadas como ANON (sem token Bearer autenticado)
  console.log('\n=== 1. TESTE DE EXECUTE COMO ANON (NÃO AUTENTICADO) ===');
  
  const rpcs = [
    { name: 'open_round', args: { p_event_id: 'arena-voice-2026', p_project_id: 'test' } },
    { name: 'close_round', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'prepare_next_round', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'get_admin_results', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'reconcile_results', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'grant_event_access', args: { p_event_id: 'arena-voice-2026', p_user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'submit_vote', args: { p_event_id: 'arena-voice-2026', p_round_id: '00000000-0000-0000-0000-000000000000', p_project_id: 'test', p_innovation: 5, p_impact: 5, p_development: 5 } },
    { name: 'is_admin', args: {} },
    { name: 'has_event_access', args: { p_event_id: 'arena-voice-2026' } }
  ];

  for (const r of rpcs) {
    const { data, error } = await anonClient.rpc(r.name, r.args);
    if (error) {
      console.log(`RPC [${r.name}] -> Código: ${error.code} | Mensagem: ${error.message}`);
    } else {
      console.log(`RPC [${r.name}] -> SUCESSO (Retornou: ${JSON.stringify(data)})`);
    }
  }

  // Testa login anônimo
  console.log('\n=== 2. TESTE DE SUPABASE AUTH ANÔNIMO ===');
  const anonAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: anonSignIn, error: anonSignInErr } = await anonAuthClient.auth.signInAnonymously();
  if (anonSignInErr) {
    console.log('signInAnonymously error:', anonSignInErr.message);
  } else {
    console.log('signInAnonymously sucesso! User ID:', anonSignIn.user?.id);
    console.log('Session Role no JWT:', anonSignIn.session?.user?.role);
    console.log('is_anonymous flag:', anonSignIn.user?.is_anonymous);

    // Testar chamar submit_vote com esse usuário anônimo autenticado
    const { data: voteData, error: voteErr } = await anonAuthClient.rpc('submit_vote', {
      p_event_id: 'arena-voice-2026',
      p_round_id: '00000000-0000-0000-0000-000000000000',
      p_project_id: 'test',
      p_innovation: 5,
      p_impact: 5,
      p_development: 5
    });
    console.log('submit_vote como participante anônimo:', voteErr ? `ERRO ESPERADO (${voteErr.message})` : voteData);
  }
}

main().catch(console.error);

