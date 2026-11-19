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
  await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  // 1. Inspeciona colunas de rounds
  console.log('--- COLUNAS DE ROUNDS ---');
  const { data: roundSample, error: rErr } = await supabase.from('rounds').select('*').limit(1);
  if (rErr) console.error('Erro rounds:', rErr);
  else console.log('Colunas de rounds:', Object.keys(roundSample[0] || {}));

  // 2. Inspeciona todas as rodadas existentes
  const { data: allRounds } = await supabase.from('rounds').select('*');
  console.log(`Total de rounds no banco: ${allRounds?.length || 0}`);
  console.table(allRounds?.map(r => ({ id: r.id, event_id: r.event_id, project_id: r.project_id, status: r.status, order: r.order })));

  // 3. Inspeciona votos recentes
  console.log('\n--- VOTOS RECENTES ---');
  const { data: votesSample, error: vErr } = await supabase.from('votes').select('*').limit(5);
  if (vErr) console.error('Erro votes:', vErr);
  else {
    console.log(`Total amostra votes: ${votesSample?.length || 0}`);
    if (votesSample?.length > 0) {
      console.log('Colunas de votes:', Object.keys(votesSample[0]));
      console.table(votesSample);
    }
  }

  // 4. Inspeciona vote_answers
  console.log('\n--- VOTE_ANSWERS RECENTES ---');
  const { data: vaSample, error: vaErr } = await supabase.from('vote_answers').select('*').limit(5);
  if (vaErr) console.error('Erro vote_answers:', vaErr);
  else {
    console.log(`Total amostra vote_answers: ${vaSample?.length || 0}`);
    if (vaSample?.length > 0) console.table(vaSample);
  }
}

runDiagnosis().catch(console.error);

