import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArenaLogo, ArenaMascot } from '@/components/branding';
import { QRCodeDisplay } from '@/components/qrcode';
import { ApprovalGauge } from '@/components/admin/ApprovalGauge';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { ProjectDocument, RoundDocument, ResultDocument, EventDocument } from '@/types';
import {
  ApprovalStats,
  calculateApprovalStats,
  parseRoundStartMillis,
  formatStopwatch,
} from '@/utils/approvalCalculator';
import { buildRankedResults } from '@/utils/scoring';
import {
  Trophy,
  Award,
  Medal,
  Maximize2,
  Minimize2,
  RadioTower,
  Sparkles,
  Flame,
  Users,
  Timer,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export const BigScreenPresentationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentModeParam = searchParams.get('mode') || 'auto';

  const [activeEvent, setActiveEvent] = useState<EventDocument | null>(null);
  const [activeRound, setActiveRound] = useState<RoundDocument | null>(null);
  const [projects, setProjects] = useState<ProjectDocument[]>([]);
  const [resultsList, setResultsList] = useState<ResultDocument[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats>(() => calculateApprovalStats([]));

  // 1. Escuta o evento principal em tempo real
  useEffect(() => {
    const unsub = EventService.subscribeToCurrentEvent(DEFAULT_EVENT_ID, (ev) => {
      if (ev) setActiveEvent(ev);
    });
    return () => unsub();
  }, []);

  // 2. Escuta os projetos em tempo real exclusivamente do Supabase
  useEffect(() => {
    const unsub = EventService.subscribeToProjectsList(DEFAULT_EVENT_ID, (projs) => {
      setProjects(projs || []);
    });
    return () => unsub();
  }, []);

  // 3. Monitora o ciclo de vida completo da rodada (Aguardando -> Aberta -> Encerrada -> Nova Rodada)
  useEffect(() => {
    const unsub = EventService.subscribeToLatestRound(DEFAULT_EVENT_ID, (round) => {
      setActiveRound(round);
    });
    return () => unsub();
  }, []);

  // 4. Escuta os resultados agregados de todos os projetos em tempo real
  useEffect(() => {
    const unsub = EventService.subscribeToAllEventResults(DEFAULT_EVENT_ID, (resList) => {
      if (resList && resList.length > 0) {
        setResultsList(resList);
      }
    });
    return () => unsub();
  }, []);

  // 5. Projeto Ativo na Rodada
  const activeProject = useMemo(() => {
    if (!activeRound?.projectId && !activeEvent?.currentProjectId) return null;
    const targetId = activeRound?.projectId || activeEvent?.currentProjectId;
    return projects.find((p) => p.id === targetId) || null;
  }, [activeRound?.projectId, activeEvent?.currentProjectId, projects]);

  // 6. Ponteiro Dinâmico: Sincronização em tempo real para o projeto ativo
  useEffect(() => {
    if (!activeProject?.id) {
      setApprovalStats(calculateApprovalStats([]));
      return;
    }

    const unsub = EventService.subscribeToProjectApprovalStats(
      DEFAULT_EVENT_ID,
      activeProject.id,
      activeRound?.id,
      (newStats) => {
        setApprovalStats(newStats);
      }
    );

    return () => unsub();
  }, [activeProject?.id, activeRound?.id]);

  // 7. Cronômetro Oficial do Servidor (Baseado em startedAt e endedAt — imune a refresh e reconexões)
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

    // ESTADO 3 (Fim da Rodada): O cronômetro congela na duração final
    if (activeRound.status === 'closed') {
      const endMillis = activeRound.endedAt ? parseRoundStartMillis(activeRound.endedAt) : Date.now();
      const finalDiff = Math.max(0, Math.floor((endMillis - startMillis) / 1000));
      setElapsedSeconds(finalDiff);
      return;
    }

    // Se não estiver aberta, mantém zerado
    if (activeRound.status !== 'open') {
      setElapsedSeconds(0);
      return;
    }

    // ESTADO 2 (Rodada Aberta): Atualiza a cada segundo com precisão absoluta
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startMillis) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeRound?.status, activeRound?.startedAt, activeRound?.endedAt]);

  // 8. Determina o modo exibido: 'qrcode' | 'round' | 'ranking'
  const displayMode = useMemo(() => {
    if (currentModeParam !== 'auto') {
      return currentModeParam;
    }

    // Se os resultados finais estiverem publicados, vai para o Pódio Oficial
    if (activeEvent?.resultsPublished) {
      return 'ranking';
    }

    // Se houver rodada aberta ou encerrada com projeto, apresenta a experiência de rodada
    if (activeRound?.status === 'open' || activeRound?.status === 'closed') {
      return 'round';
    }

    // Caso padrão: QR code e espera de liberação
    return 'qrcode';
  }, [currentModeParam, activeEvent?.resultsPublished, activeRound?.status]);

  // Ranking calculado para o Pódio
  const rankedResults = useMemo(() => {
    const resultsMap = new Map<string, ResultDocument>();
    resultsList.forEach((r) => resultsMap.set(r.projectId, r));
    return buildRankedResults(projects, resultsMap);
  }, [projects, resultsList]);

  // Votos da rodada ativa
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

  const isRoundOpen = activeRound?.status === 'open';
  const isRoundClosed = activeRound?.status === 'closed';

  return (
    <div className="min-h-screen bg-[#07080D] text-white p-4 sm:p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Stage Atmosfera Futurista Arena Voice */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[450px] bg-arena-red/12 blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[400px] bg-arena-blue/10 blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 opacity-5 pointer-events-none">
        <ArenaMascot variant="transparent" width={560} />
      </div>

      {/* Header do Telão (16:9) */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <ArenaLogo variant="complete" width={320} />

        <div className="flex items-center gap-4">
          {/* Indicador de Status do Telão */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/70 border border-white/15 text-xs font-black uppercase tracking-wider">
            {displayMode === 'round' && isRoundOpen ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-arena-red animate-ping" />
                <span className="text-arena-red font-mono">Votação ao Vivo no Palco</span>
              </>
            ) : displayMode === 'round' && isRoundClosed ? (
              <>
                <Lock className="w-3.5 h-3.5 text-arena-gold" />
                <span className="text-gray-300">Fim da Rodada</span>
              </>
            ) : displayMode === 'ranking' ? (
              <>
                <Trophy className="w-3.5 h-3.5 text-arena-gold" />
                <span className="text-arena-gold">Pódio Oficial</span>
              </>
            ) : (
              <>
                <RadioTower className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400">Aguardando Liberação</span>
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
      {/* ESTADO 1: AGUARDANDO LIBERAÇÃO DO PRÓXIMO PROJETO            */}
      {/* ============================================================ */}
      {displayMode === 'qrcode' && (
        <main className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 z-10 text-center space-y-6 animate-fade-in max-w-4xl mx-auto w-full">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-arena-gold/15 text-arena-gold border border-arena-gold/30 text-xs font-black uppercase tracking-widest shadow-gold-glow">
              <Sparkles className="w-4 h-4 text-arena-gold" />
              <span>Arena Voice 2026 • Palco Principal</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
              VOTO <span className="text-arena-red">POPULAR</span>
            </h1>

            <div className="inline-block px-4 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm sm:text-base font-bold uppercase tracking-wider">
              Aguardando Liberação do Próximo Projeto
            </div>

            <p className="text-sm sm:text-lg text-gray-300 max-w-xl mx-auto font-medium leading-relaxed">
              Aponte a câmera do seu celular para entrar na arena de votação e aguarde o início da apresentação no palco.
            </p>
          </div>

          {/* QR Code com borda elegante */}
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
      {/* ESTADOS 2 E 3: PROJETO LIBERADO / VOTAÇÃO ATIVA OU FIM RODADA*/}
      {/* ============================================================ */}
      {displayMode === 'round' && (
        <main className="flex-1 flex flex-col justify-center py-4 sm:py-6 z-10 max-w-7xl mx-auto w-full animate-fade-in">
          {/* BANNER DE TRANSIÇÃO: ESTADO 3 — FIM DA RODADA DE VOTAÇÃO */}
          {isRoundClosed && (
            <div className="mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-arena-red/25 via-[#7F1D1D]/30 to-arena-black border-2 border-arena-red/80 shadow-[0_10px_35px_rgba(227,6,19,0.35)] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-arena-red text-white flex items-center justify-center shadow-neon-glow shrink-0">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                    FIM DA RODADA DE VOTAÇÃO
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-200 font-medium">
                    A votação deste projeto foi encerrada. Aguarde a liberação do próximo projeto.
                  </p>
                </div>
              </div>

              <div className="shrink-0 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold font-mono text-arena-gold">
                Resultado Oficial Congelado
              </div>
            </div>
          )}

          {/* Grid Principal 16:9 do Telão */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* LADO ESQUERDO: BANNER OFICIAL E DADOS DO PROJETO (5 colunas) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {/* Badge de Status da Rodada */}
                <div className="flex items-center gap-2">
                  {isRoundOpen ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-arena-red/20 text-arena-red border border-arena-red/50 text-xs font-black uppercase tracking-wider shadow-neon-glow animate-pulse">
                      <Flame className="w-4 h-4 text-arena-red" />
                      <span>Votação Aberta Agora no Palco</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-gray-300 border border-white/20 text-xs font-black uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-arena-gold" />
                      <span>Projeto Concluído nesta Rodada</span>
                    </div>
                  )}

                  <span className="text-xs uppercase font-extrabold text-arena-gold tracking-widest font-mono">
                    #{activeProject?.order || 1}
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

              {/* Banner Oficial do Projeto (Proporções 16:9, sem distorção) */}
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
                    {isRoundOpen && <span className="text-arena-red animate-pulse">• Aberto</span>}
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                    Aponte seu smartphone para o código ao lado e avalie nos 3 critérios oficiais antes do encerramento.
                  </p>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: CRONÔMETRO, PONTEIRO DINÂMICO E MÉTRICAS (7 colunas) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              {/* Cronômetro Oficial do Servidor e Contador de Votos Sincronizados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Cronômetro Oficial (00:00:00) */}
                <div className="p-4 rounded-3xl bg-gradient-to-r from-[#12141F] via-[#0F1118] to-[#12141F] border border-white/15 shadow-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
                      Cronômetro Oficial
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-arena-gold font-mono tracking-wider">
                      {formatStopwatch(elapsedSeconds)}
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium">
                      {isRoundOpen ? 'Contagem ativa • startedAt' : 'Tempo final gravado'}
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-arena-gold/15 border border-arena-gold/30 flex items-center justify-center text-arena-gold shadow-gold-glow shrink-0">
                    <Timer className={`w-6 h-6 ${isRoundOpen ? 'animate-pulse' : ''}`} />
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

              {/* PONTEIRO DINÂMICO DE AVALIAÇÃO (MOSTRADOR TECNOLÓGICO) */}
              <ApprovalGauge
                stats={approvalStats}
                roundStatus={isRoundOpen ? 'aberta' : isRoundClosed ? 'encerrada' : 'aguardando'}
                compact={false}
              />
            </div>
          </div>
        </main>
      )}

      {/* ============================================================ */}
      {/* MODO 3: PÓDIO E RANKING OFICIAL HOMOLOGADO                    */}
      {/* ============================================================ */}
      {displayMode === 'ranking' && (
        <main className="flex-1 flex flex-col justify-center py-6 z-10 max-w-5xl mx-auto w-full animate-fade-in">
          <div className="text-center mb-6 space-y-1">
            <span className="text-xs font-black uppercase tracking-widest text-arena-gold">
              Resultado Oficial Consolidado
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase">
              PÓDIO DA COMPETIÇÃO
            </h2>
          </div>

          <div className="flex items-end justify-center gap-3 sm:gap-6 md:gap-8 w-full">
            {/* 2º Lugar */}
            <div className="flex-1 max-w-[240px] flex flex-col items-center">
              {rankedResults[1] ? (
                <div className="text-center mb-2 w-full">
                  <div className="w-11 h-11 rounded-full bg-slate-300 text-black font-black flex items-center justify-center text-sm shadow-md mx-auto mb-2 border-2 border-white">
                    2º
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-100 line-clamp-1">{rankedResults[1].name}</h3>
                  <div className="text-2xl font-black text-white font-mono">{rankedResults[1].formattedGeneral}</div>
                  <div className="text-xs font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded mt-0.5 inline-block">
                    {rankedResults[1].formattedPoints} pts
                  </div>
                </div>
              ) : null}
              <div className="w-full h-44 sm:h-52 bg-gradient-to-t from-slate-700 via-slate-500 to-slate-400 rounded-t-2xl border-t-4 border-slate-300 shadow-xl flex items-center justify-center">
                <Award className="w-10 h-10 text-slate-200 opacity-60" />
              </div>
            </div>

            {/* 1º Lugar */}
            <div className="flex-1 max-w-[280px] flex flex-col items-center -mt-6">
              {rankedResults[0] ? (
                <div className="text-center mb-2 w-full">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-b from-yellow-300 via-arena-gold to-yellow-600 text-black font-black flex items-center justify-center text-xl shadow-gold-glow mx-auto mb-2 border-2 border-yellow-200 animate-bounce">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-base sm:text-lg text-arena-goldLight line-clamp-1">{rankedResults[0].name}</h3>
                  <div className="text-4xl sm:text-5xl font-black text-arena-gold font-mono">{rankedResults[0].formattedGeneral}</div>
                  <div className="text-xs sm:text-sm font-black text-black bg-arena-gold px-3 py-1 rounded-full mt-1 shadow-gold-glow inline-block">
                    {rankedResults[0].formattedPoints} pontos
                  </div>
                </div>
              ) : null}
              <div className="w-full h-60 sm:h-68 bg-gradient-to-t from-amber-800 via-yellow-600 to-yellow-400 rounded-t-2xl border-t-4 border-yellow-200 shadow-gold-glow flex items-center justify-center">
                <Trophy className="w-14 h-14 text-yellow-100 opacity-80" />
              </div>
            </div>

            {/* 3º Lugar */}
            <div className="flex-1 max-w-[240px] flex flex-col items-center">
              {rankedResults[2] ? (
                <div className="text-center mb-2 w-full">
                  <div className="w-11 h-11 rounded-full bg-amber-700 text-white font-black flex items-center justify-center text-sm shadow-md mx-auto mb-2 border-2 border-amber-500">
                    3º
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-100 line-clamp-1">{rankedResults[2].name}</h3>
                  <div className="text-2xl font-black text-white font-mono">{rankedResults[2].formattedGeneral}</div>
                  <div className="text-xs font-bold text-amber-300 bg-white/5 px-2 py-0.5 rounded mt-0.5 inline-block">
                    {rankedResults[2].formattedPoints} pts
                  </div>
                </div>
              ) : null}
              <div className="w-full h-36 sm:h-40 bg-gradient-to-t from-amber-950 via-amber-800 to-amber-700 rounded-t-2xl border-t-4 border-amber-500 shadow-xl flex items-center justify-center">
                <Medal className="w-10 h-10 text-amber-200 opacity-60" />
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Barra de Controle de Modos para Operador de Palco (Flutuante no Rodapé) */}
      <footer className="w-full pt-3 border-t border-white/10 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-black/70 rounded-xl border border-white/10">
          <button
            onClick={() => setSearchParams({ mode: 'auto' })}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              currentModeParam === 'auto'
                ? 'bg-arena-red text-white shadow-neon-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Modo Automático
          </button>
          <button
            onClick={() => setSearchParams({ mode: 'qrcode' })}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              currentModeParam === 'qrcode'
                ? 'bg-arena-red text-white shadow-neon-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            QR Code
          </button>
          <button
            onClick={() => setSearchParams({ mode: 'round' })}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              currentModeParam === 'round'
                ? 'bg-arena-red text-white shadow-neon-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Rodada ao Vivo
          </button>
          <button
            onClick={() => setSearchParams({ mode: 'ranking' })}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              currentModeParam === 'ranking'
                ? 'bg-arena-red text-white shadow-neon-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Pódio Oficial
          </button>
        </div>

        <span className="text-gray-500 text-[11px] font-mono">
          Arena Voice 2026 • Telão 16:9 Oficial • Supabase Realtime
        </span>
      </footer>
    </div>
  );
};

export default BigScreenPresentationPage;
