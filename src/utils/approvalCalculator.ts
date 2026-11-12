/**
 * ARENA VOICE — VOTO POPULAR
 * Calculadora Oficial do Ponteiro Dinâmico de Aprovação (Etapa 5)
 *
 * Regras Oficiais:
 * - Média de cada voto = (Inovação + Impacto + Salto) / 3
 * - Média > 3: Voto Positivo
 * - Média == 3: Voto Neutro
 * - Média < 3: Voto Negativo
 *
 * Saldo de Aprovação = (Votos Positivos - Votos Negativos) / Total de Votos
 * (Varia de -1.0 a +1.0)
 *
 * Indicador (Escala 0 a 100):
 * Indicador = ((Saldo + 1) / 2) * 100
 * - 0: Tendência totalmente negativa
 * - 50: Equilíbrio / Neutro (ou sem votos)
 * - 100: Tendência totalmente positiva
 *
 * Ângulo do Ponteiro (Semicírculo):
 * -90° (esquerda extrema) a +90° (direita extrema), com 0° na vertical (centro).
 * Angulo = (Indicador - 50) * 1.8
 */

export interface VoteScoreItem {
  innovation?: number | null;
  impact?: number | null;
  development?: number | null;
  innovation_score?: number | null;
  cptm_impact_score?: number | null;
  development_score?: number | null;
}

export interface ApprovalStats {
  totalVotes: number;
  positiveVotes: number;
  neutralVotes: number;
  negativeVotes: number;
  approvalBalance: number; // -1.0 a +1.0
  indicator: number; // 0 a 100
  needleAngle: number; // -90° a +90°
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

  // Precisão de ponto flutuante com tolerância mínima para evitar erros de float (ex: 3.0000000000000004)
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
 * Calcula todas as métricas do ponteiro de aprovação a partir de uma lista real de votos
 */
export function calculateApprovalStats(votes: VoteScoreItem[]): ApprovalStats {
  if (!votes || votes.length === 0) {
    return {
      totalVotes: 0,
      positiveVotes: 0,
      neutralVotes: 0,
      negativeVotes: 0,
      approvalBalance: 0,
      indicator: 50,
      needleAngle: 0, // Centro vertical (50%)
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
  // Saldo de aprovação entre -1.0 e +1.0
  const approvalBalance = (positiveVotes - negativeVotes) / totalVotes;

  // Indicador na escala 0 a 100
  const indicator = Math.min(100, Math.max(0, ((approvalBalance + 1) / 2) * 100));

  // Ângulo do ponteiro: 0% = -90° (esquerda), 50% = 0° (topo/centro), 100% = +90° (direita)
  const needleAngle = (indicator - 50) * 1.8;

  let tendencyLabel = 'Equilíbrio';
  let tendencyColor: 'green' | 'gold' | 'red' | 'gray' = 'gold';

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

