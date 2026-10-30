/**
 * Funções de backend para cálculo e consolidação de resultados
 * A ser expandido nas etapas subsequentes
 */
export const calculateConsolidatedAverages = (votes: Array<{ inovacao: number; impacto: number; salto: number }>) => {
  if (votes.length === 0) return { mediaGeral: 0, totalVotos: 0 };
  const totals = votes.reduce(
    (acc, v) => ({
      inovacao: acc.inovacao + v.inovacao,
      impacto: acc.impacto + v.impacto,
      salto: acc.salto + v.salto,
    }),
    { inovacao: 0, impacto: 0, salto: 0 }
  );

  const mediaInovacao = totals.inovacao / votes.length;
  const mediaImpacto = totals.impacto / votes.length;
  const mediaSalto = totals.salto / votes.length;
  const mediaGeral = (mediaInovacao + mediaImpacto + mediaSalto) / 3;

  return {
    mediaInovacao,
    mediaImpacto,
    mediaSalto,
    mediaGeral,
    totalVotos: votes.length,
  };
};

