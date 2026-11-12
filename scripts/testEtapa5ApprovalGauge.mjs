/**
 * ARENA VOICE — VOTO POPULAR
 * Validação Técnica Obrigatória da ETAPA 5:
 * Ponteiro Dinâmico de Aprovação (Cálculos Matemáticos, Classificação e Integração Supabase)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

function classifyVote(vote) {
  const inov = Number(vote.innovation ?? vote.innovation_score ?? 0);
  const imp = Number(vote.impact ?? vote.cptm_impact_score ?? 0);
  const dev = Number(vote.development ?? vote.development_score ?? 0);

  const avg = (inov + imp + dev) / 3;
  const roundedAvg = Math.round(avg * 100) / 100;

  if (roundedAvg > 3) {
    return 'positive';
  } else if (roundedAvg === 3) {
    return 'neutral';
  } else {
    return 'negative';
  }
}

function calculateApprovalStats(votes) {
  if (!votes || votes.length === 0) {
    return {
      totalVotes: 0,
      positiveVotes: 0,
      neutralVotes: 0,
      negativeVotes: 0,
      approvalBalance: 0,
      indicator: 50,
      needleAngle: 0,
      tendencyLabel: 'Aguardando votos',
      tendencyColor: 'gray',
    };
  }

  let positiveVotes = 0;
  let neutralVotes = 0;
  let negativeVotes = 0;

  for (const vote of votes) {
    const classification = classifyVote(vote);
    if (classification === 'positive') positiveVotes++;
    else if (classification === 'neutral') neutralVotes++;
    else negativeVotes++;
  }

  const totalVotes = votes.length;
  const approvalBalance = (positiveVotes - negativeVotes) / totalVotes;
  const indicator = Math.min(100, Math.max(0, ((approvalBalance + 1) / 2) * 100));
  const needleAngle = (indicator - 50) * 1.8;

  let tendencyLabel = 'Equilíbrio';
  let tendencyColor = 'gold';

  if (indicator >= 65) {
    tendencyLabel = 'Forte Aprovação';
    tendencyColor = 'green';
  } else if (indicator > 52) {
    tendencyLabel = 'Tendência Positiva';
    tendencyColor = 'green';
  } else if (indicator >= 48) {
    tendencyLabel = 'Neutro / Equilíbrio';
    tendencyColor = 'gold';
  } else if (indicator > 35) {
    tendencyLabel = 'Tendência Negativa';
    tendencyColor = 'red';
  } else {
    tendencyLabel = 'Alta Rejeição';
    tendencyColor = 'red';
  }

  return {
    totalVotes,
    positiveVotes,
    neutralVotes,
    negativeVotes,
    approvalBalance,
    indicator,
    needleAngle,
    tendencyLabel,
    tendencyColor,
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega .env sem bibliotecas externas
const envPath = resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  });
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EVENT_ID = 'arena-voice-2026';

console.log('===========================================================================');
console.log('ARENA VOICE — VOTO POPULAR: VALIDAÇÃO TÉCNICA DA ETAPA 5');
console.log('PONTEIRO DINÂMICO DE APROVAÇÃO E MEDIDOR ANALÓGICO EM TEMPO REAL');
console.log('===========================================================================');

const testResults = [];
function recordResult(code, description, passed, detail) {
  testResults.push({ code, description, passed, detail });
  console.log(`[${passed ? '✅ PASS' : '❌ FAIL'}] ${code}: ${description} -> ${detail}`);
}

async function runTests() {
  try {
    // ----------------------------------------------------
    // TESTE 1: CLASSIFICAÇÃO DE VOTOS INDIVIDUAIS
    // ----------------------------------------------------
    console.log('\n--- 1. CLASSIFICAÇÃO INDIVIDUAL DE VOTOS (MÉDIA DOS 3 CRITÉRIOS) ---');

    // 1.1 Voto Positivo (Média > 3)
    const pos1 = classifyVote({ innovation: 5, impact: 4, development: 5 }); // avg = 4.67
    recordResult('T1.1', 'Classificação de Voto Positivo (5, 4, 5)', pos1 === 'positive', `Classificado como: ${pos1}`);

    const pos2 = classifyVote({ innovation: 4, impact: 4, development: 4 }); // avg = 4.00
    recordResult('T1.2', 'Classificação de Voto Positivo (4, 4, 4)', pos2 === 'positive', `Classificado como: ${pos2}`);

    // 1.2 Voto Neutro (Média == 3)
    const neu1 = classifyVote({ innovation: 3, impact: 3, development: 3 }); // avg = 3.00
    recordResult('T1.3', 'Classificação de Voto Neutro (3, 3, 3)', neu1 === 'neutral', `Classificado como: ${neu1}`);

    const neu2 = classifyVote({ innovation: 2, impact: 3, development: 4 }); // avg = 3.00
    recordResult('T1.4', 'Classificação de Voto Neutro (2, 3, 4)', neu2 === 'neutral', `Classificado como: ${neu2}`);

    // 1.3 Voto Negativo (Média < 3)
    const neg1 = classifyVote({ innovation: 1, impact: 2, development: 2 }); // avg = 1.67
    recordResult('T1.5', 'Classificação de Voto Negativo (1, 2, 2)', neg1 === 'negative', `Classificado como: ${neg1}`);

    const neg2 = classifyVote({ innovation: 2, impact: 2, development: 3 }); // avg = 2.33
    recordResult('T1.6', 'Classificação de Voto Negativo (2, 2, 3)', neg2 === 'negative', `Classificado como: ${neg2}`);

    // ----------------------------------------------------
    // TESTE 2: CÁLCULO DO SALDO, INDICADOR E ÂNGULO DO PONTEIRO
    // ----------------------------------------------------
    console.log('\n--- 2. CÁLCULO MATEMÁTICO DO SALDO, INDICADOR E ÂNGULO ---');

    // 2.1 Sem votos: Centro (50%), 0°, "Aguardando votos"
    const emptyStats = calculateApprovalStats([]);
    const emptyOk =
      emptyStats.totalVotes === 0 &&
      emptyStats.approvalBalance === 0 &&
      emptyStats.indicator === 50 &&
      emptyStats.needleAngle === 0 &&
      emptyStats.tendencyLabel === 'Aguardando votos';
    recordResult(
      'T2.1',
      'Estado Inicial Sem Votos (Indicador: 50%, Ângulo: 0°)',
      emptyOk,
      `Indicador: ${emptyStats.indicator}% | Ângulo: ${emptyStats.needleAngle}° | Label: "${emptyStats.tendencyLabel}"`
    );

    // 2.2 100% Positivo: Saldo +1.0, Indicador 100%, Ângulo +90°
    const allPosStats = calculateApprovalStats([
      { innovation: 5, impact: 5, development: 5 },
      { innovation: 4, impact: 5, development: 4 },
    ]);
    const allPosOk =
      allPosStats.totalVotes === 2 &&
      allPosStats.positiveVotes === 2 &&
      allPosStats.negativeVotes === 0 &&
      allPosStats.approvalBalance === 1 &&
      allPosStats.indicator === 100 &&
      allPosStats.needleAngle === 90;
    recordResult(
      'T2.2',
      'Tendência 100% Positiva (Indicador: 100%, Ângulo: +90°)',
      allPosOk,
      `Saldo: ${allPosStats.approvalBalance} | Indicador: ${allPosStats.indicator}% | Ângulo: ${allPosStats.needleAngle}°`
    );

    // 2.3 100% Negativo: Saldo -1.0, Indicador 0%, Ângulo -90°
    const allNegStats = calculateApprovalStats([
      { innovation: 1, impact: 2, development: 1 },
      { innovation: 2, impact: 2, development: 2 },
    ]);
    const allNegOk =
      allNegStats.totalVotes === 2 &&
      allNegStats.negativeVotes === 2 &&
      allNegStats.approvalBalance === -1 &&
      allNegStats.indicator === 0 &&
      allNegStats.needleAngle === -90;
    recordResult(
      'T2.3',
      'Tendência 100% Negativa (Indicador: 0%, Ângulo: -90°)',
      allNegOk,
      `Saldo: ${allNegStats.approvalBalance} | Indicador: ${allNegStats.indicator}% | Ângulo: ${allNegStats.needleAngle}°`
    );

    // 2.4 Equilíbrio Perfeito (1 Positivo, 1 Negativo, 1 Neutro): Saldo 0, Indicador 50%, Ângulo 0°
    const balancedStats = calculateApprovalStats([
      { innovation: 5, impact: 5, development: 5 }, // pos
      { innovation: 1, impact: 1, development: 1 }, // neg
      { innovation: 3, impact: 3, development: 3 }, // neu
    ]);
    const balancedOk =
      balancedStats.totalVotes === 3 &&
      balancedStats.positiveVotes === 1 &&
      balancedStats.negativeVotes === 1 &&
      balancedStats.neutralVotes === 1 &&
      balancedStats.approvalBalance === 0 &&
      balancedStats.indicator === 50 &&
      balancedStats.needleAngle === 0;
    recordResult(
      'T2.4',
      'Equilíbrio Perfeito (1 Positivo, 1 Negativo, 1 Neutro -> 50%, 0°)',
      balancedOk,
      `Saldo: ${balancedStats.approvalBalance} | Indicador: ${balancedStats.indicator}% | Ângulo: ${balancedStats.needleAngle}°`
    );

    // 2.5 Caso Real Misto (3 Positivos, 1 Negativo):
    // Saldo = (3 - 1) / 4 = +0.50
    // Indicador = ((0.50 + 1) / 2) * 100 = 75.0%
    // Ângulo = (75 - 50) * 1.8 = +45.0° (Faixa Verde Claro)
    const mixedStats = calculateApprovalStats([
      { innovation: 5, impact: 4, development: 5 }, // pos
      { innovation: 4, impact: 4, development: 4 }, // pos
      { innovation: 4, impact: 3, development: 4 }, // pos (avg = 3.67)
      { innovation: 2, impact: 1, development: 2 }, // neg (avg = 1.67)
    ]);
    const mixedOk =
      mixedStats.totalVotes === 4 &&
      mixedStats.positiveVotes === 3 &&
      mixedStats.negativeVotes === 1 &&
      mixedStats.approvalBalance === 0.5 &&
      mixedStats.indicator === 75 &&
      mixedStats.needleAngle === 45;
    recordResult(
      'T2.5',
      'Caso Misto Ponderado (3 Pos, 1 Neg -> Saldo: +50%, Indicador: 75%, Ângulo: +45°)',
      mixedOk,
      `Saldo: ${mixedStats.approvalBalance} | Indicador: ${mixedStats.indicator}% | Ângulo: ${mixedStats.needleAngle}°`
    );

    // ----------------------------------------------------
    // TESTE 3: INTEGRAÇÃO COM SUPABASE REAL
    // ----------------------------------------------------
    console.log('\n--- 3. INTEGRAÇÃO E LEITURA COM DADOS REAIS DO SUPABASE ---');
    const adminClient = createClient(supabaseUrl, supabaseAnonKey);
    await adminClient.auth.signInWithPassword({
      email: 'admin@cptm.sp.gov.br',
      password: '123456',
    });

    // 3.1 Consulta dos votos reais do Projeto de Homologação
    const { data: dbVotesE4, error: e4Err } = await adminClient
      .from('votes')
      .select('innovation, impact, development, round_id')
      .eq('event_id', EVENT_ID)
      .eq('project_id', 'proj_homologacao_e4');

    const e4Stats = calculateApprovalStats(dbVotesE4 || []);
    const e4Ok =
      !e4Err &&
      e4Stats.totalVotes === 2 &&
      e4Stats.positiveVotes === 2 &&
      e4Stats.indicator === 100 &&
      e4Stats.needleAngle === 90;
    recordResult(
      'T3.1',
      'Ponteiro do Projeto Homologação Etapa 4 no Supabase (2 votos positivos)',
      e4Ok,
      `Total: ${e4Stats.totalVotes} | Indicador: ${e4Stats.indicator}% | Ângulo: +${e4Stats.needleAngle}°`
    );

    // 3.2 Consulta dos votos reais do Projeto 01
    const { data: dbVotesP1, error: p1Err } = await adminClient
      .from('votes')
      .select('innovation, impact, development, round_id')
      .eq('event_id', EVENT_ID)
      .eq('project_id', 'projeto01');

    const p1Stats = calculateApprovalStats(dbVotesP1 || []);
    const p1Ok =
      !p1Err &&
      p1Stats.totalVotes === 6 &&
      p1Stats.positiveVotes === 5 &&
      p1Stats.neutralVotes === 1 &&
      p1Stats.negativeVotes === 0;
    recordResult(
      'T3.2',
      'Ponteiro do Projeto 01 no Supabase (6 votos: 5 positivos, 1 neutro)',
      p1Ok,
      `Total: ${p1Stats.totalVotes} | Saldo: +${(p1Stats.approvalBalance * 100).toFixed(0)}% | Indicador: ${p1Stats.indicator.toFixed(1)}% | Ângulo: +${p1Stats.needleAngle.toFixed(1)}°`
    );
  } catch (err) {
    console.error('Erro na execução dos testes:', err);
    recordResult('FATAL', 'Execução dos testes do Ponteiro Dinâmico', false, err.message);
  }

  console.log('\n===========================================================================');
  const allPassed = testResults.every((t) => t.passed);
  console.log(
    `TOTAL DE TESTES: ${testResults.length} | APROVADOS: ${testResults.filter((t) => t.passed).length} | FALHAS: ${
      testResults.filter((t) => !t.passed).length
    }`
  );
  console.log(`STATUS DO PONTEIRO DINÂMICO: ${allPassed ? '✅ 100% APROVADO' : '❌ REPROVADO'}`);
  console.log('===========================================================================');

  if (!allPassed) process.exit(1);
}

runTests();
