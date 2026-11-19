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

async function testDel() {
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456'
  });
  console.log('Admin login:', auth?.user?.email);

  const targetId = 'teste-1-mwnil72s';
  console.log(`\n--- Testando exclusão direta de ${targetId} ---`);

  // 1. Inspeciona antes
  const { data: before } = await supabase.from('events').select('id, name').eq('id', targetId);
  console.log('Antes da exclusão no banco:', before);

  // 2. Executa delete
  const { data: delResult, error: delErr } = await supabase
    .from('events')
    .delete()
    .eq('id', targetId)
    .select();

  console.log('Resultado DELETE:', { delResult, delErr });

  // 3. Inspeciona depois
  const { data: after } = await supabase.from('events').select('id, name').eq('id', targetId);
  console.log('Depois da exclusão no banco:', after);
}

testDel().catch(console.error);

