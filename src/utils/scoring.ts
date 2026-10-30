/**
 * Regras oficiais de cálculo de pontuação do Arena Voice — Voto Popular
 * Conforme especificado na arquitetura:
 * - Três critérios: Inovação, Impacto na CPTM, Salto de Desenvolvimento (1 a 5)
 * - Média Geral = (Inovação + Impacto + Salto) / 3
 * - % do Voto Popular = (Média Geral / 5) * 100
 * - Pontos na Nota Final = (Média Geral / 5) * 20 (peso de 20% no resultado final)
 */

export interface ScoreCalculationResult {
  mediaGeral: number;
  percentual: number;
  pontosFinal: number;
}

export function calculateProjectScore(
  mediaInovacao: number,
  mediaImpacto: number,
  mediaSalto: number
): ScoreCalculationResult {
  const mediaGeral = (mediaInovacao + mediaImpacto + mediaSalto) / 3;
  const percentual = (mediaGeral / 5) * 100;
  const pontosFinal = (mediaGeral / 5) * 20;

  return {
    mediaGeral: Number(mediaGeral.toFixed(2)),
    percentual: Number(percentual.toFixed(1)),
    pontosFinal: Number(pontosFinal.toFixed(2)),
  };
}

