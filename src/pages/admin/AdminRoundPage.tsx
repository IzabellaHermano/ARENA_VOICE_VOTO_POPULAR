import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, RoundStatus as RoundStatusType, RoundDocument, ResultDocument, EventSettings } from '@/types';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { SettingsService } from '@/services/settingsService';
import { useAdminEvent } from '@/contexts/AdminEventContext';
import {
  RoundStatus,
  RoundTimer,
  VoteCounter,
  AdminActionButton,
} from '@/components/admin';
import {
  parseRoundStartMillis,
  getConfiguredVotingDuration,
  formatCountdown,
} from '@/utils/approvalCalculator';
import {
  Square,
  FastForward,
  BarChart2,
  RadioTower,
  Play,
  Layers,
  AlertCircle,
  Tv,
  ExternalLink,
  Trophy,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const AdminRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentEventId } = useAdminEvent();
  const activeEventId = currentEventId || DEFAULT_EVENT_ID;

  // Redireciona para Meus Eventos se nenhum evento foi selecionado
  useEffect(() => {
    if (!currentEventId) {
      navigate('/admin/eventos', { replace: true });
    }
  }, [currentEventId, navigate]);

  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [currentRoundDoc, setCurrentRoundDoc] = useState<RoundDocument | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [roundStatus, setRoundStatus] = useState<RoundStatusType>('aguardando');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [votesCount, setVotesCount] = useState(0);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null);
  const [roundDurationInput, setRoundDurationInput] = useState<number>(60);

  const configuredDuration = useMemo(() => getConfiguredVotingDuration(activeEventId), [activeEventId]);
  const autoClosedRoundIdRef = useRef<string | null>(null);

  // Carrega configurações do evento ativo (duração padrão, peso, etc.)
  useEffect(() => {
    if (!activeEventId) return;
    SettingsService.getSettings(activeEventId).then((st) => {
      setEventSettings(st);
      setRoundDurationInput(st.defaultRoundDuration);
    }).catch(console.warn);
  }, [activeEventId]);

  // 1. Escuta o evento em tempo real no Supabase para o evento ativo
  useEffect(() => {
    if (!activeEventId) return;

    const unsub = EventService.subscribeToCurrentEvent(activeEventId, (ev) => {
      if (ev) {
        setActiveEvent(ev);
      }
    });
    return () => unsub();
  }, [activeEventId]);

  // 2. Escuta a lista de projetos em tempo real no Supabase (ordenados por ordem) para o evento ativo
  useEffect(() => {
    if (!activeEventId) return;

    const unsub = EventService.subscribeToProjectsList(activeEventId, (projs) => {
      if (projs && projs.length > 0) {
        const sorted = [...projs]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((p) => ({
            id: p.id || '',
            nome: p.name,
            descricao: p.description,
            bannerUrl: p.bannerUrl,
            ordem: p.order,
            ativo: p.active,
            categoria: p.category || '',
          }));
        setProjectsList(sorted);
      } else {
        setProjectsList([]);
      }
    });
    return () => unsub();
  }, [activeEventId]);

  // 3. Projetos ativos ordenados rigidamente
  const activeProjects = useMemo(() => {
    return projectsList.filter((p) => p.ativo);
  }, [projectsList]);

  // 4. Sincroniza o projeto selecionado a partir do evento ou da rodada
  useEffect(() => {
    const activeProjId = currentRoundDoc?.projectId || activeEvent?.currentProjectId;
    if (activeProjId) {
      setSelectedProjectId(activeProjId);
    } else if (activeProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(activeProjects[0].id);
    }
  }, [currentRoundDoc?.projectId, activeEvent?.currentProjectId, activeProjects, selectedProjectId]);

  // Atualiza currentProject quando selectedProjectId mudar
  useEffect(() => {
    if (selectedProjectId) {
      const found = activeProjects.find((p) => p.id === selectedProjectId) || projectsList.find((p) => p.id === selectedProjectId);
      if (found) {
        setCurrentProject(found);
      }
    } else if (activeProjects.length > 0) {
      setCurrentProject(activeProjects[0]);
    }
  }, [selectedProjectId, activeProjects, projectsList]);

  // 5. Escuta a rodada ativa em tempo real
  const roundId = activeEvent?.currentRoundId;
  useEffect(() => {
    if (!roundId) {
      // Se não há roundId ativo no evento, mas temos currentRoundDoc anterior
      if (!activeEvent?.currentRoundId) {
        if (currentRoundDoc && currentRoundDoc.status === 'open') {
          setRoundStatus('encerrada');
        } else if (!currentRoundDoc) {
          setRoundStatus('aguardando');
        }
      }
      return;
    }

    const unsub = EventService.subscribeToActiveRound(roundId, (round) => {
      if (round) {
        setCurrentRoundDoc(round);
        const mappedStatus: RoundStatusType =
          round.status === 'open'
            ? 'aberta'
            : round.status === 'closed'
            ? 'encerrada'
            : 'aguardando';
        setRoundStatus(mappedStatus);

        if (round.projectId) {
          setSelectedProjectId(round.projectId);
        }
      } else {
        setRoundStatus('aguardando');
      }
    });

    return () => unsub();
  }, [roundId, activeEvent?.currentRoundId]);

  // 6. CRONÔMETRO SINCRONIZADO: Baseado no timestamp oficial do servidor (startedAt)
  useEffect(() => {
    if (!currentRoundDoc?.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startMillis = parseRoundStartMillis(currentRoundDoc.startedAt);
    if (!startMillis) {
      setElapsedSeconds(0);
      return;
    }

    if (roundStatus === 'encerrada') {
      const endMillis = currentRoundDoc.endedAt ? parseRoundStartMillis(currentRoundDoc.endedAt) : Date.now();
      const finalDiff = Math.max(0, Math.floor((endMillis - startMillis) / 1000));
      setElapsedSeconds(finalDiff);
      return;
    }

    if (roundStatus !== 'aberta') {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startMillis) / 1000));
      setElapsedSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [roundStatus, currentRoundDoc?.startedAt, currentRoundDoc?.endedAt]);

  // Duração efetiva da rodada: prioriza durationSeconds registrado no banco para a rodada
  const effectiveRoundDuration = useMemo(() => {
    if (currentRoundDoc?.durationSeconds) {
      return currentRoundDoc.durationSeconds;
    }
    return eventSettings?.defaultRoundDuration || configuredDuration;
  }, [currentRoundDoc?.durationSeconds, eventSettings?.defaultRoundDuration, configuredDuration]);

  // Contagem regressiva
  const remainingSeconds = useMemo(() => {
    if (!currentRoundDoc?.startedAt) return effectiveRoundDuration;
    return Math.max(0, effectiveRoundDuration - elapsedSeconds);
  }, [effectiveRoundDuration, elapsedSeconds, currentRoundDoc?.startedAt]);

  // AUTO-CLOSE: Quando o tempo restante atingir 00:00, encerra a rodada automaticamente
  useEffect(() => {
    if (roundStatus === 'aberta' && remainingSeconds <= 0 && currentRoundDoc?.id) {
      if (autoClosedRoundIdRef.current !== currentRoundDoc.id) {
        autoClosedRoundIdRef.current = currentRoundDoc.id;
        handleCloseRound();
      }
    }
  }, [roundStatus, remainingSeconds, currentRoundDoc?.id]);

  // 7. VOTOS RECEBIDOS: Sincronizados em tempo real via tabela results do Supabase
  const activeEvalProjectId = currentRoundDoc?.projectId || activeEvent?.currentProjectId || selectedProjectId;
  useEffect(() => {
    if (!activeEvalProjectId) {
      setVotesCount(0);
      return;
    }

    const unsub = EventService.subscribeToProjectResult(activeEventId, activeEvalProjectId, (resDoc: ResultDocument | null) => {
      if (resDoc && typeof resDoc.totalVotes === 'number') {
        setVotesCount(resDoc.totalVotes);
      } else {
        setVotesCount(0);
      }
    });

    return () => unsub();
  }, [activeEventId, activeEvalProjectId]);

  // 8. CÁLCULO DA ORDEM RIGOROSA DOS PROJETOS
  const currentProjectIndex = useMemo(() => {
    if (!currentProject?.id) return -1;
    return activeProjects.findIndex((p) => p.id === currentProject.id);
  }, [currentProject?.id, activeProjects]);

  const totalActiveProjects = activeProjects.length;

  const nextProject = useMemo(() => {
    if (currentProjectIndex >= 0 && currentProjectIndex < activeProjects.length - 1) {
      return activeProjects[currentProjectIndex + 1];
    }
    return null;
  }, [currentProjectIndex, activeProjects]);

  const isLastProject = currentProjectIndex >= 0 && currentProjectIndex === activeProjects.length - 1;
  const isFirstProject = currentProjectIndex <= 0;
  const allProjectsPresented = isLastProject && roundStatus === 'encerrada';

  const projectOrderBadge = useMemo(() => {
    const num = currentProjectIndex >= 0 ? currentProjectIndex + 1 : (currentProject?.ordem || 1);
    return `PROJETO ${String(num).padStart(2, '0')} DE ${String(totalActiveProjects).padStart(2, '0')}`;
  }, [currentProjectIndex, totalActiveProjects, currentProject?.ordem]);

  // AÇÃO: Encerrar Avaliação (Vermelho)
  const handleCloseRound = async () => {
    setIsLoadingAction(true);
    setErrorMessage(null);

    try {
      await EventService.closeRound(activeEventId, currentRoundDoc?.id);
      setSuccessMessage('Votação encerrada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Falha ao encerrar rodada:', err);
      setErrorMessage(err.message || 'Falha ao encerrar avaliação.');
    } finally {
      setIsLoadingAction(false);
    }
  };

  // AÇÃO: Liberar Avaliação (Dourado)
  const handleOpenRound = async () => {
    const targetProjId = selectedProjectId || currentProject?.id || activeProjects[0]?.id;
    if (!targetProjId) {
      setErrorMessage('Nenhum projeto ativo disponível para liberar avaliação.');
      return;
    }

    setIsLoadingAction(true);
    setErrorMessage(null);

    try {
      await EventService.openRound(activeEventId, targetProjId, roundDurationInput);
      setSuccessMessage(`Avaliação liberada com sucesso (${roundDurationInput}s)! Telão e celulares atualizados.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Falha ao abrir rodada:', err);
      setErrorMessage(err.message || 'Falha ao liberar avaliação.');
    } finally {
      setIsLoadingAction(false);
    }
  };

  // AÇÃO: Próximo Projeto (Azul) — Respeita estritamente a ordem definida
  const handleNextProject = async () => {
    if (!nextProject) {
      setErrorMessage('Não há próximo projeto na fila oficial.');
      return;
    }

    setIsLoadingAction(true);
    setErrorMessage(null);

    try {
      await EventService.prepareNextRound(activeEventId, nextProject.id);
      setSelectedProjectId(nextProject.id);
      setCurrentProject(nextProject);
      setSuccessMessage(`Próximo projeto preparado: ${nextProject.nome}. Pronto para liberar.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Falha ao preparar próximo projeto no Supabase:', err);
      setErrorMessage(err.message || 'Falha ao preparar próximo projeto.');
    } finally {
      setIsLoadingAction(false);
    }
  };

  // AÇÃO: Publicar Resultado Oficial no Telão
  const handlePublishOfficialResults = async () => {
    setIsLoadingAction(true);
    setErrorMessage(null);

    try {
      await EventService.toggleResultsPublished(activeEventId, true);
      setSuccessMessage('Resultado oficial publicado no Telão! Pódio revelado com sucesso.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Falha ao publicar resultados:', err);
      setErrorMessage(err.message || 'Falha ao publicar resultados oficiais.');
    } finally {
      setIsLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header com Indicador de Conexão e Atalho para Telão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/30 text-xs font-bold uppercase tracking-wider mb-2">
            <RadioTower className="w-3.5 h-3.5 animate-pulse" />
            <span>Transmissão em Tempo Real • Supabase</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Controle da Rodada e Telão Oficial
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Conduza a sequência oficial dos competidores, cronômetro regressivo e apuração em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/telao"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-arena-red to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-neon-glow text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
            title="Abrir Telão Oficial 16:9 em Nova Aba"
          >
            <Tv className="w-4 h-4" />
            <span>Telão Oficial 16:9</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>

          <RoundStatus status={roundStatus} />
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-arena-green/15 border border-arena-green/40 text-arena-green text-xs flex items-center gap-2 animate-fade-in shadow-green-glow">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Ordem de Apresentação e Seletor */}
      <div className="bg-arena-card border border-arena-border/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 text-xs font-bold text-gray-300 uppercase tracking-wider">
          <Layers className="w-4 h-4 text-arena-gold" />
          <span>Sequência Oficial da Competição:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-arena-gold/15 text-arena-gold border border-arena-gold/30 font-mono font-black text-[11px]">
            {projectOrderBadge}
          </span>
        </div>

        {roundStatus !== 'aberta' && activeProjects.length > 0 && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-arena-black text-white text-xs sm:text-sm font-semibold rounded-xl px-4 py-2 border border-arena-border focus:border-arena-gold outline-none w-full sm:w-80 transition-colors"
          >
            {activeProjects.map((p, idx) => (
              <option key={p.id} value={p.id}>
                #{idx + 1} ({p.ordem}) — {p.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Grid Principal: Projeto em Avaliação + Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card do Projeto em Avaliação no Momento */}
        <div className="lg:col-span-2 bg-arena-card border border-arena-border rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-arena-border/60 pb-3 mb-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                Projeto na Rodada Atual
              </span>
              <span className="text-xs font-mono font-black text-arena-gold uppercase tracking-wider">
                {projectOrderBadge}
              </span>
            </div>

            {/* Banner do Projeto (16:9) */}
            <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-[#0c182d] via-[#101c30] to-[#070e1a] border border-arena-border flex items-center justify-center overflow-hidden mb-4 shadow-inner">
              {currentProject?.bannerUrl ? (
                <img
                  src={currentProject.bannerUrl}
                  alt={currentProject.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 gap-2 p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-arena-blue shadow-blue-glow">
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
                    Banner Oficial
                  </span>
                </div>
              )}
            </div>

            {/* Nome e Categoria */}
            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                {currentProject?.nome || 'Nenhum projeto selecionado'}
              </h3>
              {currentProject?.categoria && (
                <p className="text-sm font-semibold text-arena-gold">
                  {currentProject.categoria}
                </p>
              )}
              <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                {currentProject?.descricao || 'Sem descrição cadastrada.'}
              </p>
            </div>
          </div>
        </div>

        {/* Métricas em Tempo Real: Votos e Cronômetro Regressivo */}
        <div className="flex flex-col justify-between gap-5">
          <VoteCounter count={votesCount} />
          <RoundTimer
            seconds={elapsedSeconds}
            countdownSeconds={remainingSeconds}
            isCountdown={true}
            isActive={roundStatus === 'aberta'}
          />

          {/* Quick Info Box com Regras */}
          <div className="bg-arena-card/80 border border-arena-border rounded-2xl p-4 text-xs text-gray-400 space-y-2">
            <div className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">
              Fluxo do Evento e Cronômetro:
            </div>
            <p className="leading-relaxed">
              Duração configurada: <span className="text-white font-mono font-bold">{formatCountdown(configuredDuration)}</span>. Ao atingir 00:00, a rodada se encerra automaticamente e o telão transita para o estado de encerramento temporário.
            </p>
          </div>
        </div>
      </div>

      {/* Card Informativo do Telão Oficial */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-arena-red/15 border border-arena-red/30 flex items-center justify-center text-arena-red shadow-neon-glow shrink-0">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <span>Telão Oficial</span>
              {roundStatus === 'aberta' && (
                <span className="px-2.5 py-0.5 rounded-full bg-arena-red/20 text-arena-red text-[10px] font-black uppercase tracking-wider animate-pulse">
                  Ao Vivo no Palco
                </span>
              )}
              {activeEvent?.resultsPublished && (
                <span className="px-2.5 py-0.5 rounded-full bg-arena-gold/20 text-arena-gold text-[10px] font-black uppercase tracking-wider">
                  Pódio Divulgado
                </span>
              )}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              O Telão acompanha 100% automaticamente as ações realizadas nesta tela: aguardando início, votação ao vivo, encerramento e pódio final.
            </p>
          </div>
        </div>

        <a
          href="/telao"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-arena-red to-[#B3050F] hover:from-[#FF1E27] hover:to-arena-red text-white text-xs font-black uppercase tracking-wider shadow-neon-glow transition-all shrink-0"
        >
          <span>Abrir Telão</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* BARRA DE AÇÕES: CONTROLE RIGOROSO DA SEQUÊNCIA E VOTAÇÃO */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Seletor de Duração da Rodada (Configuração individual por rodada) */}
          {roundStatus !== 'aberta' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-arena-black border border-arena-border">
              <Clock className="w-3.5 h-3.5 text-arena-gold shrink-0" />
              <span className="text-xs text-gray-400 font-bold hidden sm:inline">Tempo:</span>
              {[30, 60, 90, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setRoundDurationInput(sec)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                    roundDurationInput === sec
                      ? 'bg-arena-gold text-black shadow-sm'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {sec}s
                </button>
              ))}
              <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-arena-border">
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={roundDurationInput}
                  onChange={(e) => setRoundDurationInput(Math.max(10, Math.min(3600, Number(e.target.value) || 10)))}
                  className="w-12 bg-arena-card border border-arena-border rounded px-1 py-0.5 text-[11px] font-mono text-white text-center focus:outline-none focus:border-arena-gold"
                  title="Duração personalizada em segundos (10 a 3600)"
                />
                <span className="text-[10px] text-gray-500 font-mono">s</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-arena-green/10 border border-arena-green/30 text-arena-green text-xs font-bold font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Duração da rodada ativa: {effectiveRoundDuration}s</span>
            </div>
          )}

          {/* 1. Botão Liberar Avaliação / Iniciar Primeira Rodada */}
          {roundStatus === 'aguardando' && (
            <AdminActionButton
              onClick={handleOpenRound}
              variant="gold"
              isLoading={isLoadingAction}
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              {isFirstProject && !currentRoundDoc ? 'INICIAR PRIMEIRA RODADA' : 'LIBERAR AVALIAÇÃO'}
            </AdminActionButton>
          )}

          {/* 2. Botão Encerrar Avaliação (Durante a votação ativa) */}
          {roundStatus === 'aberta' && (
            <AdminActionButton
              onClick={handleCloseRound}
              variant="danger"
              isLoading={isLoadingAction}
              icon={<Square className="w-4 h-4 fill-current" />}
            >
              ENCERRAR AVALIAÇÃO
            </AdminActionButton>
          )}

          {/* 3. Se estiver encerrada, permite reabrir se necessário */}
          {roundStatus === 'encerrada' && !allProjectsPresented && (
            <AdminActionButton
              onClick={handleOpenRound}
              variant="secondary"
              isLoading={isLoadingAction}
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              REABRIR AVALIAÇÃO
            </AdminActionButton>
          )}

          {/* 4. BOTÃO PRÓXIMO PROJETO (Regras rígidas) */}
          {/* Quando a votação estiver ativa: DESABILITADO */}
          {/* Quando encerrada e houver próximo: HABILITADO com identificação clara */}
          {/* Quando for o último projeto: DESABILITADO com mensagem 'TODOS OS PROJETOS APRESENTADOS' */}
          {allProjectsPresented ? (
            <button
              disabled
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-500 font-bold text-xs uppercase tracking-wider cursor-not-allowed"
            >
              TODOS OS PROJETOS APRESENTADOS
            </button>
          ) : (
            <AdminActionButton
              onClick={handleNextProject}
              variant="primary"
              disabled={roundStatus === 'aberta' || !nextProject}
              isLoading={isLoadingAction}
              icon={<FastForward className="w-4 h-4 fill-current" />}
              title={
                roundStatus === 'aberta'
                  ? 'Aguarde o encerramento da rodada para avançar'
                  : nextProject
                  ? `Avançar para: ${nextProject.nome}`
                  : 'Nenhum próximo projeto'
              }
            >
              {nextProject
                ? `PRÓXIMO: ${nextProject.nome.toUpperCase()} (${currentProjectIndex + 2} DE ${totalActiveProjects})`
                : 'PRÓXIMO PROJETO'}
            </AdminActionButton>
          )}

          {/* 5. Se todos os projetos foram apresentados: Botão de Divulgação Oficial */}
          {allProjectsPresented && (
            <AdminActionButton
              onClick={handlePublishOfficialResults}
              variant="gold"
              isLoading={isLoadingAction}
              icon={<Trophy className="w-4 h-4" />}
            >
              {activeEvent?.resultsPublished
                ? 'PÓDIO PUBLICADO NO TELÃO'
                : 'DIVULGAR RESULTADO OFICIAL NO TELÃO'}
            </AdminActionButton>
          )}
        </div>

        {/* Botão Secundário: Dashboard */}
        <AdminActionButton
          onClick={() => navigate('/admin/resultados')}
          variant="secondary"
          icon={<BarChart2 className="w-4 h-4 text-arena-gold" />}
          className="w-full sm:w-auto ml-auto"
        >
          GERAR DASHBOARD
        </AdminActionButton>
      </div>
    </div>
  );
};

export default AdminRoundPage;
