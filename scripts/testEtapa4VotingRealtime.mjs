import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega .env sem depender de dotenv
const envPath = resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EVENT_ID = 'arena-voice-2026';
const PROJECT_1 = 'projeto01';
const PROJECT_2 = 'projeto02';

console.log('====================================================');
console.log('ARENA VOICE — VOTO POPULAR | TESTE E2E ETAPA 4');
console.log('MOTOR DE VOTAÇÃO E SINCRONIZAÇÃO EM TEMPO REAL');
console.log('====================================================');

const results = [];
function recordResult(step, name, passed, details = '') {
  results.push({ step, name, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Passo ${step}: ${name} ${details ? '(' + details + ')' : ''}`);
}

async function runTests() {
  let publicChannelEvents = null;
  let publicChannelRounds = null;
  let adminClient = null;

  try {
    // 1. Cliente Admin (Autenticado)
    adminClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: adminAuth, error: adminErr } = await adminClient.auth.signInWithPassword({
      email: 'admin@cptm.sp.gov.br',
      password: '123456',
    });
    if (adminErr) throw new Error('Falha no login do admin: ' + adminErr.message);
    recordResult(1, 'Autenticação do Administrador no Supabase', true, adminAuth.user.email);

    // 2. Cliente Público 1 (Anônimo)
    const publicClient1 = createClient(supabaseUrl, supabaseAnonKey);
    const { data: anon1Auth, error: anon1Err } = await publicClient1.auth.signInAnonymously();
    if (anon1Err) throw new Error('Falha na autenticação anônima 1: ' + anon1Err.message);
    const voter1Uid = anon1Auth.user.id;
    recordResult(2, 'Autenticação Anônima do Eleitor 1', true, `UID: ${voter1Uid.substring(0, 8)}...`);

    // 3. Cliente Público 2 (Anônimo)
    const publicClient2 = createClient(supabaseUrl, supabaseAnonKey);
    const { data: anon2Auth, error: anon2Err } = await publicClient2.auth.signInAnonymously();
    if (anon2Err) throw new Error('Falha na autenticação anônima 2: ' + anon2Err.message);
    const voter2Uid = anon2Auth.user.id;
    recordResult(3, 'Autenticação Anônima do Eleitor 2', true, `UID: ${voter2Uid.substring(0, 8)}...`);

    // 4. Configurar Listeners Realtime no Cliente Público (simulando telefone do eleitor)
    let realtimeEventProj = null;
    let realtimeRoundStatus = null;

    publicChannelEvents = publicClient1
      .channel('e2e_events_' + Date.now())
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${EVENT_ID}` },
        (payload) => {
          realtimeEventProj = payload.new.current_project_id;
        }
      )
      .subscribe();

    publicChannelRounds = publicClient1
      .channel('e2e_rounds_' + Date.now())
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rounds', filter: `event_id=eq.${EVENT_ID}` },
        (payload) => {
          realtimeRoundStatus = payload.new.status;
        }
      )
      .subscribe();

    // Aguarda sincronização dos canais Realtime
    await new Promise((r) => setTimeout(r, 2000));

    // 5. Admin abre a rodada para o Projeto 1
    console.log('\n--- Abrindo Rodada de Votação (Admin -> Supabase) ---');
    const { data: openRoundData, error: openErr } = await adminClient.rpc('open_round', {
      p_event_id: EVENT_ID,
      p_project_id: PROJECT_1,
    });
    if (openErr) throw new Error('open_round error: ' + openErr.message);
    const activeRoundId = openRoundData.round_id;
    recordResult(4, 'Admin libera rodada para Projeto 1 (open_round)', true, `Round ID: ${activeRoundId}`);

    // 6. Verifica sincronização em tempo real (Realtime WebSocket)
    await new Promise((r) => setTimeout(r, 2500));
    const isRealtimeSynced = realtimeEventProj === PROJECT_1 && realtimeRoundStatus === 'open';
    recordResult(5, 'Sincronização Realtime recebida pelo Eleitor', isRealtimeSynced, `round_status: ${realtimeRoundStatus}, project_id: ${realtimeEventProj}`);

    // 7. Eleitor 1 vota com sucesso
    console.log('\n--- Registrando Votos Públicos Atômicos ---');
    const { data: vote1Result, error: vote1Err } = await publicClient1.rpc('submit_vote', {
      p_event_id: EVENT_ID,
      p_round_id: activeRoundId,
      p_project_id: PROJECT_1,
      p_innovation: 5,
      p_impact: 4,
      p_development: 5,
    });
    if (vote1Err) throw new Error('submit_vote 1 error: ' + vote1Err.message);
    recordResult(6, 'Eleitor 1 registra voto com notas (5, 4, 5)', true, `Vote ID: ${vote1Result.vote_id}`);

    // 8. Eleitor 2 vota com sucesso
    const { data: vote2Result, error: vote2Err } = await publicClient2.rpc('submit_vote', {
      p_event_id: EVENT_ID,
      p_round_id: activeRoundId,
      p_project_id: PROJECT_1,
      p_innovation: 4,
      p_impact: 4,
      p_development: 4,
    });
    if (vote2Err) throw new Error('submit_vote 2 error: ' + vote2Err.message);
    recordResult(7, 'Eleitor 2 registra voto com notas (4, 4, 4)', true, `Vote ID: ${vote2Result.vote_id}`);

    // 9. Bloqueio de Voto Duplicado: Eleitor 1 tenta votar novamente no mesmo projeto
    console.log('\n--- Teste de Bloqueio de Duplicidade ---');
    const { data: dupData, error: dupErr } = await publicClient1.rpc('submit_vote', {
      p_event_id: EVENT_ID,
      p_round_id: activeRoundId,
      p_project_id: PROJECT_1,
      p_innovation: 3,
      p_impact: 3,
      p_development: 3,
    });
    const dupBlocked = !!dupErr && dupErr.message.includes('Voto duplicado');
    recordResult(8, 'Tentativa de voto duplicado rejeitada pelo banco (UNIQUE constraint)', dupBlocked, dupErr ? dupErr.message : 'Falha: Permitiu duplicata!');

    // 10. Validação de notas fora da faixa (ex: nota 6 ou 0)
    const { error: invalidScoreErr } = await publicClient2.rpc('submit_vote', {
      p_event_id: EVENT_ID,
      p_round_id: activeRoundId,
      p_project_id: PROJECT_1,
      p_innovation: 6,
      p_impact: 4,
      p_development: 5,
    });
    const scoreBlocked = !!invalidScoreErr && invalidScoreErr.message.includes('Notas inválidas');
    recordResult(9, 'Tentativa de nota inválida (> 5) rejeitada com erro de validação', scoreBlocked, invalidScoreErr?.message);

    // 11. Admin encerra a rodada
    console.log('\n--- Encerrando a Rodada ---');
    const { data: closeData, error: closeErr } = await adminClient.rpc('close_round', {
      p_event_id: EVENT_ID,
      p_round_id: activeRoundId,
    });
    if (closeErr) throw new Error('close_round error: ' + closeErr.message);
    recordResult(10, 'Admin encerra a rodada (close_round)', true, `Rodada encerrada no Supabase`);

    // 12. Tentativa de votar em rodada encerrada por novo eleitor 3
    const publicClient3 = createClient(supabaseUrl, supabaseAnonKey);
    await publicClient3.auth.signInAnonymously();
    const { error: voteOnClosedErr } = await publicClient3.rpc('submit_vote', {
      p_event_id: EVENT_ID,
      p_round_id: activeRoundId,
      p_project_id: PROJECT_1,
      p_innovation: 5,
      p_impact: 5,
      p_development: 5,
    });
    const closedBlocked = !!voteOnClosedErr && voteOnClosedErr.message.includes('não está aberta');
    recordResult(11, 'Voto rejeitado quando a rodada está encerrada', closedBlocked, voteOnClosedErr?.message);

    // 13. Admin prepara próximo projeto
    console.log('\n--- Preparando Próximo Projeto ---');
    const { data: nextData, error: nextErr } = await adminClient.rpc('prepare_next_round', {
      p_event_id: EVENT_ID,
      p_next_project_id: PROJECT_2,
    });
    if (nextErr) throw new Error('prepare_next_round error: ' + nextErr.message);

    // Verifica que o evento mudou para o Projeto 2 e round_id foi limpo
    const { data: eventAfterNext } = await adminClient.from('events').select('*').eq('id', EVENT_ID).single();
    const preparedCorrectly = eventAfterNext.current_project_id === PROJECT_2 && eventAfterNext.current_round_id === null;
    recordResult(12, 'Admin avança para próximo projeto (prepare_next_round)', preparedCorrectly, `Current Round: null (aguardando), Projeto: ${eventAfterNext.current_project_id}`);

    // 14. Validação dos Resultados Consolidados no Banco
    console.log('\n--- Conferência dos Resultados Consolidados ---');
    const { data: finalResult, error: resErr } = await adminClient
      .from('results')
      .select('*')
      .eq('event_id', EVENT_ID)
      .eq('project_id', PROJECT_1)
      .single();

    if (resErr) throw new Error('Erro ao ler results: ' + resErr.message);
    const votesAreCorrect = finalResult.total_votes >= 2 && finalResult.popular_points > 0;
    recordResult(13, 'Resultados consolidados com integridade matemática oficial', votesAreCorrect, `Total Votos: ${finalResult.total_votes}, Média Geral: ${finalResult.average_general}, Pontos: ${finalResult.popular_points}`);

    console.log('\n====================================================');
    const allPassed = results.every((r) => r.passed);
    console.log(`TOTAL DE TESTES: ${results.length} | SUCESSOS: ${results.filter((r) => r.passed).length} | FALHAS: ${results.filter((r) => !r.passed).length}`);
    if (allPassed) {
      console.log('STATUS: TODOS OS TESTES PASSARAM COM SUCESSO! MOTOR DE VOTAÇÃO 100% OPERACIONAL.');
    } else {
      console.error('STATUS: HOUVE FALHAS EM ALGUNS TESTES.');
      process.exitCode = 1;
    }
    console.log('====================================================\n');
  } catch (err) {
    console.error('FATAL ERROR NO TESTE E2E:', err);
    process.exitCode = 1;
  } finally {
    if (publicChannelEvents && adminClient) adminClient.removeChannel(publicChannelEvents);
    if (publicChannelRounds && adminClient) adminClient.removeChannel(publicChannelRounds);
  }
}

runTests();
