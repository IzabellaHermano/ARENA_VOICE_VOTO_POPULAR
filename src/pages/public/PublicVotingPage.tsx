import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVoting } from '@/hooks/useVoting';
import { WaitingPage } from './WaitingPage';
import { EvaluationPage } from './EvaluationPage';
import { ConfirmationPage } from './ConfirmationPage';

/**
 * Rota pública unificada de votação:
 * - /votar/:eventId
 * - /votar/:eventId/:projectId
 */
export const PublicVotingPage: React.FC = () => {
  const { eventId, projectId } = useParams<{ eventId: string; projectId?: string }>();
  const navigate = useNavigate();
  const { currentRound, currentProject, hasVotedCurrentProject } = useVoting();

  const isRoundOpen = currentRound?.status === 'open';
  const activeProjectId = currentRound?.projectId || currentProject?.id;

  // Sincronização automática com a URL específica do projeto liberado
  useEffect(() => {
    if (!eventId) return;

    if (isRoundOpen && activeProjectId) {
      if (hasVotedCurrentProject) {
        // Já votou no projeto aberto
        return;
      }
      // Se a rodada está aberta e a rota não possui o projectId correto, redireciona
      if (projectId !== activeProjectId) {
        navigate(`/votar/${eventId}/${activeProjectId}`, { replace: true });
      }
    } else if (!isRoundOpen) {
      // Se a rodada não está aberta e a URL tem projectId, volta para a rota base do evento
      if (projectId && !hasVotedCurrentProject) {
        navigate(`/votar/${eventId}`, { replace: true });
      }
    }
  }, [isRoundOpen, activeProjectId, eventId, projectId, hasVotedCurrentProject, navigate]);

  // Se o participante já votou no projeto ativo, exibe tela de confirmação
  if (hasVotedCurrentProject) {
    return <ConfirmationPage />;
  }

  // Se a rodada estiver aberta e o projeto corresponder, exibe tela de avaliação
  if (isRoundOpen && (!projectId || projectId === activeProjectId)) {
    return <EvaluationPage />;
  }

  // Caso contrário, exibe sala de espera do evento
  return <WaitingPage />;
};

export default PublicVotingPage;
