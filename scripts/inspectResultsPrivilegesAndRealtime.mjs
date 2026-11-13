import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function inspectPrivileges() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  // Test selecting with explicit column list that includes ALL current columns except the 2 ungranted ones
  const baseCols = 'id, event_id, project_id, total_votes, sum_innovation, sum_impact, sum_development, average_innovation, average_impact, average_development, average_general, percentage, popular_points, updated_at';
  
  const { data: baseData, error: baseErr } = await adminClient
    .from('results')
    .select(baseCols)
    .eq('event_id', 'teste-evento-mwf3or7h');

  console.log('--- TESTE BASE COLS ---');
  console.log('Error:', baseErr);
  console.log('Data length:', baseData?.length);
  if (baseData) {
    baseData.forEach(r => console.log(`- Project: ${r.project_id} | Total Votes: ${r.total_votes} | Avg Gen: ${r.average_general} | Pts: ${r.popular_points}`));
  }

  // Test Realtime subscription
  console.log('\n--- TESTE REALTIME CHANNEL EM public.results ---');
  let receivedRealtime = false;
  const channel = adminClient
    .channel('test_results_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'results', filter: `event_id=eq.teste-evento-mwf3or7h` },
      (payload) => {
        console.log('Realtime event recebido:', payload);
        receivedRealtime = true;
      }
    )
    .subscribe((status, err) => {
      console.log('Realtime status:', status, err ? err.message : '');
    });

  await new Promise(resolve => setTimeout(resolve, 3000));
  await adminClient.removeChannel(channel);
}

inspectPrivileges().catch(console.error);

