import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function testVoter() {
  const voterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: authErr } = await voterClient.auth.signInAnonymously();
  if (authErr) {
    console.error('Voter login err:', authErr);
    return;
  }
  console.log('Voter auth UID:', auth.user.id);

  // Voter queries votes table with their own UID
  const { data: myVotes, error: myVotesErr } = await voterClient
    .from('votes')
    .select('*')
    .eq('voter_id', auth.user.id);

  console.log('Voter own votes query error:', myVotesErr);
  console.log('Voter own votes query count:', myVotes?.length);
}

testVoter().catch(console.error);

