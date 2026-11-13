import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function runAudit() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  if (loginErr) {
    console.error('Login error:', loginErr.message);
    return;
  }
  console.log('=== ADMIN AUTENTICADO ===\n');

  // 1. Listar todos os eventos
  console.log('--- 1. EVENTOS CADASTRADOS ---');
  const { data: events, error: evErr } = await adminClient.from('events').select('*');
  if (evErr) console.error('Erro events:', evErr);
  else {
    console.log(`Total de eventos: ${events.length}`);
    events.forEach(e => console.log(`- ID: ${e.id} | Nome: "${e.name}" | Status: ${e.status} | Round: ${e.current_round_id} | Proj: ${e.current_project_id} | Published: ${e.results_published}`));
  }

  // 2. Projetos por evento
  console.log('\n--- 2. PROJETOS POR EVENTO ---');
  const { data: projects, error: projErr } = await adminClient.from('projects').select('*').order('event_id').order('order');
  if (projErr) console.error('Erro projects:', projErr);
  else {
    console.log(`Total de projetos: ${projects.length}`);
    projects.forEach(p => console.log(`- [${p.event_id}] Proj #${p.order} ID: ${p.id} | Nome: "${p.name}" | Ativo: ${p.active}`));
  }

  // 3. Rodadas por evento
  console.log('\n--- 3. RODADAS POR EVENTO ---');
  const { data: rounds, error: roundErr } = await adminClient.from('rounds').select('*').order('created_at', { ascending: false });
  if (roundErr) console.error('Erro rounds:', roundErr);
  else {
    console.log(`Total de rodadas: ${rounds.length}`);
    rounds.forEach(r => console.log(`- [${r.event_id}] Round ID: ${r.id} | Proj ID: ${r.project_id} | Status: ${r.status} | Aberta em: ${r.started_at || r.created_at} | Encerrada em: ${r.ended_at}`));
  }

  // 4. Votos registrados
  console.log('\n--- 4. VOTOS REGISTRADOS (public.votes) ---');
  const { data: votes, error: voteErr } = await adminClient.from('votes').select('*').order('created_at', { ascending: false });
  if (voteErr) console.error('Erro votes:', voteErr);
  else {
    console.log(`Total de votos no banco: ${votes.length}`);
    votes.forEach(v => {
      // anonimizar voter_id parcial para conformidade
      const maskedVoter = v.voter_id ? `${v.voter_id.substring(0, 8)}...` : (v.voter_uid ? `${v.voter_uid.substring(0, 8)}...` : 'anon');
      console.log(`- ID: ${v.id} | Event: ${v.event_id} | Proj: ${v.project_id} | Round: ${v.round_id} | Voter: ${maskedVoter} | Inov: ${v.innovation ?? v.innovation_score} | Imp: ${v.impact ?? v.cptm_impact_score} | Dev: ${v.development ?? v.development_score} | Criado: ${v.created_at}`);
    });
  }

  // 5. Respostas de critérios/perguntas (public.vote_answers)
  console.log('\n--- 5. RESPOSTAS (public.vote_answers) ---');
  const { data: answers, error: ansErr } = await adminClient.from('vote_answers').select('*');
  if (ansErr) console.log(`Aviso vote_answers: ${ansErr.code} - ${ansErr.message}`);
  else {
    console.log(`Total de respostas em vote_answers: ${answers?.length || 0}`);
    if (answers && answers.length > 0) {
      console.log('Amostra de respostas:', answers.slice(0, 5));
    }
  }

  // 6. Resultados agregados (public.results)
  console.log('\n--- 6. RESULTADOS AGREGADOS (public.results) ---');
  const { data: results, error: resErr } = await adminClient.from('results').select('*');
  if (resErr) console.error('Erro results:', resErr);
  else {
    console.log(`Total de registros em public.results: ${results.length}`);
    results.forEach(r => {
      console.log(`- ID: ${r.id} | Event: ${r.event_id} | Proj: ${r.project_id} | Total Votos: ${r.total_votes} | Média Inov: ${r.average_innovation} | Média Geral: ${r.average_general} | Pontos: ${r.popular_points}`);
    });
  }

  // 7. Chamada de get_admin_results via RPC para cada evento
  console.log('\n--- 7. RPC get_admin_results ---');
  for (const ev of (events || [])) {
    const { data: adminRes, error: rpcErr } = await adminClient.rpc('get_admin_results', { p_event_id: ev.id });
    if (rpcErr) {
      console.log(`get_admin_results("${ev.id}") -> ERRO: ${rpcErr.code} - ${rpcErr.message}`);
    } else {
      console.log(`get_admin_results("${ev.id}") -> SUCESSO:`, JSON.stringify(adminRes, null, 2));
    }
  }
}

runAudit().catch(console.error);

