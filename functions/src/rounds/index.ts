/**
 * Funções de backend para controle de rodadas
 * A ser expandido nas etapas subsequentes
 */
export const checkRoundStatus = (status: string): boolean => {
  return ['aguardando', 'aberta', 'encerrada'].includes(status);
};

