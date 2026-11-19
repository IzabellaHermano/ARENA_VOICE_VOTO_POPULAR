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

async function proveRootCause() {
  await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456'
  });

  const targetId = 'teste-1-mwnil72s';

  // 1. Confirma que teste-1-mwnil72s NÃO existe no banco
  const { data: checkBefore } = await supabase.from('events').select('id, name').eq('id', targetId).maybeSingle();
  console.log('1. Status antes no banco (deve ser null):', checkBefore);

  // 2. Simula o código exato de subscribeToCurrentEvent (linhas 860-884 de eventService.ts)
  console.log('2. Executando o bloco que roda no boot do navegador (subscribeToCurrentEvent)...');
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', targetId)
    .maybeSingle();

  if (!data) {
    console.log('   -> Evento não encontrado no banco!');
    console.log('   -> Executando o INSERT automático de linha 879 de eventService.ts...');
    const { data: created, error: insErr } = await supabase
      .from('events')
      .insert({ id: targetId, name: 'Arena Voice 2026', status: 'active', results_published: false })
      .select('*')
      .single();
    console.log('   -> Resultado do INSERT automático:', created?.id, created?.name, insErr?.message);
  }

  // 3. Verifica se o evento reapareceu no banco
  const { data: checkAfter } = await supabase.from('events').select('id, name, status').eq('id', targetId).maybeSingle();
  console.log('3. Status no banco após o boot (COMPROVAÇÃO):', checkAfter);

  // 4. Limpa novamente para não deixar resíduo
  await supabase.from('events').delete().eq('id', targetId);
  console.log('4. Evento limpo novamente.');
}

proveRootCause().catch(console.error);

