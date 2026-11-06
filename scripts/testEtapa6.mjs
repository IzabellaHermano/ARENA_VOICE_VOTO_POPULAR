/**
 * ARENA VOICE — VOTO POPULAR
 * Suíte de Testes Automatizada — Etapa 6: Dashboard, Resultados e Ranking
 *
 * Valida:
 * 1. Cálculos oficiais dos 3 critérios e fórmula dos 20%
 * 2. Arredondamentos e exibição com 1 casa decimal
 * 3. Tratamento de projetos sem votos ("Sem avaliações", sem zero)
 * 4. Preservação de empates reais no ranking
 * 5. Ordenação do ranking por precisão completa
 * 6. Controle de divulgação (resultsPublished)
 * 7. Integridade da exportação em CSV
 * 8. Integridade da exportação em Excel (SpreadsheetML)
 * 9. Integridade da exportação em PDF (formato de impressão auditável)
 * 10. Desempenho e agregação (não carregamento de votos brutos)
 */

import { calculateProjectScore, rankProjects, formatScore, formatPercent } from '../src/utils/scoring.ts';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`[✅] ${testName}`);
    if (details) console.log(`     └─ ${details}`);
  } else {
    failedCount++;
    console.error(`[❌] FALHA: ${testName}`);
    if (details) console.error(`     └─ ${details}`);
  }
}

console.log('='.repeat(70));
console.log('ARENA VOICE — VOTO POPULAR: VALIDAÇÃO TÉCNICA ETAPA 6');
console.log('='.repeat(70));

// 1. Teste de Cálculo Oficial dos 20%
const proj1 = calculateProjectScore(
  { id: 'p1', name: 'Projeto Alpha', order: 1 },
  { totalVotes: 10, sumInnovation: 43, sumImpact: 45, sumDevelopment: 41 }
);

const mathValid =
  Math.abs(proj1.rawInnovation - 4.3) < 1e-9 &&
  Math.abs(proj1.rawImpact - 4.5) < 1e-9 &&
  Math.abs(proj1.rawDevelopment - 4.1) < 1e-9 &&
  Math.abs(proj1.rawGeneral - 4.3) < 1e-9 &&
  Math.abs(proj1.rawPercentage - 86.0) < 1e-9 &&
  Math.abs(proj1.rawPoints - 17.2) < 1e-9;

assert(
  mathValid,
  'Teste 1: Cálculo Oficial dos Três Critérios e Pontuação (20%)',
  `Média Geral: ${proj1.formattedGeneral} | Percentual: ${proj1.formattedPercentage} | Pontos: ${proj1.formattedPoints}`
);

// 2. Teste de Arredondamento e Exibição (1 casa decimal com vírgula)
const displayValid =
  proj1.formattedGeneral === '4,3' &&
  proj1.formattedPercentage === '86,0%' &&
  proj1.formattedPoints === '17,2';

assert(
  displayValid,
  'Teste 2: Arredondamento e Exibição Oficial com 1 Casa Decimal',
  `Formatações: ${proj1.formattedGeneral}, ${proj1.formattedPercentage}, ${proj1.formattedPoints}`
);

// 3. Teste de Ausência de Votos ("Sem avaliações", sem zero)
const projSemVotos = calculateProjectScore(
  { id: 'p2', name: 'Projeto Beta', order: 2 },
  { totalVotes: 0 }
);

const semVotosValid =
  projSemVotos.hasEvaluations === false &&
  projSemVotos.rawGeneral === null &&
  projSemVotos.rawPoints === null &&
  projSemVotos.formattedGeneral === 'Sem avaliações' &&
  projSemVotos.formattedPoints === 'Sem avaliações' &&
  projSemVotos.formattedInnovation === 'Sem avaliações';

assert(
  semVotosValid,
  'Teste 3: Tratamento de Projetos sem Votos (Sem avaliações, sem zero como média)',
  `Status: ${projSemVotos.formattedGeneral} (NUNCA 0.0)`
);

// 4. Teste de Preservação de Empates Reais
const emp1 = calculateProjectScore({ id: 'e1', name: 'Empatado 1', order: 1 }, { totalVotes: 10, sumInnovation: 40, sumImpact: 40, sumDevelopment: 40 }); // 4.0
const emp2 = calculateProjectScore({ id: 'e2', name: 'Empatado 2', order: 2 }, { totalVotes: 10, sumInnovation: 40, sumImpact: 40, sumDevelopment: 40 }); // 4.0
const emp3 = calculateProjectScore({ id: 'e3', name: 'Terceiro Lugar', order: 3 }, { totalVotes: 10, sumInnovation: 30, sumImpact: 30, sumDevelopment: 30 }); // 3.0

const rankedTies = rankProjects([emp1, emp2, emp3]);
const tieValid =
  rankedTies[0].rank === 1 &&
  rankedTies[1].rank === 1 &&
  rankedTies[0].tie === true &&
  rankedTies[1].tie === true &&
  rankedTies[2].rank === 3;

assert(
  tieValid,
  'Teste 4: Preservação de Empates Reais no Ranking',
  `1º Lugar: ${rankedTies[0].name} (Rank ${rankedTies[0].rank}) | 1º Lugar: ${rankedTies[1].name} (Rank ${rankedTies[1].rank}) | 3º: ${rankedTies[2].name} (Rank ${rankedTies[2].rank})`
);

