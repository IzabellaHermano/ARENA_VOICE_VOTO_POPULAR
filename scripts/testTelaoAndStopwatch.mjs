/**
 * ARENA VOICE — VOTO POPULAR
 * Validação Técnica Automatizada: Telão Interativo, Ponteiro Dinâmico e Cronômetro
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Funções de Cálculo idênticas às de src/utils/approvalCalculator.ts
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

function calculateApprovalStats(votes = [], preAggregated) {
  const hasVotes = Array.isArray(votes) && votes.length > 0;
  const hasPreAgg = Boolean(preAggregated && typeof preAggregated.totalVotes === 'number' && preAggregated.totalVotes > 0);

  if (!hasVotes && !hasPreAgg) {
    return {
      totalVotes: 0,
      positiveVotes: 0,
      neutralVotes: 0,
      negativeVotes: 0,
      averageGeneral: 3.0,
      scalePercent: 0,
      indicator: 50,
      needleAngle: 0,
      tendencyLabel: 'AGUARDANDO PRIMEIROS VOTOS',
      tendencyColor: 'gray',
    };
  }

  let positiveVotes = 0;
  let neutralVotes = 0;
  let negativeVotes = 0;
  let sumAverages = 0;

  if (hasVotes) {
    for (const vote of votes) {
      const inov = Number(vote.innovation ?? vote.innovation_score ?? 0);
      const imp = Number(vote.impact ?? vote.cptm_impact_score ?? 0);
      const dev = Number(vote.development ?? vote.development_score ?? 0);
      const individualAvg = (inov + imp + dev) / 3;
      sumAverages += individualAvg;

      const classification = classifyVote(vote);
      if (classification === 'positive') positiveVotes++;
      else if (classification === 'neutral') neutralVotes++;
      else negativeVotes++;
    }
  }

  const totalVotes = hasVotes ? votes.length : (preAggregated?.totalVotes || 0);

  let averageGeneral = 3.0;
  if (hasVotes && totalVotes > 0) {
    averageGeneral = Math.round((sumAverages / totalVotes) * 100) / 100;
  } else if (hasPreAgg && preAggregated?.averageGeneral !== undefined) {
    averageGeneral = Math.round(Number(preAggregated.averageGeneral) * 100) / 100;
  }

  averageGeneral = Math.min(5, Math.max(1, averageGeneral));
  const scalePercent = Math.round((((averageGeneral - 3) / 2) * 100) * 10) / 10;
  const indicator = Math.min(100, Math.max(0, Math.round(((scalePercent + 100) / 2) * 10) / 10));
  const needleAngle = Math.round(scalePercent * 0.9 * 10) / 10;

  let tendencyLabel = 'EQUILÍBRIO';
  let tendencyColor = 'gold';

  if (averageGeneral >= 4.2) {
    tendencyLabel = 'FORTE APROVAÇÃO';
    tendencyColor = 'green';
  } else if (averageGeneral > 3.2) {
    tendencyLabel = 'TENDÊNCIA POSITIVA';
    tendencyColor = 'green';
  } else if (averageGeneral >= 2.8) {
    tendencyLabel = 'EQUILÍBRIO';
    tendencyColor = 'gold';
  } else if (averageGeneral > 1.8) {
    tendencyLabel = 'TENDÊNCIA NEGATIVA';
    tendencyColor = 'red';
  } else {
    tendencyLabel = 'ALTA REJEIÇÃO';
    tendencyColor = 'red';
  }

  return {
    totalVotes,
    positiveVotes,
    neutralVotes,
    negativeVotes,
    averageGeneral,
    scalePercent,
    indicator,
    needleAngle,
    tendencyLabel,
    tendencyColor,
  };
}

function parseRoundStartMillis(startedAt) {
  if (!startedAt) return 0;
  if (typeof startedAt === 'number') {
    return startedAt < 100000000000 ? startedAt * 1000 : startedAt;
  }
  if (typeof startedAt === 'string') {
    const parsed = new Date(startedAt).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof startedAt === 'object') {
    if (typeof startedAt.toMillis === 'function') {
      return startedAt.toMillis();
    }
    if (typeof startedAt.seconds === 'number') {
      return startedAt.seconds * 1000 + (startedAt.nanoseconds ? Math.floor(startedAt.nanoseconds / 1000000) : 0);
    }
    if (startedAt instanceof Date) {
      return startedAt.getTime();
    }
  }
  return 0;
}

function formatStopwatch(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega variáveis de ambiente
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
console.log('ARENA VOICE — VOTO POPULAR: VALIDAÇÃO DO TELÃO, PONTEIRO E CRONÔMETRO');
console.log('===========================================================================');

let passCount = 0;
let failCount = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`  ✓ [APROVADO] ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ [FALHA] ${message} -> ${detail}`);
    failCount++;
  }
}

async function runTests() {
  // ----------------------------------------------------
  // TESTE 1: AUDITORIA E CORREÇÃO DO CRONÔMETRO
  // ----------------------------------------------------
  console.log('\n--- 1. AUDITORIA E CORREÇÃO DO CRONÔMETRO (Eliminação de 29908255:39) ---');

  // 1.1 Objeto estilo Firestore ({ seconds, nanoseconds }) sem toMillis()
  const fakeOldFirestoreObj = { seconds: 1762959131, nanoseconds: 0 };
  const parsedFromObj = parseRoundStartMillis(fakeOldFirestoreObj);
  assert(parsedFromObj === 1762959131000, 'Parsing de objeto { seconds: 1762959131 } retorna timestamp em ms correto', `${parsedFromObj}`);

  // 1.2 Simulação do bug anterior (onde startMillis ficava 0)
  const simulatedStartMillis = parsedFromObj;
  const simulatedNow = 1762959131000 + (12 * 60 + 35) * 1000; // 12 minutos e 35 segundos depois
  const elapsed = Math.floor((simulatedNow - simulatedStartMillis) / 1000);
  assert(elapsed === 755, 'Tempo decorrido calculado corretamente em 755 segundos (12 min e 35 seg)', `${elapsed}`);

  // 1.3 Formatação HH:MM:SS (00:12:35)
  const formatted = formatStopwatch(elapsed);
  assert(formatted === '00:12:35', 'Formatação do cronômetro estritamente no padrão 00:00:00 (00:12:35)', `${formatted}`);

  // 1.4 String ISO 8601 (como vem do PostgreSQL timestamptz)
  const isoDate = '2026-11-12T14:52:11.423102+00:00';
  const parsedFromIso = parseRoundStartMillis(isoDate);
  assert(parsedFromIso > 0 && !isNaN(parsedFromIso), 'Parsing de string ISO timestamptz do Supabase retorna millis válidos', `${parsedFromIso}`);

  // 1.5 Timestamp com zero ou null
  assert(parseRoundStartMillis(null) === 0, 'Timestamp nulo retorna 0 com segurança');

  // ----------------------------------------------------
  // TESTE 2: REGRAS MATEMÁTICAS DO PONTEIRO DINÂMICO DO TELÃO
  // ----------------------------------------------------
  console.log('\n--- 2. REGRAS MATEMÁTICAS DO PONTEIRO DO TELÃO (Escala -100% a +100%) ---');

  // 2.1 Sem votos: centro vertical (0°), escala 0%, rótulo "AGUARDANDO PRIMEIROS VOTOS"
  const emptyStats = calculateApprovalStats([]);
  assert(
    emptyStats.totalVotes === 0 &&
    emptyStats.needleAngle === 0 &&
    emptyStats.scalePercent === 0 &&
    emptyStats.tendencyLabel === 'AGUARDANDO PRIMEIROS VOTOS',
    'Sem votos: Ponteiro no centro (0° / 0%) indicando "AGUARDANDO PRIMEIROS VOTOS"'
  );

  // 2.2 Média 1.0 -> Escala -100% -> Ângulo -90° (Extrema Esquerda)
  const allScore1 = calculateApprovalStats([
    { innovation: 1, impact: 1, development: 1 },
    { innovation: 1, impact: 1, development: 1 },
  ]);
  assert(
    allScore1.averageGeneral === 1.0 &&
    allScore1.scalePercent === -100 &&
    allScore1.needleAngle === -90 &&
    allScore1.negativeVotes === 2 &&
    allScore1.positiveVotes === 0,
    'Média 1.00: Escala -100%, Ângulo -90° (Extrema Esquerda), 100% negativos'
  );

  // 2.3 Média 2.0 -> Escala -50% -> Ângulo -45°
  const avg2 = calculateApprovalStats([
    { innovation: 2, impact: 2, development: 2 },
  ]);
  assert(
    avg2.averageGeneral === 2.0 &&
    avg2.scalePercent === -50 &&
    avg2.needleAngle === -45,
    'Média 2.00: Escala -50%, Ângulo -45° (Região Negativa)'
  );

  // 2.4 Média 3.0 -> Escala 0% -> Ângulo 0° (Equilíbrio / Neutro)
  const avg3 = calculateApprovalStats([
    { innovation: 3, impact: 3, development: 3 },
    { innovation: 2, impact: 3, development: 4 }, // média (2+3+4)/3 = 3.0
  ]);
  assert(
    avg3.averageGeneral === 3.0 &&
    avg3.scalePercent === 0 &&
    avg3.needleAngle === 0 &&
    avg3.neutralVotes === 2 &&
    avg3.tendencyLabel === 'EQUILÍBRIO',
    'Média 3.00: Escala 0%, Ângulo 0° (Centro / Equilíbrio), 2 votos neutros'
  );

  // 2.5 Média 4.0 -> Escala +50% -> Ângulo +45°
  const avg4 = calculateApprovalStats([
    { innovation: 4, impact: 4, development: 4 },
  ]);
  assert(
    avg4.averageGeneral === 4.0 &&
    avg4.scalePercent === 50 &&
    avg4.needleAngle === 45 &&
    avg4.positiveVotes === 1,
    'Média 4.00: Escala +50%, Ângulo +45° (Região Positiva)'
  );

  // 2.6 Média 5.0 -> Escala +100% -> Ângulo +90° (Extrema Direita)
  const allScore5 = calculateApprovalStats([
    { innovation: 5, impact: 5, development: 5 },
    { innovation: 5, impact: 5, development: 5 },
  ]);
  assert(
    allScore5.averageGeneral === 5.0 &&
    allScore5.scalePercent === 100 &&
    allScore5.needleAngle === 90 &&
    allScore5.positiveVotes === 2,
    'Média 5.00: Escala +100%, Ângulo +90° (Extrema Direita), 100% positivos'
  );

  // 2.7 Votos Mistos: Soma dos sentimentos deve ser igual ao total
  const mixedVotes = [
    { innovation: 5, impact: 4, development: 5 }, // média 4.67 (positivo)
    { innovation: 3, impact: 3, development: 3 }, // média 3.00 (neutro)
    { innovation: 1, impact: 2, development: 2 }, // média 1.67 (negativo)
    { innovation: 4, impact: 4, development: 4 }, // média 4.00 (positivo)
  ];
  const mixedStats = calculateApprovalStats(mixedVotes);
  const sumSentiments = mixedStats.positiveVotes + mixedStats.neutralVotes + mixedStats.negativeVotes;
  assert(
    sumSentiments === mixedStats.totalVotes && mixedStats.totalVotes === 4,
    `Classificação exata: Positivos (${mixedStats.positiveVotes}) + Neutros (${mixedStats.neutralVotes}) + Negativos (${mixedStats.negativeVotes}) = Total (${mixedStats.totalVotes})`
  );

  // ----------------------------------------------------
  // TESTE 3: INTEGRAÇÃO SUPABASE E LEITURA PÚBLICA SEGURA
  // ----------------------------------------------------
  console.log('\n--- 3. INTEGRAÇÃO SUPABASE E LEITURA PÚBLICA SEGURA ---');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // 3.1 Consulta pública da tabela events
  const { data: eventData, error: evErr } = await anonClient.from('events').select('*').eq('id', EVENT_ID).single();
  assert(!evErr && eventData?.id === EVENT_ID, 'Telão público lê tabela events com sucesso via Supabase');

  // 3.2 Consulta pública da tabela projects
  const { data: projsData, error: prjErr } = await anonClient.from('projects').select('*').eq('event_id', EVENT_ID);
  assert(!prjErr && projsData?.length > 0, `Telão público lê ${projsData?.length} projetos cadastrados com sucesso`);

  // 3.3 Consulta pública da tabela rounds
  const { data: roundsData, error: rndErr } = await anonClient.from('rounds').select('*').eq('event_id', EVENT_ID);
  assert(!rndErr && Array.isArray(roundsData), `Telão público lê tabela rounds com sucesso (${roundsData?.length} rodadas)`);

  // 3.4 Consulta pública da tabela results (totais consolidados)
  const { data: resultsData, error: resErr } = await anonClient.from('results').select('*').eq('event_id', EVENT_ID);
  assert(!resErr, 'Telão público lê tabela results sem bloqueio RLS');

  // 3.5 Garantia de Privacidade: Votos individuais NÃO são expostos publicamente
  const { data: anonVotes } = await anonClient.from('votes').select('*');
  assert(anonVotes?.length === 0, 'Segurança RLS ativa: Votos individuais NÃO são expostos para usuários não autenticados');

  console.log('\n===========================================================================');
  console.log(`TOTAL DE TESTES: ${passCount + failCount} | APROVADOS: ${passCount} | FALHAS: ${failCount}`);
  console.log('===========================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});

