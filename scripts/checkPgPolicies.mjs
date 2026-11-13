import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function checkPgPolicies() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await client.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  // Tenta consultar pg_policies via RPC ou view se disponível
  try {
    const { data, error } = await client.from('pg_policies').select('*');
    if (!error && data) {
      console.log('pg_policies direto:', data);
      return;
    }
  } catch (e) {
    //
  }

  console.log('pg_policies não está exposto via PostgREST diretamente.');
}

checkPgPolicies();

