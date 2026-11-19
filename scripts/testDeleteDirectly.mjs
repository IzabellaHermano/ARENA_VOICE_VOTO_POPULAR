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
  console.log('--- TESTANDO DELETE EM PUBLIC.EVENTS COM SESSÃO ADMIN ---');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456'
  });
  console.log('Login admin:', auth?.user?.email, authErr?.message);

  // 1. Cria um evento de teste
  const testId = 'test-delete-probe-' + Date.now();
  const { data: created, error: crErr } = await supabase.from('events').insert({
    id: testId,
    name: 'TESTE EXCLUSÃO PROBE',
    status: 'draft'
  }).select().single();

  console.log('Evento de teste criado:', created?.id, crErr?.message);

  // 2. Tenta deletar usando a sessão do admin
  const { data: delData, error: delErr, count: delCount } = await supabase
    .from('events')
    .delete()
    .eq('id', testId)
    .select();

  console.log('Resultado do DELETE:', {
    delData,
    delErr: delErr?.message,
    code: delErr?.code,
    delCount
  });

  // 3. Verifica se o registro ainda existe
  const { data: checkData } = await supabase.from('events').select('id, name').eq('id', testId);
  console.log('Registro após DELETE ainda existe no banco?', checkData?.length > 0 ? 'SIM! NÃO FOI EXCLUÍDO!' : 'NÃO (foi excluído com sucesso)');

  if (checkData?.length > 0) {
    console.log('ALERTA: O DELETE falhou silenciosamente ou retornou sem erro devido a RLS (0 rows affected)!');
  }
}

check().catch(console.error);

