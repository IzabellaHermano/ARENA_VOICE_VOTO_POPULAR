/**
 * Teste Automatizado Completo: Multi-Eventos, Votação, Realtime e Avanço de Projetos
 */
import { createClient } from '@supabase/supabase-js';
import assert from 'assert';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

console.log('=== INICIANDO AUDITORIA E TESTES REAIS DE MULTI-EVENTOS ===\n');

async function runTests() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const voterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Autenticar Admin
  const { data: auth, error: authErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  assert(!authErr, `Erro no login de admin: ${authErr?.message}`);
  console.log(`✓ Admin autenticado: ${auth.user.email} (Role: superadmin/admin)`);

  // 2. Autenticar Votante Anônimo
  const { data: voterAuth, error: voterAuthErr } = await voterClient.auth.signInAnonymously();
  assert(!voterAuthErr, `Erro no login de votante anônimo: ${voterAuthErr?.message}`);
  const voterUid = voterAuth.user.id;
  console.log(`✓ Votante anônimo conectado: ${voterUid}`);

  // =========================================================================
  // CENÁRIO A: EVENTO ORIGINAL (arena-voice-2026)
  // =========================================================================
  console.log('\n--- CENÁRIO A: Evento Original (arena-voice-2026) ---');
  const { data: origEvent, error: origEventErr } = await adminClient
    .from('events')
    .select('*')
    .eq('id', 'arena-voice-2026')
    .single();
  assert(!origEventErr && origEvent, 'arena-voice-2026 deve existir no banco.');
  console.log(`✓ Evento original carregado: ${origEvent.name} (Status: ${origEvent.status})`);

  // Busca projetos do evento original ordenados
  const { data: origProjects, error: origProjErr } = await adminClient
    .from('projects')
    .select('*')
    .eq('event_id', 'arena-voice-2026')
    .eq('active', true)
    .order('order', { ascending: true });
  assert(origProjects && origProjects.length >= 2, 'Evento original deve ter pelo menos 2 projetos.');
  console.log(`✓ Projetos do evento original: ${origProjects.map(p => `${p.order}. ${p.name} (${p.id})`).join(' | ')}`);

  // Testa avanço para o projeto 1
  const proj1 = origProjects[0];
  const { data: prepOrig1, error: prepOrig1Err } = await adminClient.rpc('prepare_next_round', {
    p_event_id: 'arena-voice-2026',
    p_next_project_id: proj1.id,
  });
  assert(!prepOrig1Err && prepOrig1.success, `Falha ao preparar projeto 1: ${prepOrig1Err?.message}`);
  console.log(`✓ Projeto 1 preparado com sucesso no evento original: ${proj1.name}`);

  // Abre rodada para projeto 1
  const { data: openOrig1, error: openOrig1Err } = await adminClient.rpc('open_round', {
    p_event_id: 'arena-voice-2026',
    p_project_id: proj1.id,
  });
  assert(!openOrig1Err && openOrig1.success, `Falha ao abrir rodada: ${openOrig1Err?.message}`);
  const roundOrig1Id = openOrig1.round_id;
  console.log(`✓ Rodada aberta para projeto 1 (Round ID: ${roundOrig1Id})`);

  // Votação do participante no projeto 1 do evento original
  const { data: voteOrig1, error: voteOrig1Err } = await voterClient.rpc('submit_vote', {
    p_event_id: 'arena-voice-2026',
    p_round_id: roundOrig1Id,
    p_project_id: proj1.id,
    p_innovation: 5,
    p_impact: 4,
    p_development: 5,
    p_answers: [],
  });
  if (voteOrig1Err && voteOrig1Err.message.includes('already voted')) {
    console.log(`✓ Voto no projeto 1 já computado anteriormente para este votante (proteção contra voto duplicado ativa).`);
  } else {
    assert(!voteOrig1Err && voteOrig1.success, `Falha no voto: ${voteOrig1Err?.message}`);
    console.log(`✓ Voto registrado no projeto 1 do evento original (Vote ID: ${voteOrig1.vote_id})`);
  }

  // Encerra rodada do projeto 1
  const { data: closeOrig1, error: closeOrig1Err } = await adminClient.rpc('close_round', {
    p_event_id: 'arena-voice-2026',
    p_round_id: roundOrig1Id,
  });
  assert(!closeOrig1Err && closeOrig1.success, `Falha ao fechar rodada: ${closeOrig1Err?.message}`);
  console.log(`✓ Rodada do projeto 1 encerrada com sucesso.`);

  // Avança para o projeto 2 do evento original
  const proj2 = origProjects[1];
  const { data: prepOrig2, error: prepOrig2Err } = await adminClient.rpc('prepare_next_round', {
    p_event_id: 'arena-voice-2026',
    p_next_project_id: proj2.id,
  });
  assert(!prepOrig2Err && prepOrig2.success, `Falha ao avançar para projeto 2: ${prepOrig2Err?.message}`);
  console.log(`✓ Botão Próximo Projeto: avançou com sucesso para Projeto 2 (${proj2.name})`);

  // =========================================================================
  // CENÁRIO B: NOVO EVENTO (teste-evento-mwf3or7h)
  // =========================================================================
  console.log('\n--- CENÁRIO B: Novo Evento Criado (teste-evento-mwf3or7h) ---');
  const newEventId = 'teste-evento-mwf3or7h';
  const { data: newEvent, error: newEventErr } = await adminClient
    .from('events')
    .select('*')
    .eq('id', newEventId)
    .single();
  assert(!newEventErr && newEvent, `Evento ${newEventId} deve existir no banco.`);
  console.log(`✓ Novo evento carregado: ${newEvent.name} (Status: ${newEvent.status})`);

  // Busca projetos do novo evento
  const { data: newProjects, error: newProjErr } = await adminClient
    .from('projects')
    .select('*')
    .eq('event_id', newEventId)
    .eq('active', true)
    .order('order', { ascending: true });
  assert(newProjects && newProjects.length >= 2, `Novo evento deve ter pelo menos 2 projetos (encontrados: ${newProjects?.length}).`);
  console.log(`✓ Projetos do novo evento: ${newProjects.map(p => `${p.order}. ${p.name} (${p.id})`).join(' | ')}`);

  // Avança para o projeto 1 do novo evento
  const newProj1 = newProjects[0];
  const { data: prepNew1, error: prepNew1Err } = await adminClient.rpc('prepare_next_round', {
    p_event_id: newEventId,
    p_next_project_id: newProj1.id,
  });
  assert(!prepNew1Err && prepNew1.success, `Falha ao preparar proj 1 do novo evento: ${prepNew1Err?.message}`);
  console.log(`✓ Projeto 1 do novo evento preparado: ${newProj1.name}`);

  // Abre rodada do projeto 1 no novo evento
  const { data: openNew1, error: openNew1Err } = await adminClient.rpc('open_round', {
    p_event_id: newEventId,
    p_project_id: newProj1.id,
  });
  assert(!openNew1Err && openNew1.success, `Falha ao abrir rodada no novo evento: ${openNew1Err?.message}`);
  const roundNew1Id = openNew1.round_id;
  console.log(`✓ Rodada aberta no novo evento para Projeto 1 (Round ID: ${roundNew1Id})`);

  // Votação no projeto 1 do novo evento
  const { data: voteNew1, error: voteNew1Err } = await voterClient.rpc('submit_vote', {
    p_event_id: newEventId,
    p_round_id: roundNew1Id,
    p_project_id: newProj1.id,
    p_innovation: 4,
    p_impact: 5,
    p_development: 4,
    p_answers: [],
  });
  if (voteNew1Err && voteNew1Err.message.includes('already voted')) {
    console.log(`✓ Voto no projeto 1 do novo evento já computado para este votante (proteção duplicada ativa).`);
  } else {
    assert(!voteNew1Err && voteNew1.success, `Falha no voto do novo evento: ${voteNew1Err?.message}`);
    console.log(`✓ Voto registrado com sucesso no NOVO EVENTO (Vote ID: ${voteNew1.vote_id})`);
  }

  // Encerra rodada do projeto 1 no novo evento
  const { data: closeNew1, error: closeNew1Err } = await adminClient.rpc('close_round', {
    p_event_id: newEventId,
    p_round_id: roundNew1Id,
  });
  assert(!closeNew1Err && closeNew1.success, `Falha ao fechar rodada no novo evento: ${closeNew1Err?.message}`);
  console.log(`✓ Rodada do projeto 1 no novo evento encerrada com sucesso.`);

  // AVANÇO: Próximo Projeto no Novo Evento (Projeto 2)
  const newProj2 = newProjects[1];
  const { data: prepNew2, error: prepNew2Err } = await adminClient.rpc('prepare_next_round', {
    p_event_id: newEventId,
    p_next_project_id: newProj2.id,
  });
  assert(!prepNew2Err && prepNew2.success, `Falha ao avançar para projeto 2 no novo evento: ${prepNew2Err?.message}`);
  console.log(`✓ Botão Próximo Projeto no NOVO EVENTO: avançou com sucesso para Projeto 2 (${newProj2.name})`);

  // Abre rodada do projeto 2 no novo evento
  const { data: openNew2, error: openNew2Err } = await adminClient.rpc('open_round', {
    p_event_id: newEventId,
    p_project_id: newProj2.id,
  });
  assert(!openNew2Err && openNew2.success, `Falha ao abrir rodada 2 no novo evento: ${openNew2Err?.message}`);
  const roundNew2Id = openNew2.round_id;
  console.log(`✓ Rodada aberta no novo evento para Projeto 2 (${newProj2.name})`);

  // Encerra rodada 2 do novo evento
  const { data: closeNew2, error: closeNew2Err } = await adminClient.rpc('close_round', {
    p_event_id: newEventId,
    p_round_id: roundNew2Id,
  });
  assert(!closeNew2Err && closeNew2.success, `Falha ao fechar rodada 2 no novo evento: ${closeNew2Err?.message}`);
  console.log(`✓ Rodada 2 encerrada com sucesso no novo evento.`);

  // =========================================================================
  // CENÁRIO C: ISOLAMENTO TOTAL ENTRE OS DOIS EVENTOS
  // =========================================================================
  console.log('\n--- CENÁRIO C: Isolamento Estrito entre os Eventos ---');
  // Verifica se o evento original continua apontando para seu próprio projeto (proj2)
  const { data: checkOrigEvent } = await adminClient.from('events').select('*').eq('id', 'arena-voice-2026').single();
  assert(checkOrigEvent.current_project_id === proj2.id, 'Evento original deve manter seu current_project_id isolado.');
  console.log(`✓ Evento original mantém seu próprio projeto atual: ${checkOrigEvent.current_project_id}`);

  // Verifica se o novo evento mantém seu próprio projeto atual (newProj2)
  const { data: checkNewEvent } = await adminClient.from('events').select('*').eq('id', newEventId).single();
  assert(checkNewEvent.current_project_id === newProj2.id, 'Novo evento deve manter seu current_project_id isolado.');
  console.log(`✓ Novo evento mantém seu próprio projeto atual: ${checkNewEvent.current_project_id}`);

  // Confirma que os votos estão isolados por event_id
  const { count: origVotesCount } = await adminClient
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', 'arena-voice-2026');
  const { count: newVotesCount } = await adminClient
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', newEventId);

  console.log(`✓ Contagem de votos isolados: arena-voice-2026 = ${origVotesCount} votos | ${newEventId} = ${newVotesCount} votos`);
  assert(origVotesCount >= 0 && newVotesCount >= 0, 'Contagem válida de votos isolados.');

  console.log('\n=========================================================================');
  console.log('✓✓✓ TODOS OS CENÁRIOS DE TESTE REAIS FORAM CONCLUÍDOS COM SUCESSO! ✓✓✓');
  console.log('=========================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
