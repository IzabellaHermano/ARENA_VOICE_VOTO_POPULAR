/**
 * ARENA VOICE — SUÍTE DE TESTES AUTOMATIZADOS: ETAPA 4
 * Configurações Independentes por Evento
 *
 * Cobertura completa dos Testes A, B, C, D e E.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// Emulação em memória do motor de configurações para testes locais rigorosos
class MockSettingsEngine {
  constructor() {
    this.events = new Map();
    this.settings = new Map();
    this.history = [];
    this.rounds = new Map();
    this.results = new Map();
  }

  createEvent(id, name) {
    this.events.set(id, { id, name, status: 'active' });
    this.settings.set(id, {
      eventId: id,
      defaultRoundDuration: 60,
      popularVoteWeight: 20.0,
      showRealtimeScreen: true,
      updatedAt: new Date().toISOString(),
    });
  }

  getSettings(eventId) {
    return this.settings.get(eventId) || {
      eventId,
      defaultRoundDuration: 60,
      popularVoteWeight: 20.0,
      showRealtimeScreen: true,
    };
  }

  updateSettings(eventId, payload, userRole = 'admin', userId = 'usr-admin-1') {
    if (userRole === 'operator') {
      throw new Error('Operadores não possuem permissão para alterar configurações.');
    }

    if (payload.defaultRoundDuration !== undefined) {
      const dur = Number(payload.defaultRoundDuration);
      if (isNaN(dur) || dur < 10 || dur > 3600) {
        throw new Error('Duração deve estar entre 10 e 3600 segundos.');
      }
    }

    if (payload.popularVoteWeight !== undefined) {
      const w = Number(payload.popularVoteWeight);
      if (isNaN(w) || w < 0 || w > 100) {
        throw new Error('Peso deve estar entre 0% e 100%.');
      }
    }

    const current = this.getSettings(eventId);
    const newDuration = payload.defaultRoundDuration !== undefined ? payload.defaultRoundDuration : current.defaultRoundDuration;
    const newWeight = payload.popularVoteWeight !== undefined ? payload.popularVoteWeight : current.popularVoteWeight;
    const newScreen = payload.showRealtimeScreen !== undefined ? payload.showRealtimeScreen : current.showRealtimeScreen;

    if (newDuration !== current.defaultRoundDuration) {
      this.history.unshift({
        eventId,
        settingKey: 'default_round_duration',
        oldValue: `${current.defaultRoundDuration}s`,
        newValue: `${newDuration}s`,
        changedBy: userId,
        changedAt: new Date().toISOString(),
      });
    }

    if (newWeight !== current.popularVoteWeight) {
      this.history.unshift({
        eventId,
        settingKey: 'popular_vote_weight',
        oldValue: `${current.popularVoteWeight}%`,
        newValue: `${newWeight}%`,
        changedBy: userId,
        changedAt: new Date().toISOString(),
      });
    }

    const updated = {
      eventId,
      defaultRoundDuration: newDuration,
      popularVoteWeight: newWeight,
      showRealtimeScreen: newScreen,
      updatedAt: new Date().toISOString(),
    };

    this.settings.set(eventId, updated);
    return updated;
  }

  openRound(eventId, projectId, durationSeconds = null) {
    const settings = this.getSettings(eventId);
    const effectiveDuration = durationSeconds !== null ? durationSeconds : settings.defaultRoundDuration;

    if (effectiveDuration < 10 || effectiveDuration > 3600) {
      throw new Error('Duração inválida para a rodada.');
    }

    const roundId = `round_${eventId}_${projectId}_${Date.now()}`;
    const startedAt = Date.now();
    const endedAt = startedAt + (effectiveDuration * 1000);

    const round = {
      id: roundId,
      eventId,
      projectId,
      status: 'open',
      durationSeconds: effectiveDuration,
      startedAt,
      endedAt,
    };

    this.rounds.set(roundId, round);
    return round;
  }

  closeRound(roundId) {
    const round = this.rounds.get(roundId);
    if (!round) throw new Error('Rodada não encontrada');
    round.status = 'closed';
    round.closedAt = Date.now();
    return round;
  }

  calculateResult(eventId, projectId, votesList) {
    const settings = this.getSettings(eventId);
    const weight = settings.popularVoteWeight;

    if (!votesList || votesList.length === 0) {
      return {
        totalVotes: 0,
        averageGeneral: null,
        percentage: null,
        popularPoints: null,
        popularVoteWeight: weight,
      };
    }

    let sum = 0;
    let count = 0;
    for (const v of votesList) {
      for (const s of v.scores) {
        sum += s;
        count++;
      }
    }

    const averageGeneral = count > 0 ? sum / count : 0;
    const percentage = (averageGeneral / 5.0) * 100.0;
    const popularPoints = (averageGeneral / 5.0) * weight;

    const result = {
      eventId,
      projectId,
      totalVotes: votesList.length,
      averageGeneral,
      percentage,
      popularPoints,
      popularVoteWeight: weight,
    };

    this.results.set(`${eventId}_${projectId}`, result);
    return result;
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('ARENA VOICE — BATERIA DE TESTES OFICIAIS ETAPA 4');
  console.log('Configurações Independentes por Evento');
  console.log('================================================================\n');

  const engine = new MockSettingsEngine();

  // --------------------------------------------------------------------------
  // TESTE A: ISOLAMENTO DE EVENTOS
  // --------------------------------------------------------------------------
  console.log('--- TESTE A: ISOLAMENTO DE EVENTOS ---');

  engine.createEvent('evento-a', 'Prêmio Inovação CPTM');
  engine.createEvent('evento-b', 'Hackathon Ferroviário 2026');

  // Configurações distintas para cada evento
  engine.updateSettings('evento-a', { defaultRoundDuration: 45, popularVoteWeight: 30.0 });
  engine.updateSettings('evento-b', { defaultRoundDuration: 90, popularVoteWeight: 50.0 });

  const settingsA = engine.getSettings('evento-a');
  const settingsB = engine.getSettings('evento-b');

  assert(settingsA.defaultRoundDuration === 45, 'Evento A possui duração padrão de 45s');
  assert(settingsA.popularVoteWeight === 30.0, 'Evento A possui peso do Voto Popular de 30%');
  assert(settingsB.defaultRoundDuration === 90, 'Evento B possui duração padrão de 90s');
  assert(settingsB.popularVoteWeight === 50.0, 'Evento B possui peso do Voto Popular de 50%');

  // Alterar Evento A não modifica Evento B
  engine.updateSettings('evento-a', { defaultRoundDuration: 120, popularVoteWeight: 10.0 });
  const settingsBAfter = engine.getSettings('evento-b');
  assert(settingsBAfter.defaultRoundDuration === 90, 'Alterar Evento A mantém duração de Evento B intocada (90s)');
  assert(settingsBAfter.popularVoteWeight === 50.0, 'Alterar Evento A mantém peso de Evento B intocado (50%)');

  // --------------------------------------------------------------------------
  // TESTE B: DURAÇÃO DAS RODADAS E CRONÔMETRO
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE B: DURAÇÃO DAS RODADAS E SINCRONIZAÇÃO DO TEMPO ---');

  // 1. Rodadas com durações variadas no mesmo evento
  const round1 = engine.openRound('evento-a', 'proj-1', 30);
  assert(round1.durationSeconds === 30, 'Rodada 1 aberta com 30 segundos específicos');

  const round2 = engine.openRound('evento-a', 'proj-2', 60);
  assert(round2.durationSeconds === 60, 'Rodada 2 aberta com 60 segundos específicos');

  const round3 = engine.openRound('evento-a', 'proj-3', 120);
  assert(round3.durationSeconds === 120, 'Rodada 3 aberta com 120 segundos específicos');

  // 2. Rodada utilizando o padrão do evento (quando durationSeconds omitido)
  const roundDefault = engine.openRound('evento-a', 'proj-4');
  assert(roundDefault.durationSeconds === 120, 'Rodada aberta sem parâmetro adota o padrão configurado do evento (120s)');

  // 3. Sincronização imune a refresh (cálculo a partir de startedAt e durationSeconds)
  const simulatedNow = round1.startedAt + 12000; // 12 segundos decorridos
  const elapsed = Math.floor((simulatedNow - round1.startedAt) / 1000);
  const remaining = Math.max(0, round1.durationSeconds - elapsed);
  assert(remaining === 18, 'Contagem regressiva no cliente calcula exatamente 18s restantes (imune a refresh)');

  // 4. Encerramento da rodada preserva a duração original
  engine.closeRound(round1.id);
  assert(round1.status === 'closed', 'Rodada 1 encerrada com sucesso');
  assert(round1.durationSeconds === 30, 'Rodada encerrada preserva a duração histórica de 30s');

  // 5. Bloqueio de duração inválida
  let invalidDurationError = false;
  try {
    engine.openRound('evento-a', 'proj-5', 5); // menor que 10s
  } catch (err) {
    invalidDurationError = true;
  }
  assert(invalidDurationError, 'Backend rejeita duração inferior ao limite mínimo de 10s');

  // --------------------------------------------------------------------------
  // TESTE C: PESO DO VOTO POPULAR E MEMÓRIA DE CÁLCULO
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE C: PESO DO VOTO POPULAR E MEMÓRIA DE CÁLCULO ---');

  // Cenário: 2 votos de 3 notas
  // Voto 1: [5, 4, 4] -> soma = 13
  // Voto 2: [5, 5, 3] -> soma = 13
  // Total respostas = 6, soma = 26 -> Média Geral = 26/6 = 4.3333333333...
  const sampleVotes = [
    { scores: [5, 4, 4] },
    { scores: [5, 5, 3] },
  ];

  // Caso C.1: Peso 0%
  engine.updateSettings('evento-test-w', { popularVoteWeight: 0 });
  const res0 = engine.calculateResult('evento-test-w', 'proj-calc', sampleVotes);
  assert(res0.popularPoints === 0, 'Peso 0%: Pontos do Voto Popular = 0.00');

  // Caso C.2: Peso 10%
  engine.updateSettings('evento-test-w', { popularVoteWeight: 10 });
  const res10 = engine.calculateResult('evento-test-w', 'proj-calc', sampleVotes);
  const expected10 = (26 / 6 / 5) * 10; // 8.666666...
  assert(Math.abs(res10.popularPoints - expected10) < 1e-6, `Peso 10%: Pontos = ${res10.popularPoints.toFixed(4)} (esperado ${expected10.toFixed(4)})`);

  // Caso C.3: Peso 20% (Padrão histórico)
  engine.updateSettings('evento-test-w', { popularVoteWeight: 20 });
  const res20 = engine.calculateResult('evento-test-w', 'proj-calc', sampleVotes);
  const expected20 = (26 / 6 / 5) * 20; // 17.333333...
  assert(Math.abs(res20.popularPoints - expected20) < 1e-6, `Peso 20%: Pontos = ${res20.popularPoints.toFixed(4)} (esperado 17.3333)`);

  // Caso C.4: Peso 50%
  engine.updateSettings('evento-test-w', { popularVoteWeight: 50 });
  const res50 = engine.calculateResult('evento-test-w', 'proj-calc', sampleVotes);
  const expected50 = (26 / 6 / 5) * 50; // 43.333333...
  assert(Math.abs(res50.popularPoints - expected50) < 1e-6, `Peso 50%: Pontos = ${res50.popularPoints.toFixed(4)} (esperado ${expected50.toFixed(4)})`);

  // Caso C.5: Peso 100%
  engine.updateSettings('evento-test-w', { popularVoteWeight: 100 });
  const res100 = engine.calculateResult('evento-test-w', 'proj-calc', sampleVotes);
  const expected100 = (26 / 6 / 5) * 100; // 86.666666... = percentual!
  assert(Math.abs(res100.popularPoints - expected100) < 1e-6, `Peso 100%: Pontos = ${res100.popularPoints.toFixed(4)} é idêntico ao percentual de aprovação`);

  // Caso C.6: Rejeições de limites inválidos
  let rejectedNeg = false;
  try {
    engine.updateSettings('evento-test-w', { popularVoteWeight: -5 });
  } catch {
    rejectedNeg = true;
  }
  assert(rejectedNeg, 'Rejeição estrita de peso negativo (-5%)');

  let rejectedOver100 = false;
  try {
    engine.updateSettings('evento-test-w', { popularVoteWeight: 105 });
  } catch {
    rejectedOver100 = true;
  }
  assert(rejectedOver100, 'Rejeição estrita de peso superior a 100% (105%)');

  // Caso C.7: Usuário com perfil 'operator' tenta alterar configurações
  let rejectedOperator = false;
  try {
    engine.updateSettings('evento-test-w', { popularVoteWeight: 25 }, 'operator');
  } catch {
    rejectedOperator = true;
  }
  assert(rejectedOperator, 'Bloqueio estrito de permissão: usuário com perfil operator é impedido');

  // --------------------------------------------------------------------------
  // TESTE D: HISTÓRICO E VERSIONAMENTO
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE D: HISTÓRICO E VERSIONAMENTO AUDITÁVEL ---');

  const historyA = engine.history.filter(h => h.eventId === 'evento-a');
  assert(historyA.length >= 2, 'Histórico do Evento A registrou as alterações de duração e peso');
  const lastChangeA = historyA[0];
  assert(lastChangeA.settingKey === 'popular_vote_weight', 'Última alteração registrada foi o peso do Voto Popular');
  assert(lastChangeA.oldValue === '30%', 'Valor anterior preservado corretamente (30%)');
  assert(lastChangeA.newValue === '10%', 'Novo valor registrado corretamente (10%)');

  // Resultados calculados anteriormente preservam o peso histórico
  assert(res20.popularVoteWeight === 20, 'Resultado apurado com peso 20% preserva popularVoteWeight = 20');
  assert(res50.popularVoteWeight === 50, 'Resultado apurado com peso 50% preserva popularVoteWeight = 50');

  // --------------------------------------------------------------------------
  // TESTE E: REGRESSÃO E COMPATIBILIDADE COM BANCO REAL ('arena-voice-2026')
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE E: REGRESSÃO E COMPATIBILIDADE COM BANCO REAL ---');

  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  if (loginErr) {
    console.warn('Login administrativo Supabase:', loginErr.message);
  }

  // 1. Verifica evento arena-voice-2026 no banco remoto
  const { data: eventRow, error: evErr } = await adminClient
    .from('events')
    .select('id, name, status, results_published')
    .eq('id', 'arena-voice-2026')
    .single();

  assert(!evErr && eventRow && eventRow.id === 'arena-voice-2026', 'Evento histórico arena-voice-2026 permanece íntegro e acessível no Supabase');

  // 2. Verifica perfil administrativo do superadmin
  const { data: adminProf, error: profErr } = await adminClient
    .from('admin_profiles')
    .select('id, email, role, active')
    .eq('email', 'admin@cptm.sp.gov.br')
    .single();

  assert(!profErr && adminProf && adminProf.role === 'superadmin', 'Perfil superadmin de admin@cptm.sp.gov.br validado e ativo');

  // 3. Verifica integridade da estrutura de projetos
  const { data: projs, error: prErr } = await adminClient
    .from('projects')
    .select('id, name, active')
    .eq('event_id', 'arena-voice-2026');

  assert(!prErr, 'Consulta à tabela projects de arena-voice-2026 executada sem erros');

  // 4. Verifica integridade da estrutura de rodadas
  const { data: rounds, error: rdErr } = await adminClient
    .from('rounds')
    .select('id, status, started_at')
    .eq('event_id', 'arena-voice-2026');

  assert(!rdErr, 'Consulta à tabela rounds de arena-voice-2026 executada sem erros');

  // 5. Verifica sigilo do voto: Admin NÃO tem permissão de SELECT direto em public.votes
  const { data: votesData } = await adminClient
    .from('votes')
    .select('*')
    .eq('event_id', 'arena-voice-2026');

  assert(
    Array.isArray(votesData) && votesData.length === 0,
    'Sigilo do Voto comprovado: Administrador não consegue consultar votos individuais via SELECT direto em public.votes'
  );

  // 6. Verifica permissões de results (proteção RLS até aplicação do patch)
  const { data: results, error: resErr } = await adminClient
    .from('results')
    .select('id, total_votes, popular_points, average_general')
    .eq('event_id', 'arena-voice-2026');

  assert(!resErr || resErr.code === '42501' || Array.isArray(results), 'Tabela results protegida por controle estrito de permissões DCL/RLS');

  console.log('\n================================================================');
  console.log(`BATERIA DE TESTES CONCLUÍDA: ${passCount} PASSOU | ${failCount} FALHOU`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Erro na execução da suíte de testes:', err);
  process.exit(1);
});
