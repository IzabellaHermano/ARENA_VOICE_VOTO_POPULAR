import assert from 'assert';
import { calculateProjectScore, buildRankedResults, formatScore } from '../src/utils/scoring.ts';
import { buildCSVString, buildExcelString } from '../src/utils/exportReports.ts';

console.log('=== TESTE DE CRITÉRIOS DINÂMICOS NO MÓDULO DE RESULTADOS ===\n');

// 1. Cenário: Evento A (arena-voice-2026 com 3 critérios)
const questionsA = [
  { id: '854120bc-d68b-4ab3-9bb9-97ead043b0e6', title: 'Nível de Inovação', position: 1 },
  { id: 'f502d077-a563-44f5-9511-5562d6bbbaa8', title: 'Impacto do Projeto na CPTM', position: 2 },
  { id: '13a878d3-b6ae-4655-80dc-77be06bb0df8', title: 'Salto de Desenvolvimento do Projeto', position: 3 },
];

// 2. Cenário: Evento B (teste-evento-mwf3or7h com 4 critérios)
const questionsB = [
  { id: 'ceeffabf-2c52-491e-81cf-a6ac767751e2', title: 'teste perg', position: 1 },
  { id: 'ba06c23d-1179-43ec-87ef-60f8497b76b5', title: 'teste prg 2', position: 2 },
  { id: 'f565a360-e49d-439c-990d-4fe5d07a92c6', title: 'teste prg 3', position: 3 },
  { id: '9c18af92-2d76-4877-9fc6-2f1831ed59fd', title: 'teste prg 4', position: 4 },
];

// Teste 1: Projeto com 0 votos no Evento B
console.log('--- Teste 1: Projeto com 0 votos no Evento B (4 critérios) ---');
const proj0Votes = { id: 'p1', name: 'teste proj 1', order: 1, active: true };
const res0Votes = calculateProjectScore(proj0Votes, null, 20, questionsB);

assert.strictEqual(res0Votes.totalVotes, 0);
assert.strictEqual(res0Votes.hasEvaluations, false);
assert.strictEqual(res0Votes.criteriaScores?.length, 4, 'Deve conter 4 critérios mesmo com 0 votos');
assert.strictEqual(res0Votes.criteriaScores[0].title, 'teste perg');
assert.strictEqual(res0Votes.criteriaScores[1].title, 'teste prg 2');
assert.strictEqual(res0Votes.criteriaScores[2].title, 'teste prg 3');
assert.strictEqual(res0Votes.criteriaScores[3].title, 'teste prg 4');
assert.strictEqual(res0Votes.criteriaScores[0].formatted, 'Sem avaliações');
console.log('✔ Projeto com 0 votos inicializa com os 4 critérios exatos do Evento B');

// Teste 2: Projeto avaliado no Evento B com métricas dinâmicas
console.log('\n--- Teste 2: Projeto avaliado no Evento B (4 critérios) ---');
const projB = { id: 'p2', name: 'teste proj 2', order: 2, active: true };
const resultDocB = {
  id: 'teste-evento-mwf3or7h_p2',
  eventId: 'teste-evento-mwf3or7h',
  projectId: 'p2',
  totalVotes: 5,
  averageGeneral: 4.25,
  percentage: 85.0,
  popularPoints: 17.0,
  questionsMetrics: [
    { question_id: 'ceeffabf-2c52-491e-81cf-a6ac767751e2', title: 'teste perg', average_score: 4.4 },
    { question_id: 'ba06c23d-1179-43ec-87ef-60f8497b76b5', title: 'teste prg 2', average_score: 4.2 },
    { question_id: 'f565a360-e49d-439c-990d-4fe5d07a92c6', title: 'teste prg 3', average_score: 4.0 },
    { question_id: '9c18af92-2d76-4877-9fc6-2f1831ed59fd', title: 'teste prg 4', average_score: 4.4 },
  ],
};

