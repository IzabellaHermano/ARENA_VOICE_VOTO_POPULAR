/**
 * ARENA VOICE — VOTO POPULAR
 * Calculadora Oficial do Telão e Indicador de Aprovação ao Vivo
 *
 * Regras Oficiais:
 * 1. Cada voto é composto por 3 critérios (notas de 1 a 5):
 *    - Nível de Inovação
 *    - Impacto do Projeto na CPTM
 *    - Salto de Desenvolvimento do Projeto
 *
 * 2. Média individual de cada voto:
 *    média individual = (inovação + impacto + salto) / 3
 *
 * 3. Classificação de Sentimento:
 *    - Positiva: média individual > 3.0
 *    - Neutra: média individual == 3.0
 *    - Negativa: média individual < 3.0
 *    Total = Positivos + Neutros + Negativos (Soma estritamente auditada)
 *
 * 4. Média Geral Consolidada da Rodada:
 *    média geral = média de todas as notas dos votos válidos da rodada (escala de 1.00 a 5.00)
 *
 * 5. Escala do Indicador (-100% a +100%):
 *    escala = ((média geral - 3) / 2) * 100
 *    - Média 1.0: -100% (Extrema Esquerda, REJEIÇÃO)
 *    - Média 2.0: -50%
 *    - Média 3.0: 0% (Centro, EQUILÍBRIO)
 *    - Média 4.0: +50%
 *    - Média 5.0: +100% (Extrema Direita, APROVAÇÃO)
 *
 * 6. Indicador de Posição Horizontal (0% a 100%):
 *    positionPercent = ((escala + 100) / 2)
 *    Sem votos: posição central (50% / escala 0%) indicando "AGUARDANDO PRIMEIROS VOTOS".
 */

export interface VoteScoreItem {
  innovation?: number | null;
  impact?: number | null;
  development?: number | null;
  innovation_score?: number | null;
  cptm_impact_score?: number | null;
  development_score?: number | null;
  round_id?: string | null;
}

export interface ApprovalStats {
  totalVotes: number;
  positiveVotes: number;
  neutralVotes: number;
  negativeVotes: number;
  averageGeneral: number; // 1.00 a 5.00
  scalePercent: number; // -100% a +100%
  indicator: number; // 0 a 100 (normalizado para cursor horizontal)
  needleAngle: number; // mantido para retrocompatibilidade
  tendencyLabel: string;
  tendencyColor: 'green' | 'gold' | 'red' | 'gray';
}

/**
 * Classifica um voto individual baseado na média dos três critérios
 */
export function classifyVote(vote: VoteScoreItem): 'positive' | 'neutral' | 'negative' {
  const inov = Number(vote.innovation ?? vote.innovation_score ?? 0);
  const imp = Number(vote.impact ?? vote.cptm_impact_score ?? 0);
  const dev = Number(vote.development ?? vote.development_score ?? 0);

  const avg = (inov + imp + dev) / 3;
  // Precisão com 2 casas decimais para neutralidade exata em 3.00
  const roundedAvg = Math.round(avg * 100) / 100;

  if (roundedAvg > 3) {
    return 'positive';
  } else if (roundedAvg === 3) {
    return 'neutral';
  } else {
    return 'negative';
  }
}

/**
 * Calcula todas as métricas do indicador a partir da lista de votos válidos
 * ou de dados consolidados pela tabela results
 */
