import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function auditPolicies() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  if (authErr) {
    console.error('Erro de login:', authErr.message);
    return;
  }
  console.log('Autenticado:', auth.user.email);

  // Testa o que o PostgREST expõe diretamente sobre as tabelas
  const tables = ['events', 'projects', 'rounds', 'votes', 'results', 'admin_profiles', 'event_admins'];
  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    if (error) {
      console.log(`Tabela [${t}]: ERRO/INEXISTENTE -> ${error.code} - ${error.message}`);
    } else {
      console.log(`Tabela [${t}]: ACESSÍVEL via SELECT -> retornou ${data.length} linha(s)`);
    }
  }

  // Testa SELECT em votes com usuário anônimo
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: anonVotes, error: anonVotesErr } = await anon.from('votes').select('*');
  console.log('\n--- TESTE LEITURA VOTOS (ANÔNIMO) ---');
  if (anonVotesErr) {
    console.log('Anon votes error:', anonVotesErr.message);
  } else {
    console.log('Anon votes linhas lidas:', anonVotes.length);
  }

  // Testa SELECT em votes com admin logado
  const { data: adminVotes, error: adminVotesErr } = await client.from('votes').select('*');
  console.log('\n--- TESTE LEITURA VOTOS (ADMIN LOGADO) ---');
  if (adminVotesErr) {
    console.log('Admin votes error:', adminVotesErr.message);
  } else {
    console.log('Admin votes linhas lidas:', adminVotes.length);
    if (adminVotes.length > 0) {
      console.log('DETALHE VOTOS EXPOSTOS:', adminVotes);
    }
  }

  // Testa SELECT em results com anônimo
  const { data: anonRes, error: anonResErr } = await anon.from('results').select('*');
  console.log('\n--- TESTE LEITURA RESULTS (ANÔNIMO) ---');
  if (anonResErr) console.log('Anon results error:', anonResErr.message);
  else console.log('Anon results linhas lidas:', anonRes.length);

  // Testa SELECT em results com admin
  const { data: adminRes, error: adminResErr } = await client.from('results').select('*');
  console.log('\n--- TESTE LEITURA RESULTS (ADMIN) ---');
  if (adminResErr) console.log('Admin results error:', adminResErr.message);
  else console.log('Admin results linhas lidas:', adminRes.length);
}

auditPolicies();
