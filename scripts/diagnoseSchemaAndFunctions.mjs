import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let v = match[2] || '';
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[match[1]] = v.trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function runDiagnosis() {
  console.log('=== DIAGNÓSTICO PROFUNDO DO BANCO DE DADOS SUPABASE ===\n');

  // Login como admin
  const { data: auth, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  if (loginErr) {
    console.error('Erro de login:', loginErr);
    return;
  }
  console.log('✔ Autenticado como admin@cptm.sp.gov.br (UID:', auth.user.id, ')\n');

  // 1. Storage Buckets
  console.log('--- 1. BUCKETS DE STORAGE ---');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) console.error('Erro ao listar buckets:', bErr);
  else console.table(buckets.map((b) => ({ id: b.id, name: b.name, public: b.public })));

  // 2. Tabela admin_profiles
  console.log('\n--- 2. ADMIN PROFILES ---');
  const { data: admins, error: aErr } = await supabase.from('admin_profiles').select('*');
  if (aErr) console.error('Erro ao listar admin_profiles:', aErr);
  else console.table(admins);

  // 3. Tabela event_admins
  console.log('\n--- 3. EVENT ADMINS (VÍNCULOS) ---');
  const { data: eventAdmins, error: eaErr } = await supabase.from('event_admins').select('*');
  if (eaErr) console.error('Erro ao listar event_admins:', eaErr);
  else console.table(eventAdmins);

  // 4. Tabela events
  console.log('\n--- 4. EVENTOS ---');
  const { data: events, error: evErr } = await supabase.from('events').select('id, name, status, current_round_id, current_project_id');
  if (evErr) console.error('Erro ao listar events:', evErr);
  else console.table(events);

  // 5. Tabela rounds
  console.log('\n--- 5. RODADAS (ROUNDS) ---');
  const { data: rounds, error: rErr } = await supabase.from('rounds').select('id, event_id, project_id, status, round_number, created_at');
  if (rErr) console.error('Erro ao listar rounds:', rErr);
  else console.table(rounds);

  // 6. Teste de RPC has_event_access
  console.log('\n--- 6. TESTE RPC has_event_access ---');
  for (const ev of events || []) {
    const { data: hasAcc, error: accErr } = await supabase.rpc('has_event_access', {
      p_event_id: ev.id,
    });
    console.log(`has_event_access(${ev.id}):`, hasAcc, accErr ? `Erro: ${accErr.message}` : '');
  }

  // 7. Teste de Edge Function manage-admin-user
  console.log('\n--- 7. TESTE DA EDGE FUNCTION manage-admin-user ---');
  try {
    const { data: efData, error: efErr } = await supabase.functions.invoke('manage-admin-user', {
      body: { action: 'ping' },
    });
    console.log('manage-admin-user response:', efData, efErr ? `Erro: ${efErr.message}` : '');
  } catch (efCatch) {
    console.log('manage-admin-user exception:', efCatch.message);
  }
}

runDiagnosis().catch(console.error);