const resB = calculateProjectScore(projB, resultDocB, 20, questionsB);
assert.strictEqual(resB.hasEvaluations, true);
assert.strictEqual(resB.totalVotes, 5);
assert.strictEqual(resB.criteriaScores?.length, 4);
assert.strictEqual(resB.criteriaScores[0].formatted, '4,4');
assert.strictEqual(resB.criteriaScores[1].formatted, '4,2');
assert.strictEqual(resB.criteriaScores[2].formatted, '4,0');
assert.strictEqual(resB.criteriaScores[3].formatted, '4,4');
assert.strictEqual(resB.formattedGeneral, '4,3'); // 4.25 formatado
assert.strictEqual(resB.formattedPoints, '17,0');
console.log('✔ Médias dos 4 critérios mapeadas perfeitamente para Evento B');

// Teste 3: Evento A (arena-voice-2026 com 3 critérios)
console.log('\n--- Teste 3: Evento A (arena-voice-2026 com 3 critérios) ---');
const projA = { id: 'pa1', name: 'Projeto Trem Seguro', order: 1, active: true };
const resultDocA = {
  id: 'arena-voice-2026_pa1',
  eventId: 'arena-voice-2026',
  projectId: 'pa1',
  totalVotes: 10,
  averageGeneral: 4.5,
  percentage: 90.0,
  popularPoints: 18.0,
  questionsMetrics: [
    { question_id: '854120bc-d68b-4ab3-9bb9-97ead043b0e6', title: 'Nível de Inovação', average_score: 4.8 },
    { question_id: 'f502d077-a563-44f5-9511-5562d6bbbaa8', title: 'Impacto do Projeto na CPTM', average_score: 4.5 },
    { question_id: '13a878d3-b6ae-4655-80dc-77be06bb0df8', title: 'Salto de Desenvolvimento do Projeto', average_score: 4.2 },
  ],
};

const resA = calculateProjectScore(projA, resultDocA, 20, questionsA);
assert.strictEqual(resA.criteriaScores?.length, 3);
assert.strictEqual(resA.criteriaScores[0].title, 'Nível de Inovação');
assert.strictEqual(resA.criteriaScores[1].title, 'Impacto do Projeto na CPTM');
assert.strictEqual(resA.criteriaScores[2].title, 'Salto de Desenvolvimento do Projeto');
assert.strictEqual(resA.criteriaScores[0].formatted, '4,8');
assert.strictEqual(resA.criteriaScores[1].formatted, '4,5');
assert.strictEqual(resA.criteriaScores[2].formatted, '4,2');
console.log('✔ Evento A mantém compatibilidade integral com seus 3 critérios históricos');

// Teste 4: Evento C hipotético com 5 critérios e peso de 40%
console.log('\n--- Teste 4: Evento C hipotético (5 critérios, peso 40%) ---');
const questionsC = [
  { id: 'q1', title: 'Criatividade da Solução', position: 1 },
  { id: 'q2', title: 'Viabilidade de Implementação', position: 2 },
  { id: 'q3', title: 'Impacto Social', position: 3 },
  { id: 'q4', title: 'Sustentabilidade', position: 4 },
  { id: 'q5', title: 'Potencial de Escalabilidade', position: 5 },
];

const projC = { id: 'pc1', name: 'Projeto InovaVerde', order: 1, active: true };
const resultDocC = {
  id: 'evento-c_pc1',
  eventId: 'evento-c',
  projectId: 'pc1',
  totalVotes: 8,
  questionsMetrics: [
    { question_id: 'q1', title: 'Criatividade da Solução', average_score: 5.0 },
    { question_id: 'q2', title: 'Viabilidade de Implementação', average_score: 4.0 },
    { question_id: 'q3', title: 'Impacto Social', average_score: 4.5 },
    { question_id: 'q4', title: 'Sustentabilidade', average_score: 4.5 },
    { question_id: 'q5', title: 'Potencial de Escalabilidade', average_score: 5.0 },
  ],
};

const resC = calculateProjectScore(projC, resultDocC, 40, questionsC);
assert.strictEqual(resC.criteriaScores?.length, 5);
// Média = (5 + 4 + 4.5 + 4.5 + 5) / 5 = 23 / 5 = 4.6
assert.strictEqual(resC.formattedGeneral, '4,6');
// Pontos de 40% = (4.6 / 5) * 40 = 36.8
assert.strictEqual(resC.formattedPoints, '36,8');
assert.strictEqual(resC.popularVoteWeight, 40);
console.log('✔ Evento com 5 critérios e 40% de peso calcula médias e pontuações corretamente');

