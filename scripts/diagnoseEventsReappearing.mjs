import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.replace('VITE_SUPABASE_URL=', '').trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
});
url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
console.log('Target Supabase URL:', url);

const supabase = createClient(url, key);

async function inspect() {
  console.log('\n--- 1. CONSULTA COM ANON KEY (SEM LOGIN) ---');
  const { data: anonEvents, error: anonErr } = await supabase.from('events').select('*');
  console.log('Anon error:', anonErr);
  console.log('Anon count:', anonEvents?.length);
  if (anonEvents) {
    anonEvents.forEach((ev, idx) => {
      console.log(`${idx + 1}. ID: ${ev.id} | Name: "${ev.name}" | Status: ${ev.status} | CreatedAt: ${ev.created_at}`);
    });
  }

  console.log('\n--- 2. CONSULTA COM LOGIN DE SUPERADMIN (admin@cptm.sp.gov.br) ---');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456'
  });
  if (authErr) {
    console.error('Login error:', authErr);
    return;
  }
  console.log('Admin logged in! User ID:', auth.user.id);

  const { data: adminEvents, error: adminErr } = await supabase.from('events').select('*');
  console.log('Admin error:', adminErr);
  console.log('Admin count:', adminEvents?.length);
  if (adminEvents) {
    adminEvents.forEach((ev, idx) => {
      console.log(`${idx + 1}. ID: ${ev.id} | Name: "${ev.name}" | Status: ${ev.status} | CreatedAt: ${ev.created_at}`);
    });
  }

  console.log('\n--- 3. VERIFICAÇÃO DE EVENT_ADMINS ---');
  const { data: ea, error: eaErr } = await supabase.from('event_admins').select('*');
  console.log('event_admins count:', ea?.length, 'Error:', eaErr?.message);
  if (ea) {
    ea.forEach(a => console.log(`  user_id: ${a.user_id} | event_id: ${a.event_id} | role: ${a.role}`));
  }

  console.log('\n--- 4. VERIFICAÇÃO DE POLÍTICAS RLS EM PUBLIC.EVENTS ---');
  const { data: rlsEvents, error: rlsErr } = await supabase
    .from('events')
    .select('id, name')
    .limit(10);
  console.log('RLS test select:', rlsEvents?.length, rlsErr?.message);
}

inspect().catch(console.error);