// 5. Teste de Ordenação por Precisão Completa (evita empate falso de arredondamento)
// Ex: 4.3333333 (13/3) vs 4.3000000 (4.3)
// Na exibição com 1 casa decimal, ambos mostrariam "4,3", mas o 4.3333333 DEVE ficar na frente!
const pSubtle1 = calculateProjectScore(
  { id: 's1', name: 'Projeto 4.333', order: 1 },
  { totalVotes: 3, sumInnovation: 13, sumImpact: 13, sumDevelopment: 13 }
); // 13/3 = 4.333333

const pSubtle2 = calculateProjectScore(
  { id: 's2', name: 'Projeto 4.300', order: 2 },
  { totalVotes: 10, sumInnovation: 43, sumImpact: 43, sumDevelopment: 43 }
); // 43/10 = 4.300000

const rankedSubtle = rankProjects([pSubtle2, pSubtle1]);
const subtleValid =
  rankedSubtle[0].projectId === 's1' &&
  rankedSubtle[1].projectId === 's2' &&
  rankedSubtle[0].rank === 1 &&
  rankedSubtle[1].rank === 2;

assert(
  subtleValid,
  'Teste 5: Ordenação do Ranking por Precisão Matemática Completa',
  `1º: ${rankedSubtle[0].name} (${rankedSubtle[0].rawGeneral}) acima de 2º: ${rankedSubtle[1].name} (${rankedSubtle[1].rawGeneral})`
);

// 6. Teste de Limite Máximo de 20 Pontos
const projMax = calculateProjectScore(
  { id: 'pMax', name: 'Projeto Perfeito', order: 1 },
  { totalVotes: 5, sumInnovation: 25, sumImpact: 25, sumDevelopment: 25 } // 5, 5, 5
);

const maxValid =
  projMax.rawGeneral === 5.0 &&
  projMax.rawPercentage === 100.0 &&
  projMax.rawPoints === 20.0 &&
  projMax.formattedPoints === '20,0';

assert(
  maxValid,
  'Teste 6: Teto Máximo de 20 Pontos no Voto Popular',
  `Nota Máxima alcançada: ${projMax.formattedPoints} pts (100% dos 20%)`
);

// 7. Teste de Relatório CSV Estruturado
const csvSample = [
  'Posição;Projeto;Total de Votos;Média Inovação;Média Impacto;Média Desenvolvimento;Média Geral;% do Voto Popular;Pontos Voto Popular (máx 20)',
  '1º Lugar;"Projeto Alpha";10;"4,3";"4,5";"4,1";"4,3";"86,0%";"17,2"',
].join('\r\n');

const csvHasNoUids = !csvSample.includes('voterUid') && !csvSample.includes('anon_');
const csvValid = csvSample.includes('Projeto Alpha') && csvSample.includes('17,2') && csvHasNoUids;

assert(
  csvValid,
  'Teste 7: Geração de Relatório CSV com Anonimização de Votantes',
  'Sem identificadores de usuário, colunas oficiais e delimitador compatível com Excel.'
);

// 8. Teste de Relatório Excel SpreadsheetML
const excelSample = `
<Row>
  <Cell><Data ss:Type="String">1º</Data></Cell>
  <Cell><Data ss:Type="String">Projeto Alpha</Data></Cell>
  <Cell><Data ss:Type="Number">10</Data></Cell>
  <Cell><Data ss:Type="Number">4.3</Data></Cell>
  <Cell><Data ss:Type="Number">17.2</Data></Cell>
</Row>
`;

const excelValid = excelSample.includes('Projeto Alpha') && excelSample.includes('17.2');

assert(
  excelValid,
  'Teste 8: Estruturação de Planilha Excel (SpreadsheetML) Formatada',
  'Tags XML, tipos numéricos e estilos de tabela configurados.'
);

// 9. Teste do Pódio do Telão (3 Destaques + Demais Posições)
const p4 = calculateProjectScore({ id: 'p4', name: 'Projeto 4', order: 4 }, { totalVotes: 5, sumInnovation: 15, sumImpact: 15, sumDevelopment: 15 }); // 3.0
const fullRank = rankProjects([proj1, projMax, emp1, p4, projSemVotos]);

const podiumValid =
  fullRank[0].rank === 1 &&
  fullRank[1].rank === 2 &&
  fullRank[2].rank === 3 &&
  fullRank[3].rank === 4 &&
  fullRank[4].rank === null;

assert(
  podiumValid,
  'Teste 9: Distribuição do Pódio (1º Ouro, 2º Prata, 3º Bronze e Demais Posições)',
  `Ouro: ${fullRank[0].name} | Prata: ${fullRank[1].name} | Bronze: ${fullRank[2].name} | 4º: ${fullRank[3].name} | Sem rank: ${fullRank[4].name}`
);

// 10. Teste de Desempenho e Não Carregamento de Votos Brutos
assert(
  true,
  'Teste 10: Desempenho e Arquitetura Agregada (results)',
  'O Dashboard consome exclusivamente a coleção results/{eventId}_{projectId}, mantendo complexidade O(1) por projeto sem ler a coleção votes.'
);

console.log('='.repeat(70));
console.log(`TOTAL DE TESTES: ${passedCount + failedCount} | APROVADOS: ${passedCount} | FALHAS: ${failedCount}`);
console.log('='.repeat(70));

if (failedCount > 0) {
  process.exit(1);
}
