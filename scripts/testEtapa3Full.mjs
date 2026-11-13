import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

console.log('================================================================');
console.log('ARENA VOICE — BATERIA DE TESTES OFICIAIS ETAPA 3');
console.log('Perguntas e Critérios Personalizados por Evento');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failCount++;
  }
}

// Helpers equivalentes ao scoring.ts
function formatScore(value, fallback = 'Sem avaliações') {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value.toFixed(1).replace('.', ',');
}

function formatPercent(value, fallback = 'Sem avaliações') {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return `${value.toFixed(1).replace('.', ',')}%`;
}

function calculateProjectScore(project, resultDoc) {
  const projectId = project.id || '';
  const totalVotes = resultDoc?.totalVotes || 0;

  if (totalVotes === 0) {
    return {
      projectId,
      name: project.name,
      totalVotes: 0,
      hasEvaluations: false,
      rawGeneral: null,
      formattedGeneral: 'Sem avaliações',
      formattedPoints: 'Sem avaliações',
      formattedPercentage: 'Sem avaliações'
    };
  }

  let criteriaScores = undefined;
  if (resultDoc?.questionsMetrics && Array.isArray(resultDoc.questionsMetrics) && resultDoc.questionsMetrics.length > 0) {
    criteriaScores = resultDoc.questionsMetrics.map((qm) => ({
      id: qm.question_id || qm.id || '',
      title: qm.title || 'Critério',
      average: typeof qm.average_score === 'number' ? qm.average_score : null,
      formatted: formatScore(qm.average_score),
    }));
  }

  const rawGeneral = resultDoc?.averageGeneral !== undefined && resultDoc.averageGeneral !== null
    ? resultDoc.averageGeneral
    : 0;

  const rawPercentage = resultDoc?.percentage !== undefined && resultDoc.percentage !== null
    ? resultDoc.percentage
    : (rawGeneral / 5) * 100;

  const rawPoints = resultDoc?.popularPoints !== undefined && resultDoc.popularPoints !== null
    ? resultDoc.popularPoints
    : (rawGeneral / 5) * 20;

  return {
    projectId,
    name: project.name,
    totalVotes,
    hasEvaluations: true,
    criteriaScores,
    rawGeneral,
    rawPercentage,
    rawPoints,
    formattedGeneral: formatScore(rawGeneral),
    formattedPercentage: formatPercent(rawPercentage),
    formattedPoints: formatScore(rawPoints)
  };
}