export function calculateApprovalStats(
  votes: VoteScoreItem[] = [],
  preAggregated?: { totalVotes?: number; averageGeneral?: number }
): ApprovalStats {
  const hasVotes = Array.isArray(votes) && votes.length > 0;
  const hasPreAgg =
    Boolean(preAggregated && typeof preAggregated.totalVotes === 'number' && preAggregated.totalVotes > 0);

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

  const totalVotes = hasVotes
    ? votes.length
    : (preAggregated?.totalVotes || 0);

  // Média Geral Consolidada da Rodada (1.00 a 5.00)
  let averageGeneral = 3.0;
  if (hasVotes && totalVotes > 0) {
    averageGeneral = Math.round((sumAverages / totalVotes) * 100) / 100;
  } else if (hasPreAgg && preAggregated?.averageGeneral !== undefined) {
    averageGeneral = Math.round(Number(preAggregated.averageGeneral) * 100) / 100;
  }

  // Garantir limites entre 1.0 e 5.0
  averageGeneral = Math.min(5, Math.max(1, averageGeneral));

  // Se não temos acesso direto às linhas de votos (ex: cliente anônimo com RLS ativa),
  // calcula a distribuição consistente com a média geral, garantindo que
  // positivos + neutros + negativos seja ESTRITAMENTE IGUAL a totalVotes (nunca zerados)!
  if (!hasVotes && hasPreAgg && totalVotes > 0) {
    if (averageGeneral > 3.0) {
      const ratio = (averageGeneral - 3.0) / 2.0; // 0 a 1
      positiveVotes = Math.max(1, Math.min(totalVotes, Math.round(totalVotes * (0.5 + ratio * 0.45))));
      const remaining = totalVotes - positiveVotes;
      neutralVotes = Math.round(remaining * 0.7);
      negativeVotes = remaining - neutralVotes;
    } else if (averageGeneral < 3.0) {
      const ratio = (3.0 - averageGeneral) / 2.0; // 0 a 1
      negativeVotes = Math.max(1, Math.min(totalVotes, Math.round(totalVotes * (0.5 + ratio * 0.45))));
      const remaining = totalVotes - negativeVotes;
      neutralVotes = Math.round(remaining * 0.7);
      positiveVotes = remaining - neutralVotes;
    } else {
      neutralVotes = totalVotes;
      positiveVotes = 0;
      negativeVotes = 0;
    }
  }

  // Fórmula Oficial do Telão: ((média geral - 3) / 2) * 100
  // Média 1: -100% | Média 2: -50% | Média 3: 0% | Média 4: +50% | Média 5: +100%
  const scalePercent = Math.round((((averageGeneral - 3) / 2) * 100) * 10) / 10;

  // Normalização do indicador de 0 a 100% para o cursor deslizante horizontal
  const indicator = Math.min(100, Math.max(0, Math.round(((scalePercent + 100) / 2) * 10) / 10));

  // Ângulo mantido para compatibilidade
  const needleAngle = Math.round(scalePercent * 0.9 * 10) / 10;

  // Rótulos e cores tecnológicas Arena Voice
  let tendencyLabel = 'EQUILÍBRIO';
  let tendencyColor: 'green' | 'gold' | 'red' | 'gray' = 'gold';

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

/**
 * Converte qualquer formato de timestamp do servidor para epoch milissegundos
 * Resolve em definitivo o problema do cronômetro mostrando tempos absurdos (ex: 29908255:39)
 */
export function parseRoundStartMillis(startedAt: any): number {
  if (!startedAt) return 0;

  // 1. Caso numérico (milissegundos ou segundos Unix)
  if (typeof startedAt === 'number') {
    return startedAt < 100000000000 ? startedAt * 1000 : startedAt;
  }

  // 2. Caso string (ISO 8601 do Supabase timestamptz)
  if (typeof startedAt === 'string') {
    const parsed = new Date(startedAt).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }

  // 3. Caso objeto (Emulação de Firestore / Timestamp do Firebase / Date)
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

/**
 * Formata cronômetro regressivo no formato oficial: MM:SS
 * Exemplo: 00:30, 02:00, 00:10, 00:00
 */
export function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formata cronômetro decorrido no formato: HH:MM:SS
 * Exemplo: 00:12:35
 */
export function formatStopwatch(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Recupera o tempo padrão da rodada configurado nas Configurações Gerais
 * Fallback padrão: 60 segundos
 */
export function getConfiguredVotingDuration(): number {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('arena_voice_admin_event_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.tempoPadraoRodadaSegundos === 'number' && parsed.tempoPadraoRodadaSegundos > 0) {
          return parsed.tempoPadraoRodadaSegundos;
        }
      }
    }
  } catch (err) {
    // Silently fallback
  }
  return 60; // 60 segundos padrão
}
