import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function checkSettingsAndQuestions() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  console.log('--- 1. EVENT_SETTINGS ---');
  const { data: settings, error: setErr } = await adminClient.from('event_settings').select('*');
  if (setErr) console.log('event_settings err:', setErr.code, setErr.message);
  else {
    console.log(`event_settings total: ${settings.length}`);
    settings.forEach(s => console.log(`- Event: ${s.event_id} | Round Time: ${s.round_duration_minutes}m | Popular Weight: ${s.popular_vote_weight}%`));
  }

  console.log('\n--- 2. EVENT_QUESTIONS ---');
  const { data: questions, error: qErr } = await adminClient.from('event_questions').select('*');
  if (qErr) console.log('event_questions err:', qErr.code, qErr.message);
  else {
    console.log(`event_questions total: ${questions.length}`);
    questions.forEach(q => console.log(`- Event: ${q.event_id} | ID: ${q.id} | Title: "${q.title}" | Active: ${q.active}`));
  }
}

checkSettingsAndQuestions().catch(console.error);

