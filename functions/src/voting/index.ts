/**
 * Funções de backend para processamento e validação de votos
 * A ser expandido nas etapas subsequentes
 */
export const validateVotePayload = (data: Record<string, unknown>): boolean => {
  if (!data.projetoId || !data.uid) return false;
  const inovacao = Number(data.inovacao);
  const impacto = Number(data.impacto);
  const salto = Number(data.salto);
  return (
    inovacao >= 1 && inovacao <= 5 &&
    impacto >= 1 && impacto <= 5 &&
    salto >= 1 && salto <= 5
  );
};

