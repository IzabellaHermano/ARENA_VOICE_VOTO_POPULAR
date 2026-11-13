import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function checkAMPAllParams() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  
  const { data, error } = await adminClient.rpc('admin_manage_profile', {
    p_action: 'ping',
    p_user_id: auth.user.id,
    p_name: null,
    p_email: null,
    p_role: null,
    p_active: null
  });

  console.log('admin_manage_profile com todos os 6 params:', error ? `[${error.code}] ${error.message}` : data);
}

checkAMPAllParams().catch(console.error);

