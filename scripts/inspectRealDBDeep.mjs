import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function inspectLiveDatabase() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  if (loginErr) {
    console.error('Login error:', loginErr.message);
    return;
  }
  console.log('=== ADMIN AUTENTICADO: ', auth.user.email, ' (ID:', auth.user.id, ') ===\n');

  const tables = ['events', 'projects', 'rounds', 'votes', 'results', 'admin_profiles', 'event_admins'];

  for (const table of tables) {
    console.log(`\n---------------- TABELA: public.${table} ----------------`);
    const { data, error } = await adminClient.from(table).select('*').limit(3);
    if (error) {
      console.log(`Erro ao consultar [${table}]:`, error.code, '-', error.message);
    } else {
      console.log(`Linhas retornadas: ${data.length}`);
      if (data.length > 0) {
        console.log('Colunas reais detectadas:', Object.keys(data[0]));
        console.log('Amostra da primeira linha:', JSON.stringify(data[0], null, 2));
      } else {
        console.log(`Tabela existe, mas está vazia (0 registros).`);
      }
    }
  }

  // Inspeciona colunas de votes e results mesmo se vazios tentando selecionar colunas específicas
  console.log('\n---------------- AUDITORIA COLUNAS ESPECÍFICAS DE public.votes ----------------');
  const voteCols = [
    'id', 'event_id', 'project_id', 'round_id', 'voter_id', 'voter_uid',
    'innovation_score', 'cptm_impact_score', 'development_score',
    'innovation', 'impact', 'development', 'created_at'
  ];
  for (const col of voteCols) {
    const { data, error } = await adminClient.from('votes').select(col).limit(1);
    if (error) {
      console.log(`Coluna [${col}]: NÃO EXISTE ou ERRO -> ${error.code} - ${error.message}`);
    } else {
      console.log(`Coluna [${col}]: CONFIRMADA EXISTENTE.`);
    }
  }

  console.log('\n---------------- AUDITORIA COLUNAS ESPECÍFICAS DE public.results ----------------');
  const resultCols = [
    'id', 'event_id', 'project_id', 'total_votes', 'sum_innovation', 'sum_impact', 'sum_development',
    'average_innovation', 'average_impact', 'average_development', 'average_general', 'percentage',
    'popular_points', 'updated_at'
  ];
  for (const col of resultCols) {
    const { data, error } = await adminClient.from('results').select(col).limit(1);
    if (error) {
      console.log(`Coluna [${col}]: NÃO EXISTE ou ERRO -> ${error.code} - ${error.message}`);
    } else {
      console.log(`Coluna [${col}]: CONFIRMADA EXISTENTE.`);
    }
  }
}

inspectLiveDatabase().catch(console.error);

