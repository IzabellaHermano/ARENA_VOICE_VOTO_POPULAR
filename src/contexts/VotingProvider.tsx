import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '@/services/authService';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { EventDocument, ProjectDocument, RoundDocument } from '@/types';
import { VotingContext, VotingContextType } from './VotingContext';

export interface VotingProviderProps {
  children: React.ReactNode;
}

export const VotingProvider: React.FC<VotingProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [voterUid, setVoterUid] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDocument | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundDocument | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectDocument | null>(null);
  const [hasVotedCurrentProject, setHasVotedCurrentProject] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'reconnecting' | 'offline'
  >('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Função centralizada para inicializar sessão anônima via Supabase
  const initAnonymousSession = useCallback(async () => {
    try {
      const user = await AuthService.ensureAnonymousUser();
      setVoterUid(user.uid);
      setConnectionStatus('connected');
    } catch (err) {
      console.warn('Erro ao inicializar sessão anônima do Supabase:', err);
      // Fallback de UID persistente local para desenvolvimento sem servidor
      let fallbackUid = localStorage.getItem('arena_voice_voter_fallback_uid');
      if (!fallbackUid) {
        fallbackUid = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('arena_voice_voter_fallback_uid', fallbackUid);
      }
      setVoterUid(fallbackUid);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setConnectionStatus('offline');
      } else {
        setConnectionStatus('reconnecting');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 1. Inicializa ou recupera a sessão anônima do público
  useEffect(() => {
    initAnonymousSession();
  }, [initAnonymousSession]);

  // 2. Monitoramento de conectividade de rede com reconexão automática
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('reconnecting');
      setErrorMessage(null);
      // Re-executa inicialização e consulta após reconectar
      initAnonymousSession().then(() => {
        setTimeout(() => {
          setConnectionStatus('connected');
        }, 1200);
      });
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
      setErrorMessage('Sem conexão com a internet. O sistema reconectará automaticamente assim que o sinal retornar.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initAnonymousSession]);

  // 3. Escuta o evento principal em tempo real via Supabase
  useEffect(() => {
    const unsubscribeEvent = EventService.subscribeToCurrentEvent(
      DEFAULT_EVENT_ID,
      (updatedEvent) => {
        setEvent(updatedEvent);
        setConnectionStatus('connected');
      },
      (err) => {
        console.warn('Conexão ao evento pendente ou reconectando:', err);
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setConnectionStatus('offline');
        } else {
          setConnectionStatus('reconnecting');
        }
      }
    );

    return () => unsubscribeEvent();
  }, []);

  // 3. Escuta a rodada ativa em tempo real quando o evento definir currentRoundId
  useEffect(() => {
    if (!event?.currentRoundId) {
      setCurrentRound(null);
      return;
    }

    const unsubscribeRound = EventService.subscribeToActiveRound(
      event.currentRoundId,
      (updatedRound) => {
        setCurrentRound(updatedRound);
      },
      () => {}
    );

    return () => unsubscribeRound();
  }, [event?.currentRoundId]);

  // 4. Escuta o projeto ativo em tempo real
  const activeProjectId = currentRound?.projectId || event?.currentProjectId;

  useEffect(() => {
    if (!activeProjectId) {
      setCurrentProject(null);
      return;
    }

    const unsubscribeProject = EventService.subscribeToProject(
      activeProjectId,
      (updatedProject) => {
        setCurrentProject(updatedProject);
      },
      () => {}
    );

    return () => unsubscribeProject();
  }, [activeProjectId]);

  // 5. Verifica se o participante já votou no projeto em avaliação
  useEffect(() => {
    let isCancelled = false;

    async function verifyVote() {
      if (!voterUid || !activeProjectId) {
        setHasVotedCurrentProject(false);
        return;
      }

      // Verifica no armazenamento local rápido
      const localVoted = localStorage.getItem(`voted_${DEFAULT_EVENT_ID}_${activeProjectId}_${voterUid}`);
      if (localVoted === 'true') {
        if (!isCancelled) setHasVotedCurrentProject(true);
        return;
      }

      // Consulta confirmação determinística no Firestore
      const hasVoted = await EventService.checkUserVote(DEFAULT_EVENT_ID, activeProjectId, voterUid);
      if (!isCancelled) {
        setHasVotedCurrentProject(hasVoted);
        if (hasVoted) {
          localStorage.setItem(`voted_${DEFAULT_EVENT_ID}_${activeProjectId}_${voterUid}`, 'true');
        }
      }
    }

    verifyVote();

    return () => {
      isCancelled = true;
    };
  }, [voterUid, activeProjectId]);

  // 6. Roteamento e transição automática em tempo real para o público
  // O público NÃO deve atualizar a página para receber o novo projeto!
  useEffect(() => {
    // Aplica apenas para as rotas do fluxo público
    const isPublicVotingPath =
      location.pathname.startsWith('/votar') ||
      location.pathname === '/aguardando' ||
      location.pathname === '/avaliar' ||
      location.pathname === '/confirmacao';

    if (!isPublicVotingPath) return;

    // Se estiver navegando via rota moderna /votar/:eventId, o componente PublicVotingPage já comuta internamente
    // entre WaitingPage, EvaluationPage e ConfirmationPage com base em hasVotedCurrentProject e status.
    // Para rotas legadas (/aguardando, /avaliar, /confirmacao), mantemos a navegação explícita:
    const isLegacyRoute =
      location.pathname === '/aguardando' ||
      location.pathname === '/avaliar' ||
      location.pathname === '/confirmacao';

    if (!isLegacyRoute) return;

    if (!currentRound || currentRound.status !== 'open') {
      // Sem rodada aberta ou rodada encerrada/em espera:
      // Mantém a tela de confirmação para quem já votou no projeto recém-encerrado
      if (hasVotedCurrentProject && location.pathname === '/confirmacao') {
        return;
      }
      // Direciona os demais participantes para a tela de espera
      if (location.pathname !== '/aguardando') {
        navigate('/aguardando', { replace: true });
      }
    } else {
      // Rodada aberta:
      if (hasVotedCurrentProject) {
        // Já votou: tela de confirmação
        if (location.pathname !== '/confirmacao') {
          navigate('/confirmacao', { replace: true });
        }
      } else {
        // Não votou ainda: tela de avaliação
        if (location.pathname !== '/avaliar') {
          navigate('/avaliar', { replace: true });
        }
      }
    }
  }, [currentRound?.status, hasVotedCurrentProject, location.pathname, navigate]);

  // 7. Envio oficial do voto com transação atômica no servidor
  const submitCurrentVote = useCallback(
    async (scores: { innovation: number; impact: number; development: number }) => {
      if (!voterUid) {
        setErrorMessage('Sessão de usuário não identificada.');
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setErrorMessage('Dispositivo sem conexão com a internet. Não foi possível registrar o voto.');
        return;
      }

      if (!currentRound || currentRound.status !== 'open') {
        setErrorMessage('A rodada de votação foi encerrada.');
        return;
      }

      if (!activeProjectId) {
        setErrorMessage('Projeto indisponível para avaliação.');
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        // Chamada oficial à RPC submit_vote no Supabase
        await EventService.submitVote({
          eventId: DEFAULT_EVENT_ID,
          roundId: currentRound.id || event?.currentRoundId || '',
          projectId: activeProjectId,
          innovation: scores.innovation,
          impact: scores.impact,
          development: scores.development,
        });

        // Marca localmente após confirmação formal do servidor
        localStorage.setItem(`voted_${DEFAULT_EVENT_ID}_${activeProjectId}_${voterUid}`, 'true');
        setHasVotedCurrentProject(true);
        if (location.pathname === '/avaliar') {
          navigate('/confirmacao');
        }
      } catch (err: unknown) {
        console.error('Falha no envio do voto:', err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Falha ao registrar seu voto no servidor. Verifique sua conexão.';
        setErrorMessage(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [voterUid, currentRound, activeProjectId, event?.currentRoundId, location.pathname, navigate]
  );

  const clearError = useCallback(() => setErrorMessage(null), []);

  const value: VotingContextType = useMemo(
    () => ({
      voterUid,
      event,
      currentRound,
      currentProject,
      hasVotedCurrentProject,
      isLoading,
      isSubmitting,
      connectionStatus,
      errorMessage,
      submitCurrentVote,
      clearError,
    }),
    [
      voterUid,
      event,
      currentRound,
      currentProject,
      hasVotedCurrentProject,
      isLoading,
      isSubmitting,
      connectionStatus,
      errorMessage,
      submitCurrentVote,
      clearError,
    ]
  );

  return <VotingContext.Provider value={value}>{children}</VotingContext.Provider>;
};

export default VotingProvider;

