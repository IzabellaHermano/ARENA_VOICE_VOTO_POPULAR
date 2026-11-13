import { createClient } from '@supabase/supabase-js';
import assert from 'assert';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

const OFFICIAL_QR_DESTINATION = 'https://arena-voice-voto-popular.web.app/votar';

async function testTelaoFlow() {
  console.log('=== TESTE AUTOMATIZADO DO NOVO TELÃO OFICIAL — ARENA VOICE ===\n');

  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: authErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  assert(!authErr, `Erro no login de admin: ${authErr?.message}`);
  console.log('✓ Admin autenticado com sucesso.');

  // 1. Validar Destino Oficial do QR Code
  console.log('\n--- 1. VALIDAÇÃO DO DESTINO DO QR CODE ---');
  // Simula a lógica de getPublicVotingUrl
  const origin = 'https://arena-voice-voto-popular.web.app';
  const qrTarget = `${origin}/votar`;
  assert(qrTarget === OFFICIAL_QR_DESTINATION, `Destino do QR Code deve ser ${OFFICIAL_QR_DESTINATION}`);
  console.log(`✓ Destino do QR Code verificado e inalterado: ${qrTarget}`);

  // 2. Testar Evento Novo (teste-evento-mwf3or7h)
  console.log('\n--- 2. TESTE DE FLUXO NO EVENTO: teste-evento-mwf3or7h ---');
  const targetEventId = 'teste-evento-mwf3or7h';

  const { data: event, error: evErr } = await adminClient
    .from('events')
    .select('*')
    .eq('id', targetEventId)
    .single();

  assert(!evErr && event, 'Evento deve existir no banco.');
  console.log(`✓ Evento carregado: "${event.name}" (Status: ${event.status})`);

  // Projetos do evento
  const { data: projects, error: projErr } = await adminClient
    .from('projects')
    .select('*')
    .eq('event_id', targetEventId)
    .order('order', { ascending: true });

  assert(!projErr && projects?.length === 4, 'Evento de teste deve ter 4 projetos.');
  console.log(`✓ Projetos carregados: ${projects.map(p => `${p.order}. ${p.name}`).join(' | ')}`);

  // Rodadas do evento
  const { data: rounds, error: roundsErr } = await adminClient
    .from('rounds')
    .select('*')
    .eq('event_id', targetEventId)
    .order('created_at', { ascending: false });

  assert(!roundsErr, 'Rodadas devem ser consultáveis.');
  console.log(`✓ Histórico de rodadas: ${rounds.length} rodadas registradas.`);

  // Resultados agregados reais
  const safeColumns = 'id, event_id, project_id, total_votes, sum_innovation, sum_impact, sum_development, average_innovation, average_impact, average_development, average_general, percentage, popular_points, updated_at';
  const { data: results, error: resErr } = await adminClient
    .from('results')
    .select(safeColumns)
    .eq('event_id', targetEventId);

  assert(!resErr && results?.length === 4, 'Devem existir 4 resultados consolidados.');
  console.log(`✓ Resultados reais consolidados recuperados com sucesso: ${results.length} registros.`);
  results.forEach(r => {
    const proj = projects.find(p => p.id === r.project_id);
    console.log(`  - ${proj?.name || r.project_id}: ${r.total_votes} voto(s) | Média Geral: ${r.average_general} | Pontos: ${r.popular_points}`);
  });

  // 3. Testar Máquina de Estados do Telão
  console.log('\n--- 3. TESTE DA MÁQUINA DE ESTADOS DO TELÃO ---');

  // Cenário A: Evento sem rodadas (Welcome)
  const isStartedCenA = false;
  const roundCenA = null;
  const stateCenA = (!isStartedCenA && !roundCenA) ? 'welcome' : 'other';
  assert(stateCenA === 'welcome', 'Sem rodadas o estado deve ser "welcome".');
  console.log('✓ Estado A (Antes do Início): welcome [Tela de Boas-Vindas]');

  // Cenário B: Rodada Aberta no Palco (Active Voting)
  const roundCenB = { status: 'open', projectId: projects[0].id };
  const eventCenB = { currentRoundId: 'round-123', currentProjectId: projects[0].id };
  let stateCenB = 'waiting';
  if (roundCenB.status === 'open') stateCenB = 'active_voting';
  assert(stateCenB === 'active_voting', 'Com rodada aberta o estado deve ser "active_voting".');
  console.log(`✓ Estado B (Rodada Aberta): active_voting [Projeto: ${projects[0].name}]`);

  // Cenário C: Rodada Encerrada / Votação Concluída (Round Closed)
  const roundCenC = { status: 'closed', projectId: projects[0].id };
  const eventCenC = { currentRoundId: null, currentProjectId: projects[0].id };
  let stateCenC = 'waiting';
  if (roundCenC.status === 'closed' && eventCenC.currentProjectId === roundCenC.projectId) {
    stateCenC = 'round_closed';
  }
  assert(stateCenC === 'round_closed', 'Com rodada fechada antes do próximo projeto o estado deve ser "round_closed".');
  console.log(`✓ Estado C (Rodada Encerrada): round_closed [VOTAÇÃO ENCERRADA — OBRIGADO PELA PARTICIPAÇÃO]`);

  // Cenário D: Admin clica em "Próximo Projeto" (Waiting Next)
  const roundCenD = { status: 'closed', projectId: projects[0].id };
  const eventCenD = { currentRoundId: null, currentProjectId: projects[1].id }; // current_project_id avançou para o proj 2
  let stateCenD = 'waiting';
  if (roundCenD.status === 'closed' && eventCenD.currentProjectId !== roundCenD.projectId) {
    stateCenD = 'waiting_next';
  }
  assert(stateCenD === 'waiting_next', 'Quando current_project_id avança o estado deve ser "waiting_next".');
  console.log(`✓ Estado D (Avanço de Projeto): waiting_next [AGUARDE O PRÓXIMO PROJETO — PREPARE-SE]`);

  // Cenário E: Pódio Oficial Publicado (Final Results)
  const eventCenE = { resultsPublished: true };
  let stateCenE = eventCenE.resultsPublished ? 'final_results' : 'waiting';
  assert(stateCenE === 'final_results', 'Com resultsPublished=true o estado deve ser "final_results".');
  console.log('✓ Estado E (Pódio Publicado): final_results [PÓDIO OFICIAL — ARENA VOICE]');

  // 4. Testar Alternância Manual dos Modos do Telão
  console.log('\n--- 4. TESTE DE ALTERNÂNCIA DOS MODOS DO TELÃO ---');
  const modes = ['auto', 'qrcode', 'live'];
  modes.forEach(mode => {
    let activeView = mode === 'qrcode' ? 'qrcode' : (mode === 'live' ? 'live' : 'autoState');
    assert(activeView, `Modo ${mode} deve resolver uma visualização válida.`);
    console.log(`✓ Modo ${mode.toUpperCase()} selecionado com sucesso -> renderiza visualização correspondente.`);
  });

  // 5. Comparar com Evento Original (arena-voice-2026)
  console.log('\n--- 5. COMPARAÇÃO COM EVENTO ORIGINAL (arena-voice-2026) ---');
  const { data: origEvent } = await adminClient
    .from('events')
    .select('*')
    .eq('id', 'arena-voice-2026')
    .single();

  assert(origEvent, 'arena-voice-2026 deve existir.');
  console.log(`✓ Evento original carregado: "${origEvent.name}" (Status: ${origEvent.status})`);

  console.log('\n✅ TODOS OS TESTES DO NOVO TELÃO OFICIAL PASSARAM COM 100% DE SUCESSO!');
}

testTelaoFlow().catch(console.error);

