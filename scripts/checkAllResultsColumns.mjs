import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function checkColumns() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  // Test selecting individual potential columns to discover all columns in results
  const candidates = [
    'id', 'event_id', 'project_id', 'total_votes',
    'sum_innovation', 'sum_impact', 'sum_development',
    'average_innovation', 'average_impact', 'average_development',
    'average_general', 'percentage', 'popular_points',
    'popular_vote_weight', 'questions_metrics', 'created_at', 'updated_at'
  ];

  console.log('--- TESTANDO COLUNAS DE public.results ---');
  for (const c of candidates) {
    const { data, error } = await adminClient.from('results').select(c).limit(1);
    if (error) {
      console.log(`results.${c}: ERRO -> ${error.code} - ${error.message}`);
    } else {
      console.log(`results.${c}: OK (acessível)`);
    }
  }

  console.log('\n--- TESTANDO RPC get_admin_results ---');
  const { data: rpcData, error: rpcErr } = await adminClient.rpc('get_admin_results', { p_event_id: 'teste-evento-mwf3or7h' });
  if (rpcErr) {
    console.log('get_admin_results erro:', rpcErr);
  } else {
    console.log('get_admin_results sucesso! Total de resultados retornados:', rpcData.results?.length);
    if (rpcData.results?.length > 0) {
      console.log('Primeiro resultado retornado pela RPC:');
      console.log(rpcData.results[0]);
    }
  }
}

checkColumns().catch(console.error);

