import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ArenaLogo, ArenaMascot } from '@/components/branding';
import { QRCodeDisplay } from '@/components/qrcode';
import { ApprovalGauge } from '@/components/admin/ApprovalGauge';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { ProjectDocument, RoundDocument, ResultDocument, EventDocument } from '@/types';
import {
  ApprovalStats,
  calculateApprovalStats,
  parseRoundStartMillis,
  formatCountdown,
  getConfiguredVotingDuration,
} from '@/utils/approvalCalculator';
import { buildRankedResults } from '@/utils/scoring';
import {
  Trophy,
  Award,
  Medal,
  Maximize2,
  Minimize2,
  Sparkles,
  Flame,
  Users,
  Timer,
  Lock,
  ClockAlert,
  Radio,
} from 'lucide-react';

export const BigScreenPresentationPage: React.FC = () => {
  const { eventId: paramEventId } = useParams<{ eventId?: string }>();
  const location = useLocation();

  const queryEventId = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search);
      return sp.get('event') || sp.get('evento') || null;
    } catch {
      return null;
    }
  }, [location.search]);

  const [activeDbEventId, setActiveDbEventId] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    EventService.getActiveEvent().then((ev) => {
      if (isSubscribed && ev?.id) setActiveDbEventId(ev.id);
    });

    const unsub = EventService.subscribeToEventsList((evList) => {
      if (!isSubscribed) return;
      const running = evList.find((e) => e.status === 'active' && Boolean(e.currentRoundId));
      if (running?.id) {
        setActiveDbEventId(running.id);
      } else {
        const latest = evList.find((e) => e.status === 'active');
        if (latest?.id) setActiveDbEventId(latest.id);
      }
    });

    return () => {
      isSubscribed = false;
      unsub();
    };
  }, []);

  const targetEventId = useMemo(() => {
    return paramEventId || queryEventId || activeDbEventId || DEFAULT_EVENT_ID;
  }, [paramEventId, queryEventId, activeDbEventId]);

  const [activeEvent, setActiveEvent] = useState<EventDocument | null>(null);
  const [activeRound, setActiveRound] = useState<RoundDocument | null>(null);
  const [projects, setProjects] = useState<ProjectDocument[]>([]);
  const [resultsList, setResultsList] = useState<ResultDocument[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [configuredDuration, setConfiguredDuration] = useState(() => getConfiguredVotingDuration());
  const [approvalStats, setApprovalStats] = useState<ApprovalStats>(() => calculateApprovalStats([]));

  // 1. Escuta o evento principal em tempo real no Supabase
  useEffect(() => {
    if (!targetEventId) return;
    const unsub = EventService.subscribeToCurrentEvent(targetEventId, (ev) => {
      if (ev) setActiveEvent(ev);
    });
    return () => unsub();
  }, [targetEventId]);

  // 2. Escuta os projetos em tempo real exclusivamente do Supabase
  useEffect(() => {
    if (!targetEventId) return;
    const unsub = EventService.subscribeToProjectsList(targetEventId, (projs) => {
      setProjects(projs || []);
    });
    return () => unsub();
  }, [targetEventId]);

  // 3. Monitora o ciclo de vida completo da rodada (Aguardando -> Aberta -> Encerrada)
  useEffect(() => {
    if (!targetEventId) return;
    const unsub = EventService.subscribeToLatestRound(targetEventId, (round) => {
      setActiveRound(round);
    });
    return () => unsub();
  }, [targetEventId]);

  // 4. Escuta os resultados agregados de todos os projetos em tempo real
  useEffect(() => {
    if (!targetEventId) return;
    const unsub = EventService.subscribeToAllEventResults(targetEventId, (resList) => {
      if (resList && resList.length > 0) {
        setResultsList(resList);
      }
    });
    return () => unsub();
  }, [targetEventId]);

  // 5. Atualiza duração configurada ao montar ou quando mudar configurações
  useEffect(() => {
    setConfiguredDuration(getConfiguredVotingDuration());
  }, []);

  // 6. Lista de projetos ativos ordenados rigidamente por order
  const activeProjectsSorted = useMemo(() => {
    return [...projects]
      .filter((p) => p.active)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [projects]);

  // 7. Projeto Ativo na Rodada
  const activeProject = useMemo(() => {
    const targetId = activeRound?.projectId || activeEvent?.currentProjectId;
    if (!targetId) return null;
    return projects.find((p) => p.id === targetId) || null;
  }, [activeRound?.projectId, activeEvent?.currentProjectId, projects]);

  const currentProjectIndex = useMemo(() => {
    if (!activeProject) return -1;
    return activeProjectsSorted.findIndex((p) => p.id === activeProject.id);
  }, [activeProject, activeProjectsSorted]);

  const totalProjectsCount = activeProjectsSorted.length || projects.length || 1;

  // Rótulo da ordem oficial do projeto: "PROJETO 01 DE 04"
  const projectOrderLabel = useMemo(() => {
    const num = currentProjectIndex >= 0 ? currentProjectIndex + 1 : (activeProject?.order || 1);
    return `PROJETO ${String(num).padStart(2, '0')} DE ${String(totalProjectsCount).padStart(2, '0')}`;
  }, [currentProjectIndex, totalProjectsCount, activeProject?.order]);

  // 8. Ponteiro Dinâmico: Sincronização em tempo real para o projeto ativo
  useEffect(() => {
    if (!activeProject?.id) {
      setApprovalStats(calculateApprovalStats([]));
      return;
    }

    const unsub = EventService.subscribeToProjectApprovalStats(
      targetEventId,
      activeProject.id,
      activeRound?.id,
      (newStats) => {
        setApprovalStats(newStats);
      }
    );

    return () => unsub();
  }, [targetEventId, activeProject?.id, activeRound?.id]);

  // 9. Cronômetro Regressivo Oficial do Servidor (Baseado em startedAt e duração)
  // Imune a refresh da aba e reconexões de rede
  useEffect(() => {
    if (!activeRound?.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startMillis = parseRoundStartMillis(activeRound.startedAt);
    if (!startMillis) {
      setElapsedSeconds(0);
      return;
    }

    // Se a rodada estiver encerrada, o tempo congela na duração final
    if (activeRound.status === 'closed') {
      const endMillis = activeRound.endedAt ? parseRoundStartMillis(activeRound.endedAt) : Date.now();
      const finalDiff = Math.max(0, Math.floor((endMillis - startMillis) / 1000));
      setElapsedSeconds(finalDiff);
      return;
    }

    if (activeRound.status !== 'open') {
      setElapsedSeconds(0);
      return;
    }

    // Rodada Aberta: Atualiza a cada segundo
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startMillis) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeRound?.status, activeRound?.startedAt, activeRound?.endedAt]);

  // Cálculo do tempo restante em contagem regressiva sincronizada
  const effectiveRoundDuration = useMemo(() => {
    if (activeRound?.durationSeconds) {
      return activeRound.durationSeconds;
    }
    return configuredDuration;
  }, [activeRound?.durationSeconds, configuredDuration]);

  const remainingSeconds = useMemo(() => {
    if (!activeRound?.startedAt) return effectiveRoundDuration;
    return Math.max(0, effectiveRoundDuration - elapsedSeconds);
  }, [effectiveRoundDuration, elapsedSeconds, activeRound?.startedAt]);

  const isUrgentTimer = activeRound?.status === 'open' && remainingSeconds <= 10 && remainingSeconds > 0;

  // 10. ESTADOS DO TELÃO ÚNICO OFICIAL
  // Estado 1.4: Resultado Oficial (resultsPublished = true)
  // Estado 1.2: Projeto em Apresentação e Votação (round.status = 'open')
  // Estado 1.3: Estado Entre Projetos (round.status = 'closed')
  // Estado 1.1: Aguardando Início (sem rodada ativa / esperando início)
  const telaoState: '1.1_waiting_start' | '1.2_active_voting' | '1.3_between_projects' | '1.4_final_results' = useMemo(() => {
    if (activeEvent?.resultsPublished) {
      return '1.4_final_results';
    }
    if (activeRound?.status === 'open' && activeProject) {
      return '1.2_active_voting';
    }
    if (activeRound?.status === 'closed' && activeProject) {
      return '1.3_between_projects';
    }
    return '1.1_waiting_start';
  }, [activeEvent?.resultsPublished, activeRound?.status, activeProject]);

  // Ranking calculado para o Pódio Oficial (Estado 1.4)
  const rankedResults = useMemo(() => {
    const resultsMap = new Map<string, ResultDocument>();
    resultsList.forEach((r) => resultsMap.set(r.projectId, r));
    return buildRankedResults(projects, resultsMap);
  }, [projects, resultsList]);

  // Votos confirmados da rodada ativa
  const roundVotesCount = useMemo(() => {
    if (approvalStats.totalVotes > 0) return approvalStats.totalVotes;
    if (!activeProject?.id) return 0;
    const res = resultsList.find((r) => r.projectId === activeProject.id);
    return res?.totalVotes || 0;
  }, [approvalStats.totalVotes, activeProject?.id, resultsList]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const firstPlace = rankedResults.find((p) => p.rank === 1 && p.hasEvaluations);
  const secondPlace = rankedResults.find((p) => p.rank === 2 && p.hasEvaluations);
  const thirdPlace = rankedResults.find((p) => p.rank === 3 && p.hasEvaluations);
  const otherPlaces = rankedResults.filter(
    (p) => (p.rank === null || p.rank > 3) && p !== firstPlace && p !== secondPlace && p !== thirdPlace
  );

  return (
    <div className="min-h-screen bg-[#07080D] text-white p-4 sm:p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Atmosférico Oficial Arena Voice */}
      <div className="absolute top-0 left-1/4 w-[750px] h-[450px] bg-arena-red/12 blur-[170px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[650px] h-[400px] bg-arena-blue/10 blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 opacity-5 pointer-events-none">
        <ArenaMascot variant="transparent" width={560} />
      </div>

      {/* Header Oficial do Telão 16:9 */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <ArenaLogo variant="complete" width={320} />

        <div className="flex items-center gap-4">
          {/* Badge Informativa do Telão */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 border border-white/15 text-xs font-black uppercase tracking-wider">
            {telaoState === '1.2_active_voting' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-arena-red animate-ping" />
                <span className="text-arena-red font-mono">Votação ao Vivo no Palco</span>
              </>
            ) : telaoState === '1.3_between_projects' ? (
              <>
                <Lock className="w-3.5 h-3.5 text-arena-gold" />
                <span className="text-gray-300">Aguardando Próximo Projeto</span>
              </>
            ) : telaoState === '1.4_final_results' ? (
              <>
                <Trophy className="w-3.5 h-3.5 text-arena-gold" />
                <span className="text-arena-gold">Pódio Oficial Homologado</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400">Aguardando Início</span>
              </>
            )}
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
            title="Alternar Tela Cheia (16:9)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* ESTADO 1.1 — AGUARDANDO INÍCIO                               */}
      {/* Quando o evento está aberto mas nenhum projeto está ativo   */}
      {/* ============================================================ */}
      {telaoState === '1.1_waiting_start' && (
        <main className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 z-10 text-center space-y-6 animate-fade-in max-w-4xl mx-auto w-full">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-arena-gold/15 text-arena-gold border border-arena-gold/30 text-xs font-black uppercase tracking-widest shadow-gold-glow">
              <Sparkles className="w-4 h-4 text-arena-gold" />
              <span>Arena Voice 2026 • Inovação Ferroviária CPTM</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase">
              EM INSTANTES, <span className="text-arena-red">A VOZ É SUA</span>
            </h1>

            <div className="inline-block px-5 py-2 rounded-2xl bg-white/5 border border-white/10 text-gray-200 text-sm sm:text-lg font-bold uppercase tracking-wider">
              Aguarde o início das apresentações para avaliar os projetos no palco
            </div>

            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto font-medium leading-relaxed">
              Aponte a câmera do seu celular para entrar na arena de votação.
            </p>
          </div>

          {/* QR Code centralizado, limpo e de alta legibilidade */}
          <div className="p-4 bg-gradient-to-b from-arena-red/30 via-white/5 to-arena-gold/30 rounded-[40px] shadow-[0_20px_60px_rgba(227,6,19,0.25)] border border-white/20">
            <QRCodeDisplay size={280} showActions={false} />
          </div>

          <div className="space-y-1 text-xs text-gray-400 font-mono">
            <p>Conexão atômica e segura via Supabase • Um voto por participante por projeto</p>
            <p className="text-gray-500">Mantenha a página aberta no seu smartphone para votar instantaneamente</p>
          </div>
        </main>
      )}

      {/* ============================================================ */}
      {/* ESTADO 1.2 — PROJETO EM APRESENTAÇÃO E VOTAÇÃO               */}
      {/* ============================================================ */}
      {telaoState === '1.2_active_voting' && (
        <main className="flex-1 flex flex-col justify-center py-4 sm:py-6 z-10 max-w-7xl mx-auto w-full animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* LADO ESQUERDO: BANNER OFICIAL E DADOS DO PROJETO (5 colunas) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {/* Badge de Ordem e Status da Rodada */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-arena-red/20 text-arena-red border border-arena-red/50 text-xs font-black uppercase tracking-wider shadow-neon-glow animate-pulse">
                    <Flame className="w-4 h-4 text-arena-red" />
                    <span>Votação Aberta Agora no Palco</span>
                  </div>

                  <span className="text-xs uppercase font-extrabold text-arena-gold tracking-widest font-mono">
                    {projectOrderLabel}
                  </span>
                </div>

                {/* Título e Categoria */}
                <div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                    {activeProject?.name || 'Projeto em Apresentação'}
                  </h2>
                  {activeProject?.category && (
                    <span className="inline-block mt-1 text-xs sm:text-sm font-bold text-arena-blueLight">
                      {activeProject.category}
                    </span>
                  )}
                </div>

                {/* Descrição Oficial do Projeto */}
                {activeProject?.description && (
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed line-clamp-3">
                    {activeProject.description}
                  </p>
                )}
              </div>

              {/* Banner Oficial do Projeto (Proporção 16:9) */}
              <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-arena-red/50 shadow-[0_15px_40px_rgba(0,0,0,0.8)] bg-gradient-to-br from-[#0F111A] via-[#0A0B10] to-[#161824] flex items-center justify-center">
                {activeProject?.bannerUrl ? (
                  <img
                    src={activeProject.bannerUrl}
                    alt={activeProject.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <ArenaLogo variant="textWithSlogan" width={260} />
                    <span className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wider">
                      Arena Voice • Inovação Ferroviária CPTM
                    </span>
                  </div>
                )}
              </div>

              {/* Mini QR Code para retardatários */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5 shadow-lg">
                <div className="p-1.5 bg-white rounded-xl shrink-0">
                  <QRCodeDisplay size={70} showActions={false} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Ainda não votou?</span>
                    <span className="text-arena-red animate-pulse">• Aberto</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                    Aponte seu smartphone para o código ao lado e avalie nos 3 critérios oficiais antes do encerramento.
                  </p>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: CRONÔMETRO REGRESSIVO, PONTEIRO DINÂMICO E MÉTRICAS (7 colunas) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              {/* Cronômetro Regressivo e Contador de Votos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Cronômetro Regressivo Oficial (MM:SS) com Urgência nos últimos 10s */}
                <div
                  className={`p-4 rounded-3xl border transition-all flex items-center justify-between ${
                    isUrgentTimer
                      ? 'bg-red-950/60 border-arena-red shadow-[0_0_30px_rgba(227,6,19,0.5)] animate-pulse'
                      : 'bg-gradient-to-r from-[#12141F] via-[#0F1118] to-[#12141F] border-white/15 shadow-xl'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                        isUrgentTimer ? 'text-red-300' : 'text-gray-400'
                      }`}
                    >
                      {isUrgentTimer ? 'Atenção: Tempo Esgotando!' : 'Tempo Restante da Rodada'}
                    </span>
                    <div
                      className={`text-3xl sm:text-4xl font-black font-mono tracking-wider ${
                        isUrgentTimer ? 'text-red-400' : 'text-arena-gold'
                      }`}
                    >
                      {formatCountdown(remainingSeconds)}
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium">
                      {remainingSeconds > 0 ? 'Contagem regressiva sincronizada' : 'Votação encerrando...'}
                    </span>
                  </div>

                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isUrgentTimer
                        ? 'bg-red-600/30 border border-red-500 text-red-300 animate-bounce'
                        : 'bg-arena-gold/15 border border-arena-gold/30 text-arena-gold shadow-gold-glow'
                    }`}
                  >
                    {isUrgentTimer ? (
                      <ClockAlert className="w-6 h-6" />
                    ) : (
                      <Timer className="w-6 h-6 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Votos Confirmados em Tempo Real */}
                <div className="p-4 rounded-3xl bg-gradient-to-r from-[#12141F] via-[#0F1118] to-[#12141F] border border-white/15 shadow-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
                      Votos Confirmados
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider">
                      {roundVotesCount}
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium">
                      Auditados via Supabase
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-arena-red/15 border border-arena-red/30 flex items-center justify-center text-arena-red shadow-neon-glow shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* NOVO INDICADOR HORIZONTAL TECNOLÓGICO DE APROVAÇÃO */}
              <ApprovalGauge
                stats={approvalStats}
                roundStatus="aberta"
                compact={false}
              />
            </div>
          </div>
        </main>
      )}

      {/* ============================================================ */}
      {/* ESTADO 1.3 — ESTADO ENTRE PROJETOS                           */}
      {/* Votação encerrada, exibe resultado congelado e aguarda       */}
      {/* ============================================================ */}
      {telaoState === '1.3_between_projects' && (
        <main className="flex-1 flex flex-col justify-center py-4 sm:py-6 z-10 max-w-7xl mx-auto w-full animate-fade-in space-y-4">
          {/* Mensagem em Destaque: VOTAÇÃO ENCERRADA */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-arena-red/30 via-[#7F1D1D]/40 to-arena-black border-2 border-arena-red shadow-[0_10px_40px_rgba(227,6,19,0.4)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-arena-red text-white flex items-center justify-center shadow-neon-glow shrink-0">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                  VOTAÇÃO ENCERRADA — OBRIGADO PELA PARTICIPAÇÃO!
                </h3>
                <p className="text-xs sm:text-sm text-gray-200 font-medium mt-0.5">
                  Aguarde a apresentação do próximo projeto no palco.
                </p>
              </div>
            </div>

            <div className="shrink-0 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-bold font-mono text-arena-gold">
              Resultado Parcial Congelado
            </div>
          </div>

          {/* Grid do Projeto Recém-Avaliado e Consolidação Congelada */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* LADO ESQUERDO: Informações do Projeto Avaliado */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-gray-300 border border-white/20 text-xs font-black uppercase tracking-wider">
                    Projeto Concluído nesta Rodada
                  </span>
                  <span className="text-xs uppercase font-extrabold text-arena-gold tracking-widest font-mono">
                    {projectOrderLabel}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {activeProject?.name || 'Projeto Avaliado'}
                </h2>
                {activeProject?.category && (
                  <span className="text-xs font-bold text-arena-blueLight">
                    {activeProject.category}
                  </span>
                )}
              </div>

              {/* Banner do Projeto */}
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-gradient-to-br from-[#0F111A] to-[#161824] flex items-center justify-center">
                {activeProject?.bannerUrl ? (
                  <img
                    src={activeProject.bannerUrl}
                    alt={activeProject.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ArenaLogo variant="textWithSlogan" width={240} />
                )}
              </div>

              {/* Mini QR Code para quem quiser se conectar antes do próximo projeto */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                <div className="p-1.5 bg-white rounded-xl shrink-0">
                  <QRCodeDisplay size={64} showActions={false} />
                </div>
                <div className="text-[11px] text-gray-400">
                  <span className="font-bold text-white block">Aguarde o próximo projeto</span>
                  Escaneie agora para ficar pronto para a próxima votação.
                </div>
              </div>
            </div>

            {/* LADO DIREITO: Total de Votos Computados e Indicador Estabilizado */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 rounded-3xl bg-[#12141F] border border-white/15 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
                      Status da Avaliação
                    </span>
                    <div className="text-2xl font-black text-arena-gold uppercase">
                      Finalizada
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium">
                      Votos congelados no banco
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-arena-gold/15 border border-arena-gold/30 flex items-center justify-center text-arena-gold shrink-0">
                    <Lock className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-[#12141F] border border-white/15 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
                      Total de Votos Computados
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono">
                      {roundVotesCount}
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium">
                      Consolidação atômica
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-arena-red/15 border border-arena-red/30 flex items-center justify-center text-arena-red shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Indicador de Aprovação com Marcador Estabilizado */}
              <ApprovalGauge
                stats={approvalStats}
                roundStatus="encerrada"
                compact={false}
              />
            </div>
          </div>
        </main>
      )}

      {/* ============================================================ */}
      {/* ESTADO 1.4 — ESTADO FINAL: RESULTADO OFICIAL E PÓDIO          */}
      {/* Ativado quando o administrador publica os resultados         */}
      {/* ============================================================ */}
      {telaoState === '1.4_final_results' && (
        <main className="flex-1 flex flex-col justify-center py-4 sm:py-6 z-10 max-w-6xl mx-auto w-full animate-fade-in space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-arena-gold/15 text-arena-gold border border-arena-gold/30 text-xs font-black uppercase tracking-widest shadow-gold-glow">
              <Sparkles className="w-4 h-4 text-arena-gold" />
              <span>Consolidação Oficial • 20% Voto Popular + 80% Banca Técnica</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight">
              RESULTADO OFICIAL — <span className="text-arena-gold">ARENA VOICE</span>
            </h1>
          </div>

          {/* PÓDIO OFICIAL (Top 3) */}
          <div className="flex items-end justify-center gap-3 sm:gap-6 md:gap-8 w-full px-2 pt-4">
            {/* 2º Lugar (Prata) */}
            <div className="flex-1 max-w-[260px] flex flex-col items-center">
              {secondPlace ? (
                <div className="text-center mb-3 w-full animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-slate-300 text-black font-black flex items-center justify-center text-sm shadow-md mx-auto mb-2 border-2 border-white">
                    2º
                  </div>
                  {secondPlace.bannerUrl && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden mx-auto mb-2 border border-slate-400/40 shadow-md">
                      <img src={secondPlace.bannerUrl} alt={secondPlace.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-100 line-clamp-1">{secondPlace.name}</h3>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-0.5">{secondPlace.formattedGeneral}</div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Média Geral</div>
                  <div className="text-xs font-bold text-slate-300 bg-white/5 px-2.5 py-1 rounded-md mt-1 inline-block">
                    {secondPlace.formattedPoints} pts
                  </div>
                </div>
              ) : (
                <div className="text-center mb-3 text-gray-500 text-xs">Sem 2º Lugar</div>
              )}
              <div className="w-full h-44 sm:h-52 bg-gradient-to-t from-slate-700 via-slate-500 to-slate-400 rounded-t-2xl border-t-4 border-slate-300 shadow-xl flex flex-col items-center justify-center p-2">
                <Award className="w-10 h-10 text-slate-200 opacity-60" />
                <span className="text-xs font-black uppercase tracking-wider text-black/70 mt-1">2º Lugar</span>
              </div>
            </div>

            {/* 1º Lugar (Ouro) */}
            <div className="flex-1 max-w-[300px] flex flex-col items-center -mt-6">
              {firstPlace ? (
                <div className="text-center mb-3 w-full animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-b from-yellow-300 via-arena-gold to-yellow-600 text-black font-black flex items-center justify-center text-xl shadow-gold-glow mx-auto mb-2 border-2 border-yellow-200 animate-bounce">
                    <Trophy className="w-8 h-8" />
                  </div>
                  {firstPlace.bannerUrl && (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-2 border-2 border-arena-gold shadow-gold-glow">
                      <img src={firstPlace.bannerUrl} alt={firstPlace.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="font-black text-base sm:text-xl text-arena-goldLight line-clamp-1">{firstPlace.name}</h3>
                  <div className="text-4xl sm:text-5xl font-black text-arena-gold font-mono mt-0.5">{firstPlace.formattedGeneral}</div>
                  <div className="text-xs text-yellow-200 uppercase font-bold tracking-wider">Média Geral</div>
                  <div className="text-xs sm:text-sm font-black text-black bg-arena-gold px-3.5 py-1.5 rounded-full mt-1.5 shadow-gold-glow inline-block">
                    {firstPlace.formattedPoints} pontos
                  </div>
                </div>
              ) : (
                <div className="text-center mb-3 text-gray-500 text-xs">Sem 1º Lugar</div>
              )}
              <div className="w-full h-60 sm:h-68 bg-gradient-to-t from-amber-800 via-yellow-600 to-yellow-400 rounded-t-2xl border-t-4 border-yellow-200 shadow-gold-glow flex flex-col items-center justify-center p-2">
                <Trophy className="w-14 h-14 text-yellow-100 opacity-80" />
                <span className="text-sm font-black uppercase tracking-widest text-black/80 mt-1">Campeão</span>
              </div>
            </div>

            {/* 3º Lugar (Bronze) */}
            <div className="flex-1 max-w-[260px] flex flex-col items-center">
              {thirdPlace ? (
                <div className="text-center mb-3 w-full animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-amber-700 text-white font-black flex items-center justify-center text-sm shadow-md mx-auto mb-2 border-2 border-amber-500">
                    3º
                  </div>
                  {thirdPlace.bannerUrl && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden mx-auto mb-2 border border-amber-600/40 shadow-md">
                      <img src={thirdPlace.bannerUrl} alt={thirdPlace.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-100 line-clamp-1">{thirdPlace.name}</h3>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-0.5">{thirdPlace.formattedGeneral}</div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Média Geral</div>
                  <div className="text-xs font-bold text-amber-300 bg-white/5 px-2.5 py-1 rounded-md mt-1 inline-block">
                    {thirdPlace.formattedPoints} pts
                  </div>
                </div>
              ) : (
                <div className="text-center mb-3 text-gray-500 text-xs">Sem 3º Lugar</div>
              )}
              <div className="w-full h-36 sm:h-44 bg-gradient-to-t from-amber-950 via-amber-800 to-amber-700 rounded-t-2xl border-t-4 border-amber-500 shadow-xl flex flex-col items-center justify-center p-2">
                <Medal className="w-10 h-10 text-amber-200 opacity-60" />
                <span className="text-xs font-black uppercase tracking-wider text-black/70 mt-1">3º Lugar</span>
              </div>
            </div>
          </div>

          {/* Ranking Completo dos Demais Participantes */}
          {otherPlaces.length > 0 && (
            <div className="max-w-4xl mx-auto w-full mt-6 px-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                Classificação dos Demais Projetos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {otherPlaces.map((p) => (
                  <div
                    key={p.projectId}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#0F111A] border border-white/10 text-xs shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-gray-300 text-[11px]">
                        {p.rank !== null ? `${p.rank}º` : '-'}
                      </span>
                      <div>
                        <h5 className="font-bold text-white line-clamp-1">{p.name}</h5>
                        <span className="text-[10px] text-gray-400">{p.totalVotes} votos</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white text-sm block">{p.formattedGeneral}</span>
                      <span className="text-[10px] font-semibold text-arena-gold">{p.formattedPoints} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* Footer Minimalista e Elegante — Sem botões manuais de modo */}
      <footer className="w-full pt-3 border-t border-white/10 z-20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <span className="text-gray-400 font-medium text-[11px]">
          Arena Voice 2026 • Telão 16:9 Oficial • Transmissão em Tempo Real Supabase
        </span>
        <span className="text-gray-500 font-mono text-[10px]">
          Status do Sistema: Sincronizado
        </span>
      </footer>
    </div>
  );
};

export default BigScreenPresentationPage;
