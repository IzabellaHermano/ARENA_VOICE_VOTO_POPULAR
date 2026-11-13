import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function auditRealSupabase() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  if (loginErr) {
    console.error('Erro de login:', loginErr);
    return;
  }
  console.log('=== ADMIN AUTENTICADO:', auth.user.email, '===');

  // 1. Contagens exatas de registros históricos
  console.log('\n--- 1. CONTAGENS DE DADOS HISTÓRICOS ---');
  const countQueries = ['events', 'projects', 'rounds', 'votes', 'results', 'admin_profiles'];
  for (const table of countQueries) {
    const { count, error } = await adminClient.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`[${table}]: Erro -> ${error.code} - ${error.message}`);
    } else {
      console.log(`[${table}]: Total de registros = ${count}`);
    }
  }

  // 2. Registro real do evento arena-voice-2026
  console.log('\n--- 2. REGISTRO REAL DO EVENTO arena-voice-2026 ---');
  const { data: eventData } = await adminClient.from('events').select('*').eq('id', 'arena-voice-2026');
  console.log(JSON.stringify(eventData, null, 2));

  // 3. Registros reais de projects
  console.log('\n--- 3. REGISTROS REAIS DE PROJECTS ---');
  const { data: projData } = await adminClient.from('projects').select('*').eq('event_id', 'arena-voice-2026');
  console.log(JSON.stringify(projData, null, 2));

  // 4. Registros reais de rounds
  console.log('\n--- 4. REGISTROS REAIS DE ROUNDS ---');
  const { data: roundData } = await adminClient.from('rounds').select('*').eq('event_id', 'arena-voice-2026');
  console.log(JSON.stringify(roundData, null, 2));

  // 5. Registros reais de votes
  console.log('\n--- 5. REGISTROS REAIS DE VOTES ---');
  const { data: voteData } = await adminClient.from('votes').select('*').eq('event_id', 'arena-voice-2026');
  console.log(JSON.stringify(voteData, null, 2));

  // 6. Registros reais de results
  console.log('\n--- 6. REGISTROS REAIS DE RESULTS ---');
  const { data: resultData } = await adminClient.from('results').select('*').eq('event_id', 'arena-voice-2026');
  console.log(JSON.stringify(resultData, null, 2));

  // 7. Registros reais de admin_profiles
  console.log('\n--- 7. REGISTROS REAIS DE ADMIN_PROFILES ---');
  const { data: profileData } = await adminClient.from('admin_profiles').select('*');
  console.log(JSON.stringify(profileData, null, 2));

  // 8. Tabela event_admins
  console.log('\n--- 8. TESTE DE EXISTÊNCIA DE event_admins ---');
  const { data: eaData, error: eaErr } = await adminClient.from('event_admins').select('*').limit(1);
  if (eaErr) {
    console.log(`event_admins: ${eaErr.code} - ${eaErr.message}`);
  } else {
    console.log(`event_admins já existe! Qtd: ${eaData.length}`);
  }
}

auditRealSupabase().catch(console.error);

