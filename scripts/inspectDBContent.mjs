import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function inspectPoliciesAndSchema() {
  const admin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await admin.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  // Consulta tabela results
  const { data: resData } = await admin.from('results').select('*');
  console.log('Results no banco:', resData);

  // Consulta evento arena-voice-2026
  const { data: evData } = await admin.from('events').select('*').eq('id', 'arena-voice-2026').single();
  console.log('Evento arena-voice-2026:', evData);

  // Consulta rounds
  const { data: roundData } = await admin.from('rounds').select('*');
  console.log('Rounds no banco:', roundData);

  // Consulta projects
  const { data: projData } = await admin.from('projects').select('*');
  console.log('Projects no banco:', projData);
}

inspectPoliciesAndSchema();

