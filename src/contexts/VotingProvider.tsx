import React, { useEffect, useState, useCallback, useMemo, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '@/services/authService';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { QuestionService } from '@/services/questionService';
import { EventDocument, ProjectDocument, RoundDocument } from '@/types';
import { EventQuestion } from '@/types/supabase';
import { VotingContext, VotingContextType } from './VotingContext';
import { AdminEventContext } from './AdminEventContext';

export interface VotingProviderProps {
  children: React.ReactNode;
}

export const VotingProvider: React.FC<VotingProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const adminEventContext = useContext(AdminEventContext);
  const adminEventId = adminEventContext?.currentEventId;

  const [voterUid, setVoterUid] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDocument | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundDocument | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectDocument | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<EventQuestion[]>([]);
  const [hasVotedCurrentProject, setHasVotedCurrentProject] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'reconnecting' | 'offline'
  >('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Descoberta do evento ativo no banco (para acesso via QR Code genérico /votar)
  const [activeDbEventId, setActiveDbEventId] = useState<string | null>(null);

  // Monitora qual é o evento ativo na tabela events do Supabase
  useEffect(() => {
    let isSubscribed = true;
    const checkActive = async () => {
      const active = await EventService.getActiveEvent();
      if (isSubscribed && active?.id) {
        setActiveDbEventId(active.id);
      }
    };

    checkActive();

    // Acompanha trocas de evento ou rodadas ao vivo
    const unsub = EventService.subscribeToEventsList((evList) => {
      if (!isSubscribed) return;
      // Prioriza evento com rodada aberta
      const openRoundEv = evList.find((e) => e.status === 'active' && Boolean(e.currentRoundId));
      if (openRoundEv?.id) {
        setActiveDbEventId(openRoundEv.id);
        return;
      }
      // Ou o primeiro evento com status 'active'
      const activeEv = evList.find((e) => e.status === 'active');
      if (activeEv?.id) {
        setActiveDbEventId(activeEv.id);
      }
    });

    return () => {
      isSubscribed = false;
      unsub();
    };
  }, []);

  // Resolução dinâmica do ID do evento:
  // 1. Rota com path: /votar/:eventId ou /votar/:eventId/:projectId
  const pathEventMatch = location.pathname.match(/^\/votar\/([^\/]+)/);
  const pathEventId =
    pathEventMatch && pathEventMatch[1] && pathEventMatch[1] !== 'undefined'
      ? pathEventMatch[1]
      : null;

  // 2. Query param: ?event=... ou ?evento=...
  const queryEventId = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search);
      return sp.get('event') || sp.get('evento') || null;
    } catch {
      return null;
    }
  }, [location.search]);

  // Evento efetivo resolvido
  const activeEventId = useMemo(() => {
    return pathEventId || queryEventId || adminEventId || activeDbEventId || DEFAULT_EVENT_ID;
  }, [pathEventId, queryEventId, adminEventId, activeDbEventId]);

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

  // 3. Escuta o evento ativo em tempo real via Supabase
  useEffect(() => {
    if (!activeEventId) return;

    const unsubscribeEvent = EventService.subscribeToCurrentEvent(
      activeEventId,
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
  }, [activeEventId]);

  // 3. Escuta a rodada ativa em tempo real via Supabase (filtrada pelo evento)
  useEffect(() => {
    const unsubscribeRound = EventService.subscribeToActiveRound(
      event?.currentRoundId || null,
      (updatedRound) => {
        setCurrentRound(updatedRound);
      },
      () => {},
      activeEventId
    );

    return () => unsubscribeRound();
  }, [event?.currentRoundId, activeEventId]);

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

  // 4.1 Carrega as perguntas ativas ou o snapshot da rodada
  useEffect(() => {
    const targetEventId = activeEventId || event?.id || DEFAULT_EVENT_ID;

    // Se a rodada possui snapshot congelado de perguntas, utiliza-o
    const snapshot = (currentRound as any)?.questions_snapshot;
    if (snapshot && Array.isArray(snapshot) && snapshot.length > 0) {
      setCurrentQuestions(
        snapshot.map((q: any) => ({
          id: q.id,
          eventId: targetEventId,
          title: q.title,
          description: q.description || '',
          position: q.position || 1,
          active: true,
          required: q.required ?? true,
          minScore: q.min_score ?? 1,
          maxScore: q.max_score ?? 5,
        }))
      );
      return;
    }

    // Caso contrário, busca as perguntas ativas do evento
    QuestionService.listQuestions(targetEventId, false).then((list) => {
      setCurrentQuestions(list);
    });
  }, [activeEventId, event?.id, currentRound]);

  // 5. Verifica se o participante já votou no projeto em avaliação
  useEffect(() => {
    let isCancelled = false;

    async function verifyVote() {
      if (!voterUid || !activeProjectId) {
        setHasVotedCurrentProject(false);
        return;
      }

      const targetEventId = activeEventId || event?.id || DEFAULT_EVENT_ID;
      const localKey = `voted_${targetEventId}_${activeProjectId}_${voterUid}`;

      // Verifica no armazenamento local rápido
      const localVoted = localStorage.getItem(localKey);
      if (localVoted === 'true') {
        if (!isCancelled) setHasVotedCurrentProject(true);
        return;
      }

      // Consulta confirmação determinística no Supabase
      const hasVoted = await EventService.checkUserVote(targetEventId, activeProjectId, voterUid);
      if (!isCancelled) {
        setHasVotedCurrentProject(hasVoted);
        if (hasVoted) {
          localStorage.setItem(localKey, 'true');
        }
      }
    }

    verifyVote();

    return () => {
      isCancelled = true;
    };
  }, [voterUid, activeProjectId, activeEventId, event?.id]);

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

  // 7. Envio oficial do voto com suporte a respostas dinâmicas e legadas
  const submitCurrentVote = useCallback(
    async (payload: {
      answers?: Record<string, number>;
      innovation?: number | null;
      impact?: number | null;
      development?: number | null;
    }) => {
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

      const targetEventId = activeEventId || event?.id || DEFAULT_EVENT_ID;

      try {
        const answersArray = payload.answers
          ? Object.entries(payload.answers).map(([questionId, score]) => ({
              questionId,
              score,
            }))
          : undefined;

        // Chamada oficial à RPC submit_vote no Supabase
        await EventService.submitVote({
          eventId: targetEventId,
          roundId: currentRound.id || event?.currentRoundId || '',
          projectId: activeProjectId,
          answers: answersArray,
          innovation: payload.innovation ?? (answersArray?.[0]?.score ?? 3),
          impact: payload.impact ?? (answersArray?.[1]?.score ?? 3),
          development: payload.development ?? (answersArray?.[2]?.score ?? 3),
        });

        // Marca localmente após confirmação formal do servidor
        localStorage.setItem(`voted_${targetEventId}_${activeProjectId}_${voterUid}`, 'true');
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
    [voterUid, currentRound, activeProjectId, event?.id, event?.currentRoundId, location.pathname, navigate]
  );

  const clearError = useCallback(() => setErrorMessage(null), []);

  const value: VotingContextType = useMemo(
    () => ({
      voterUid,
      event,
      currentRound,
      currentProject,
      currentQuestions,
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
      currentQuestions,
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