// Teste 5: Classificação oficial (buildRankedResults) com múltiplos projetos
console.log('\n--- Teste 5: Classificação oficial com múltiplos projetos e critérios ---');
const projectsList = [
  { id: 'pA', name: 'Projeto Alpha', order: 1 },
  { id: 'pB', name: 'Projeto Beta', order: 2 },
  { id: 'pC', name: 'Projeto Gamma', order: 3 },
];

const resultsMap = new Map();
resultsMap.set('pA', { totalVotes: 10, questionsMetrics: [{ question_id: 'q1', average_score: 4.0 }, { question_id: 'q2', average_score: 4.0 }] });
resultsMap.set('pB', { totalVotes: 10, questionsMetrics: [{ question_id: 'q1', average_score: 4.8 }, { question_id: 'q2', average_score: 4.8 }] });
// pC tem 0 votos

const ranked = buildRankedResults(projectsList, resultsMap, 20, [
  { id: 'q1', title: 'Critério 1', position: 1 },
  { id: 'q2', title: 'Critério 2', position: 2 },
]);

assert.strictEqual(ranked[0].name, 'Projeto Beta', 'Beta deve ser o 1º lugar');
assert.strictEqual(ranked[0].rank, 1);
assert.strictEqual(ranked[1].name, 'Projeto Alpha', 'Alpha deve ser o 2º lugar');
assert.strictEqual(ranked[1].rank, 2);
assert.strictEqual(ranked[2].name, 'Projeto Gamma', 'Gamma sem votos deve ficar sem rank');
assert.strictEqual(ranked[2].rank, null);
assert.strictEqual(ranked[2].criteriaScores?.length, 2, 'Projeto sem votos tem os 2 critérios do evento');
console.log('✔ Ranking classifica corretamente com suporte a critérios dinâmicos');

// Teste 6: Exportação CSV para Evento B (4 critérios)
console.log('\n--- Teste 6: Exportação CSV para Evento B (4 critérios) ---');
const csvB = buildCSVString([resB], 'teste evento', 20, questionsB);
assert(csvB.includes('Média teste perg'), 'CSV deve conter "Média teste perg"');
assert(csvB.includes('Média teste prg 2'), 'CSV deve conter "Média teste prg 2"');
assert(csvB.includes('Média teste prg 3'), 'CSV deve conter "Média teste prg 3"');
assert(csvB.includes('Média teste prg 4'), 'CSV deve conter "Média teste prg 4"');
assert(!csvB.includes('Média Inovação'), 'CSV NÃO deve conter critérios legados');
assert(!csvB.includes('Média Impacto'), 'CSV NÃO deve conter critérios legados');
assert(!csvB.includes('Média Desenvolvimento'), 'CSV NÃO deve conter critérios legados');
console.log('✔ Exportação CSV reflete estritamente os critérios dinâmicos do evento');

// Teste 7: Exportação Excel para Evento C (5 critérios, 40% de peso)
console.log('\n--- Teste 7: Exportação Excel para Evento C (5 critérios, peso 40%) ---');
const xmlC = buildExcelString([resC], 'Evento Inovação Verde', 40, questionsC);
assert(xmlC.includes('Criatividade da Solução (1-5)'), 'Excel deve conter Criatividade');
assert(xmlC.includes('Viabilidade de Implementação (1-5)'), 'Excel deve conter Viabilidade');
assert(xmlC.includes('Impacto Social (1-5)'), 'Excel deve conter Impacto Social');
assert(xmlC.includes('Sustentabilidade (1-5)'), 'Excel deve conter Sustentabilidade');
assert(xmlC.includes('Potencial de Escalabilidade (1-5)'), 'Excel deve conter Escalabilidade');
assert(xmlC.includes('40% da nota'), 'Excel deve indicar 40% da nota');
assert(!xmlC.includes('Inovação (1-5)'), 'Excel NÃO deve conter critérios legados');
console.log('✔ Exportação Excel reflete estritamente os 5 critérios e peso de 40%');

console.log('\nTODOS OS 7 TESTES DE CRITÉRIOS DINÂMICOS PASSARAM COM SUCESSO! 🎉');
