import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function testSelects() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  console.log('--- 1. ADMIN: select(*) from results ---');
  const res1 = await adminClient.from('results').select('*').eq('event_id', 'teste-evento-mwf3or7h');
  console.log('res1:', res1.error ? `${res1.error.code} - ${res1.error.message} (hint: ${res1.error.hint})` : `Retornou ${res1.data.length} linhas`);

  console.log('\n--- 2. ADMIN: select explicit columns granted in etapa2 ---');
  const res2 = await adminClient.from('results').select('id, event_id, project_id, total_votes, sum_innovation, sum_impact, sum_development, average_innovation, average_impact, average_development, average_general, percentage, popular_points, updated_at').eq('event_id', 'teste-evento-mwf3or7h');
  console.log('res2:', res2.error ? `${res2.error.code} - ${res2.error.message}` : `Retornou ${res2.data.length} linhas`, res2.data);

  console.log('\n--- 3. ANON: select(*) from results ---');
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const res3 = await anonClient.from('results').select('*').eq('event_id', 'teste-evento-mwf3or7h');
  console.log('res3:', res3.error ? `${res3.error.code} - ${res3.error.message}` : `Retornou ${res3.data.length} linhas`);

  console.log('\n--- 4. ANON: select explicit columns ---');
  const res4 = await anonClient.from('results').select('id, event_id, project_id, total_votes').eq('event_id', 'teste-evento-mwf3or7h');
  console.log('res4:', res4.error ? `${res4.error.code} - ${res4.error.message}` : `Retornou ${res4.data.length} linhas`, res4.data);
}

testSelects().catch(console.error);