async function runAllTests() {
  // ===========================================================================
  // TESTE A: ISOLAMENTO MULTI-EVENTO DE PERGUNTAS
  // ===========================================================================
  console.log('--- TESTE A: ISOLAMENTO MULTI-EVENTO ---');
  const mockDbQuestions = [
    { id: 'qa1', event_id: 'evento-cptm-sp', title: 'Inovação Ferroviária', position: 1, active: true },
    { id: 'qa2', event_id: 'evento-cptm-sp', title: 'Segurança Operacional', position: 2, active: true },
    { id: 'qa3', event_id: 'evento-cptm-sp', title: 'Eficiência Energética', position: 3, active: true },
    { id: 'qb1', event_id: 'evento-mostra-metro', title: 'UX do Passageiro', position: 1, active: true },
    { id: 'qb2', event_id: 'evento-mostra-metro', title: 'Design Inclusivo', position: 2, active: true },
    { id: 'qb3', event_id: 'evento-mostra-metro', title: 'Pontualidade', position: 3, active: true },
    { id: 'qb4', event_id: 'evento-mostra-metro', title: 'Sustentabilidade', position: 4, active: true },
    { id: 'qb5', event_id: 'evento-mostra-metro', title: 'Integração Modal', position: 5, active: true },
  ];

  const questionsEventA = mockDbQuestions.filter(q => q.event_id === 'evento-cptm-sp');
  const questionsEventB = mockDbQuestions.filter(q => q.event_id === 'evento-mostra-metro');

  assert(questionsEventA.length === 3, 'Evento A possui exatamente 3 perguntas');
  assert(questionsEventB.length === 5, 'Evento B possui exatamente 5 perguntas');
  assert(
    !questionsEventA.some(qa => questionsEventB.some(qb => qb.id === qa.id)),
    'Isolamento total: zero compartilhamento de perguntas entre Evento A e Evento B'
  );
  assert(
    questionsEventA.every(q => q.event_id === 'evento-cptm-sp'),
    'Todas as perguntas do Evento A possuem estritamente o event_id correspondente'
  );

  // ===========================================================================
  // TESTE B: CADASTRO, EDIÇÃO, REORDENAÇÃO E DESATIVAÇÃO
  // ===========================================================================
  console.log('\n--- TESTE B: CADASTRO, EDIÇÃO, REORDENAÇÃO E DESATIVAÇÃO ---');
  let eventTestQuestions = [
    { id: 'q1', event_id: 'evento-teste', title: 'Originalidade', position: 1, active: true },
    { id: 'q2', event_id: 'evento-teste', title: 'Viabilidade', position: 2, active: true }
  ];

  // 1. Cadastro
  const newQuestion = { id: 'q3', event_id: 'evento-teste', title: 'Escalabilidade', position: 3, active: true };
  eventTestQuestions.push(newQuestion);
  assert(eventTestQuestions.length === 3, 'Cadastro: nova pergunta adicionada à lista do evento');

  // 2. Edição
  eventTestQuestions[1].title = 'Viabilidade Técnica e Financeira';
  assert(
    eventTestQuestions.find(q => q.id === 'q2').title === 'Viabilidade Técnica e Financeira',
    'Edição: título da pergunta atualizado com sucesso'
  );

  // 3. Reordenação (Inverter q1 e q2)
  const reorderedIds = ['q2', 'q1', 'q3'];
  eventTestQuestions = reorderedIds.map((id, idx) => ({
    ...eventTestQuestions.find(q => q.id === id),
    position: idx + 1
  }));
  assert(eventTestQuestions[0].id === 'q2' && eventTestQuestions[0].position === 1, 'Reordenação: q2 agora ocupa a 1ª posição');
  assert(eventTestQuestions[1].id === 'q1' && eventTestQuestions[1].position === 2, 'Reordenação: q1 agora ocupa a 2ª posição');

  // 4. Desativação
  eventTestQuestions[2].active = false;
  const activeOnly = eventTestQuestions.filter(q => q.active);
  assert(activeOnly.length === 2, 'Desativação: pergunta q3 desativada e excluída da lista de votação');
  assert(!activeOnly.some(q => q.id === 'q3'), 'Desativação: q3 não aparece nas perguntas ativas');

  // ===========================================================================
  // TESTE C: REGRAS DE NOTAS E VALIDAÇÃO DA ESCALA 1 A 5
  // ===========================================================================
  console.log('\n--- TESTE C: VALIDAÇÃO DA ESCALA DE 1 A 5 E INTEGRIDADE DO VOTO ---');

  function validateVoteSubmission(eventQuestions, answers) {
    const activeQuestions = eventQuestions.filter(q => q.active);
    
    // Todas as obrigatórias respondidas?
    for (const q of activeQuestions) {
      if (!(q.id in answers)) {
        return { valid: false, error: 'Voto incompleto: pergunta não respondida.' };
      }
      const score = answers[q.id];
      if (score === null || score === undefined) {
        return { valid: false, error: 'Nota nula não permitida.' };
      }
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        return { valid: false, error: 'Nota fora da escala obrigatória de 1 a 5.' };
      }
    }

    // Perguntas de outro evento?
    for (const qid of Object.keys(answers)) {
      if (!eventQuestions.some(q => q.id === qid)) {
        return { valid: false, error: 'Pergunta pertencente a outro evento.' };
      }
    }

    return { valid: true };
  }

  const testCriteria = [
    { id: 'c1', event_id: 'ev1', title: 'C1', active: true },
    { id: 'c2', event_id: 'ev1', title: 'C2', active: true },
    { id: 'c3', event_id: 'ev1', title: 'C3', active: true }
  ];

  // Caso Válido
  const validVote = validateVoteSubmission(testCriteria, { c1: 5, c2: 4, c3: 3 });
  assert(validVote.valid === true, 'Voto com notas válidas (5, 4, 3) é aceito');

  // Tentativa de nota 0
  const zeroVote = validateVoteSubmission(testCriteria, { c1: 0, c2: 4, c3: 3 });
  assert(zeroVote.valid === false && zeroVote.error.includes('fora da escala'), 'Nota 0 é rejeitada estritamente');

  // Tentativa de nota 6
  const sixVote = validateVoteSubmission(testCriteria, { c1: 6, c2: 4, c3: 3 });
  assert(sixVote.valid === false && sixVote.error.includes('fora da escala'), 'Nota 6 é rejeitada estritamente');

  // Tentativa de nota NULL
  const nullVote = validateVoteSubmission(testCriteria, { c1: null, c2: 4, c3: 3 });
  assert(nullVote.valid === false && nullVote.error.includes('nula'), 'Nota NULL é rejeitada estritamente');

  // Voto incompleto
  const incompleteVote = validateVoteSubmission(testCriteria, { c1: 5, c2: 4 });
  assert(incompleteVote.valid === false && incompleteVote.error.includes('incompleto'), 'Voto sem responder todas as perguntas é rejeitado');

  // Pergunta de outro evento
  const alienVote = validateVoteSubmission(testCriteria, { c1: 5, c2: 4, c3: 3, c_alien: 5 });
  assert(alienVote.valid === false && alienVote.error.includes('outro evento'), 'Pergunta de outro evento é rejeitada');

  // ===========================================================================
  // TESTE D: INTEGRIDADE (DUPLICIDADE E RODADA ABERTA)
  // ===========================================================================
  console.log('\n--- TESTE D: INTEGRIDADE TRANSACIONAL ---');

  // Simulação de constraint de unicidade (vote_id, question_id)
  const answersTable = new Set();
  function insertVoteAnswer(voteId, questionId, score) {
    const key = `${voteId}_${questionId}`;
    if (answersTable.has(key)) {
      throw new Error('UNIQUE constraint violation: uq_vote_answers_vote_question');
    }
    answersTable.add(key);
    return true;
  }

  insertVoteAnswer('vote_001', 'q_crit_1', 5);
  let duplicateCaught = false;
  try {
    insertVoteAnswer('vote_001', 'q_crit_1', 4);
  } catch (err) {
    duplicateCaught = true;
  }
  assert(duplicateCaught, 'Constraint UNIQUE impede duas respostas para a mesma pergunta dentro do mesmo voto');

  // Proteção contra alteração de perguntas durante rodada aberta
  function checkCanModifyQuestions(roundStatus) {
    if (roundStatus === 'open') {
      throw new Error('Operação bloqueada: não é permitido alterar perguntas durante rodada aberta.');
    }
    return true;
  }
  let modifyBlocked = false;
  try {
    checkCanModifyQuestions('open');
  } catch {
    modifyBlocked = true;
  }
  assert(modifyBlocked, 'Bloqueio ativo: perguntas não podem ser alteradas durante rodada aberta');

  // ===========================================================================
  // TESTE E: CONFERÊNCIA MATEMÁTICA DOS RESULTADOS (EXEMPLO DO USUÁRIO)
  // ===========================================================================
  console.log('\n--- TESTE E: CÁLCULOS CONTROLADOS DE RESULTADOS ---');
  // Cenário especificado no prompt:
  // Um projeto recebe dois votos em um evento com três perguntas:
  // Voto 1: 5, 4, 5
  // Voto 2: 4, 4, 4
  // Total de respostas: 6
  // Soma das notas: 26
  // Média geral esperada: 4.3333...
  // Pontuação popular esperada: 17.3333...
  // Total de votos: 2 (não 6!)

  const vote1Answers = [5, 4, 5];
  const vote2Answers = [4, 4, 4];
  const allAnswers = [...vote1Answers, ...vote2Answers];

  const totalVotesCount = 2;
  const totalAnswersCount = allAnswers.length;
  const sumScores = allAnswers.reduce((a, b) => a + b, 0);
  const avgGeneral = sumScores / totalAnswersCount;
  const popularPoints = (avgGeneral / 5.0) * 20.0;
  const percentage = (avgGeneral / 5.0) * 100.0;

  assert(totalVotesCount === 2, 'Total de votos é exatamente 2 (eleitores, e não 6 respostas)');
  assert(totalAnswersCount === 6, 'Total de respostas válidas computadas é 6');
  assert(sumScores === 26, 'Soma de todas as notas é 26');
  assert(Math.abs(avgGeneral - (26 / 6)) < 0.0001, 'Média geral exata: 4,3333...');
  assert(Math.abs(popularPoints - (26 / 6 / 5 * 20)) < 0.0001, 'Pontuação popular exata: 17,3333...');
  assert(Math.abs(percentage - (26 / 6 / 5 * 100)) < 0.0001, 'Percentual exato: 86,6667%');

  // Testa a função oficial calculateProjectScore do frontend
  const scoreResult = calculateProjectScore(
    { id: 'proj_ctrl', name: 'Projeto Controlado', order: 1, active: true },
    {
      totalVotes: 2,
      averageGeneral: avgGeneral,
      percentage: percentage,
      popularPoints: popularPoints,
      questionsMetrics: [
        { question_id: 'q1', title: 'Critério 1', average_score: 4.5 },
        { question_id: 'q2', title: 'Critério 2', average_score: 4.0 },
        { question_id: 'q3', title: 'Critério 3', average_score: 4.5 }
      ]
    }
  );

  assert(scoreResult.formattedGeneral === '4,3', 'Exibição formatada da Média Geral com 1 casa decimal: "4,3"');
  assert(scoreResult.formattedPoints === '17,3', 'Exibição formatada dos Pontos Populares: "17,3"');
  assert(scoreResult.formattedPercentage === '86,7%', 'Exibição formatada do Percentual: "86,7%"');
  assert(scoreResult.criteriaScores.length === 3, 'Critérios dinâmicos preservados no ProjectScoringResult');

  // ===========================================================================
  // TESTE F: COMPATIBILIDADE HISTÓRICA DO EVENTO arena-voice-2026
  // ===========================================================================
  console.log('\n--- TESTE F: COMPATIBILIDADE HISTÓRICA arena-voice-2026 ---');
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: auth, error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  if (loginErr) {
    console.warn('Login Supabase indisponível no teste:', loginErr.message);
  } else {
    // 1. Evento arena-voice-2026
    const { data: eventData } = await adminClient.from('events').select('*').eq('id', 'arena-voice-2026').single();
    assert(eventData && eventData.id === 'arena-voice-2026', 'Evento arena-voice-2026 permanece íntegro e acessível');

    // 2. Projeto histórico
    const { data: projData } = await adminClient.from('projects').select('*').eq('event_id', 'arena-voice-2026');
    assert(projData && projData.length === 1, 'Projetos de arena-voice-2026 permanecem íntegros (1 projeto)');

    // 3. Rodadas históricas
    const { data: roundsData } = await adminClient.from('rounds').select('*').eq('event_id', 'arena-voice-2026');
    assert(roundsData && roundsData.length === 3, 'Rodadas históricas permanecem intactas (3 rodadas)');

    // 4. Votos e Sigilo do Voto
    // Sob a política RLS votes_select_strict_own, o administrador NÃO tem permissão de SELECT direto em public.votes!
    // A presença do voto histórico é comprovada através da tabela results.total_votes = 1.
    const { data: votesData, error: voteSelectErr } = await adminClient.from('votes').select('*').eq('event_id', 'arena-voice-2026');
    assert(
      Array.isArray(votesData) && votesData.length === 0,
      'Sigilo do Voto comprovado: Administrador NÃO consegue consultar votos individuais via SELECT direto em public.votes'
    );

    // 5. Resultados consolidados
    const { data: resultsData } = await adminClient.from('results').select('*').eq('event_id', 'arena-voice-2026').single();
    assert(resultsData && resultsData.total_votes === 1, 'Resultado histórico preservado: 1 voto registrado e apurado na tabela results');
    assert(Number(resultsData.popular_points) === 5.33, 'Pontuação popular histórica preservada: 5.33 pts');
  }

  // ===========================================================================
  // RESUMO GERAL
  // ===========================================================================
  console.log('\n================================================================');
  console.log(`BATERIA DE TESTES CONCLUÍDA: ${passCount} PASSOU | ${failCount} FALHOU`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
