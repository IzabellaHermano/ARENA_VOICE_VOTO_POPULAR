import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.replace('VITE_SUPABASE_URL=', '').trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
});
url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

const supabase = createClient(url, key);

async function check() {
  await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456'
  });

  const eventIds = ['teste-1-mwnil72s', 'teste-evento-mwf3or7h'];

  for (const id of eventIds) {
    console.log(`\n================ ID: ${id} ================`);
    const { data: ev } = await supabase.from('events').select('*').eq('id', id).single();
    console.log('Event details:', ev);

    // Projetos
    const { data: projs } = await supabase.from('projects').select('id, name').eq('event_id', id);
    console.log(`Projects (${projs?.length}):`, projs);

    // Rodadas
    const { data: rounds } = await supabase.from('rounds').select('id, status, project_id').eq('event_id', id);
    console.log(`Rounds (${rounds?.length}):`, rounds);

    // Votos
    const { data: votes } = await supabase.from('votes').select('id, round_id, project_id').eq('event_id', id);
    console.log(`Votes (${votes?.length}):`, votes);

    // Resultados
    const { data: results } = await supabase.from('results').select('id, project_id, total_votes').eq('event_id', id);
    console.log(`Results (${results?.length}):`, results);

    // Event Questions
    const { data: questions } = await supabase.from('event_questions').select('id, title').eq('event_id', id);
    console.log(`Questions (${questions?.length}):`, questions);

    // Event Admins
    const { data: admins } = await supabase.from('event_admins').select('*').eq('event_id', id);
    console.log(`Admins (${admins?.length}):`, admins);

    // Event Settings
    const { data: settings } = await supabase.from('event_settings').select('*').eq('event_id', id);
    console.log(`Settings (${settings?.length}):`, settings);
  }
}

check().catch(console.error);

