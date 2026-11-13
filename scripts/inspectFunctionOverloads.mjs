import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function checkOverloads() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  if (loginErr) {
    console.error('Login error:', loginErr.message);
    return;
  }

  // Testa chamadas de variações de assinatura de funções para detectar se existem sobrecargas no banco
  const overloadsToTest = [
    { name: 'open_round', args: { p_event_id: 'arena-voice-2026' } }, // se existir overload com 1 arg
    { name: 'open_round', args: { p_event_id: 'arena-voice-2026', p_project_id: 'proj_teste_mwdxj49b' } },
    { name: 'close_round', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'close_round', args: { p_event_id: 'arena-voice-2026', p_round_id: '52e95f59-095f-4251-ac67-3a5018f41a2c' } },
    { name: 'prepare_next_round', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'prepare_next_round', args: { p_event_id: 'arena-voice-2026', p_next_project_id: 'proj_teste_mwdxj49b' } },
    { name: 'reconcile_results', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'reconcile_results', args: { p_event_id: 'arena-voice-2026', p_project_id: 'proj_teste_mwdxj49b' } },
    { name: 'get_admin_results', args: { p_event_id: 'arena-voice-2026' } },
    { name: 'submit_vote', args: { p_event_id: 'arena-voice-2026', p_round_id: '52e95f59-095f-4251-ac67-3a5018f41a2c', p_project_id: 'proj_teste_mwdxj49b', p_innovation: 5, p_impact: 5, p_development: 5 } }
  ];

  console.log('=== TESTE DE DETECÇÃO DE SOBRECARGAS DE FUNÇÕES ===\n');
  for (const test of overloadsToTest) {
    const keys = Object.keys(test.args).join(', ');
    const { data, error } = await adminClient.rpc(test.name, test.args);
    if (error) {
      console.log(`RPC [${test.name}(${keys})] -> ${error.code}: ${error.message.substring(0, 70)}`);
    } else {
      console.log(`RPC [${test.name}(${keys})] -> SUCESSO!`);
    }
  }
}

checkOverloads().catch(console.error);

