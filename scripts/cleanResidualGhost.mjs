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

async function cleanResidualGhostEvent() {
  await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456'
  });

  const ghostId = 'teste-evento-mwf3or7h';
  console.log(`Limpando evento residual duplicado: ${ghostId}`);

  await supabase.from('event_questions').delete().eq('event_id', ghostId);
  const { data, error } = await supabase.from('events').delete().eq('id', ghostId).select();
  console.log('Resultado da remoção:', data, error?.message);

  const { data: remaining } = await supabase.from('events').select('id, name');
  console.log('Eventos restantes no banco:', remaining);
}

cleanResidualGhostEvent().catch(console.error);

