import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArenaLogo, ArenaMascot } from '@/components/branding';
import { QRCodeDisplay } from '@/components/qrcode';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { AdminMockService } from '@/services/adminMockService';
import { ProjectDocument, RoundDocument, ResultDocument, EventDocument } from '@/types';
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

  // 1. Escuta o evento em tempo real
  useEffect(() => {
    const unsub = EventService.subscribeToCurrentEvent(DEFAULT_EVENT_ID, (ev) => {
      if (ev) setActiveEvent(ev);
    });
    return () => unsub();
  }, []);

  // 2. Escuta os projetos em tempo real
  useEffect(() => {
    const unsub = EventService.subscribeToProjectsList(DEFAULT_EVENT_ID, (projs) => {
      if (projs && projs.length > 0) {
        setProjects(projs);
      } else {
        const mockProjs = AdminMockService.getProjects().map((p) => ({
          id: p.id,
          eventId: DEFAULT_EVENT_ID,
          name: p.nome,
          description: p.descricao || '',
          bannerUrl: p.bannerUrl || '',
          order: p.ordem,
          active: p.ativo,
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
          updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        }));
        setProjects(mockProjs);
      }
    });
    return () => unsub();
  }, []);

  // 3. Escuta a rodada ativa em tempo real
  const roundId = activeEvent?.currentRoundId;
  useEffect(() => {
    if (!roundId) {
      setActiveRound(null);
      return;
    }
    const unsub = EventService.subscribeToActiveRound(roundId, (round) => {
      if (round) setActiveRound(round);
    });
    return () => unsub();
  }, [roundId]);

  // 4. Escuta todos os resultados agregados em tempo real
  useEffect(() => {
    const unsub = EventService.subscribeToAllEventResults(DEFAULT_EVENT_ID, (resList) => {
      if (resList && resList.length > 0) {
        setResultsList(resList);
      }
    });
    return () => unsub();
  }, []);

  // 5. Cronômetro da Rodada Oficial (Baseado em startedAt do servidor — não zera no refresh)
  useEffect(() => {
    if (activeRound?.status !== 'open' || !activeRound?.startedAt) {
      if (activeRound?.status !== 'open') setElapsedSeconds(0);
      return;
    }

    const startedMillis = activeRound.startedAt.toMillis
      ? activeRound.startedAt.toMillis()
      : typeof activeRound.startedAt === 'number'
      ? activeRound.startedAt
      : Date.now();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startedMillis) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeRound?.status, activeRound?.startedAt]);

  // Ranking calculado
  const rankedResults = useMemo(() => {
    const resultsMap = new Map<string, ResultDocument>();
    resultsList.forEach((r) => resultsMap.set(r.projectId, r));
    return buildRankedResults(projects, resultsMap);
  }, [projects, resultsList]);

  // Projeto ativo na rodada
  const activeProject = useMemo(() => {
    const projId = activeRound?.projectId || activeEvent?.currentProjectId;
    return projects.find((p) => p.id === projId) || null;
  }, [activeRound?.projectId, activeEvent?.currentProjectId, projects]);

  // Votos da rodada ativa
  const activeProjectVotes = useMemo(() => {
    if (!activeProject?.id) return 0;
    const res = resultsList.find((r) => r.projectId === activeProject.id);
    return res?.totalVotes || 0;
  }, [activeProject?.id, resultsList]);

  // Determina o modo exibido: 'qrcode' | 'round' | 'ranking'
  const displayMode = useMemo(() => {
    if (currentModeParam !== 'auto') {
      return currentModeParam;
    }
    // Lógica inteligente do modo AUTO:
    if (activeEvent?.resultsPublished) {
      return 'ranking';
    }
    if (activeRound?.status === 'open') {
      return 'round';
    }
    return 'qrcode';
  }, [currentModeParam, activeEvent?.resultsPublished, activeRound?.status]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-arena-black text-white p-4 sm:p-8 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Stage Atmosfera */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-arena-red/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[400px] bg-arena-blue/15 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 opacity-10 pointer-events-none">
        <ArenaMascot variant="transparent" width={540} />
      </div>

      {/* Header do Telão (16:9) */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-arena-border/60 pb-4 relative z-10">
        <ArenaLogo variant="complete" width={320} />

        <div className="flex items-center gap-4">
          {/* Indicador de Status do Modo */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-arena-border text-xs font-bold uppercase tracking-wider">
            <RadioTower className="w-3.5 h-3.5 text-arena-red animate-pulse" />
            <span>
              {displayMode === 'round'
                ? 'Rodada ao Vivo'
                : displayMode === 'ranking'
                ? 'Pódio Oficial'
                : 'QR Code de Entrada'}
            </span>
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
      {/* MODO 1: QR CODE DE ENTRADA DO PÚBLICO                         */}
      {/* ============================================================ */}
      {displayMode === 'qrcode' && (
        <main className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8 z-10 text-center space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-arena-gold/15 text-arena-gold border border-arena-gold/30 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Participe da Avaliação dos Projetos</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
              VOTO <span className="text-arena-red">POPULAR</span>
            </h1>
            <p className="text-sm sm:text-lg text-gray-300 max-w-lg mx-auto font-medium">
              Aponte a câmera do seu celular para entrar na arena de votação.
            </p>
          </div>

          <div className="p-3 bg-gradient-to-b from-arena-gold/30 via-transparent to-arena-red/30 rounded-[36px] shadow-gold-glow">
            <QRCodeDisplay size={280} showActions={false} />
          </div>

          <p className="text-xs text-gray-400 font-mono">
            Acesso único garantido • Mantenha o navegador aberto no seu smartphone
          </p>
        </main>
      )}

      {/* ============================================================ */}
      {/* MODO 2: RODADA AO VIVO (PROJETO NO PALCO & VOTAÇÃO EM TEMPO REAL) */}
      {/* ============================================================ */}
      {displayMode === 'round' && (
        <main className="flex-1 flex flex-col justify-center py-6 z-10 max-w-6xl mx-auto w-full animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Lado Esquerdo: Banner e Detalhes do Projeto Ativo (8 colunas) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-arena-red/20 text-arena-red border border-arena-red/40 text-xs font-black uppercase tracking-wider animate-pulse">
                <Flame className="w-4 h-4" />
                <span>Votação Aberta Agora no Palco</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs uppercase font-extrabold text-arena-blueLight tracking-widest">
                  Projeto #{activeProject?.order || 1}
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  {activeProject?.name || 'Projeto em Apresentação'}
                </h2>
                {activeProject?.description && (
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed pt-1">
                    {activeProject.description}
                  </p>
                )}
              </div>

              {/* Banner do Projeto com Borda Neon */}
              <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden border-2 border-arena-red/50 shadow-neon-glow bg-arena-card">
                {activeProject?.bannerUrl ? (
                  <img
                    src={activeProject.bannerUrl}
                    alt={activeProject.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-arena-navy via-arena-black to-arena-card">
                    <ArenaLogo variant="textWithSlogan" width={280} />
                    <span className="text-sm font-bold text-gray-400 mt-2">
                      Avalie: Inovação • Impacto CPTM • Salto Tecnológico
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Lado Direito: Cronômetro, Contador de Votos e Mini QR Code (5 colunas) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Card de Votos em Tempo Real */}
              <div className="p-6 rounded-3xl bg-arena-card/90 border border-arena-border/80 shadow-2xl relative overflow-hidden space-y-3">
                <div className="absolute top-0 right-0 w-32 h-32 bg-arena-red/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">
                    Votos Recebidos
                  </span>
                  <Users className="w-5 h-5 text-arena-red" />
                </div>
                <div className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight animate-fade-in">
                  {activeProjectVotes}
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-arena-red to-arena-blue transition-all duration-700"
                    style={{ width: `${Math.min(100, (activeProjectVotes / 150) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  Atualização atômica em tempo real sincronizada com os smartphones da plateia.
                </p>
              </div>

              {/* Card do Cronômetro Oficial do Servidor */}
              <div className="p-5 rounded-3xl bg-arena-card/90 border border-arena-border/80 shadow-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase text-gray-400 tracking-wider block">
                    Tempo de Votação
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-arena-gold font-mono">
                    {formatTimer(elapsedSeconds)}
                  </span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-arena-gold/15 border border-arena-gold/30 flex items-center justify-center text-arena-gold">
                  <Timer className="w-7 h-7 animate-pulse" />
                </div>
              </div>

              {/* Mini QR Code para retardatários */}
              <div className="p-4 rounded-3xl bg-arena-card/60 border border-arena-border/60 flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shrink-0">
                  <QRCodeDisplay size={80} showActions={false} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Não votou ainda?</h4>
                  <p className="text-[11px] text-gray-400">
                    Aponte seu celular para o código ao lado e envie sua nota antes do encerramento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ============================================================ */}
      {/* MODO 3: PÓDIO E RANKING OFICIAL HOMOLOGADO                    */}
      {/* ============================================================ */}
      {displayMode === 'ranking' && (
        <main className="flex-1 flex flex-col justify-center py-6 z-10 max-w-5xl mx-auto w-full animate-fade-in">
          {/* Top 3 Colunas de Pódio */}
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
      <footer className="w-full pt-3 border-t border-arena-border/40 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10">
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

        <span className="text-gray-500 text-[11px]">
          Arena Voice 2026 • Telão 16:9 Oficial
        </span>
      </footer>
    </div>
  );
};

export default BigScreenPresentationPage;
