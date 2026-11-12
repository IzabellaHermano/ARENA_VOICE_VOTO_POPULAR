import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArenaLogo, ArenaMascot } from '@/components/branding';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { AdminMockService } from '@/services/adminMockService';
import { ProjectDocument, ResultDocument, EventDocument } from '@/types';
import { buildRankedResults } from '@/utils/scoring';
import {
  Trophy,
  Award,
  Medal,
  Maximize2,
  Minimize2,
  RadioTower,
  Sparkles,
  Hourglass,
} from 'lucide-react';

export const BigScreenRankingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  const [activeEvent, setActiveEvent] = useState<EventDocument | null>(null);
  const [projects, setProjects] = useState<ProjectDocument[]>([]);
  const [resultsList, setResultsList] = useState<ResultDocument[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Escuta o evento em tempo real (verifica resultsPublished)
  useEffect(() => {
    const unsub = EventService.subscribeToCurrentEvent(DEFAULT_EVENT_ID, (ev) => {
      if (ev) {
        setActiveEvent(ev);
      }
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

  // 3. Escuta os resultados em tempo real
  useEffect(() => {
    const unsub = EventService.subscribeToAllEventResults(DEFAULT_EVENT_ID, (resList) => {
      setResultsList(resList || []);
    });
    return () => unsub();
  }, []);

  // 4. Calcula o ranking com precisão matemática completa e suporte a empates
  const rankedResults = useMemo(() => {
    const resultsMap = new Map<string, ResultDocument>();
    resultsList.forEach((r) => {
      resultsMap.set(r.projectId, r);
    });
    return buildRankedResults(projects, resultsMap);
  }, [projects, resultsList]);

  // Controle de Tela Cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const isPublished = (activeEvent?.resultsPublished ?? false) || isPreview;

  // Separa Top 3 e demais colocações
  const firstPlace = rankedResults.find((p) => p.rank === 1 && p.hasEvaluations);
  const secondPlace = rankedResults.find((p) => p.rank === 2 && p.hasEvaluations);
  const thirdPlace = rankedResults.find((p) => p.rank === 3 && p.hasEvaluations);
  const otherPlaces = rankedResults.filter(
    (p) => (p.rank === null || p.rank > 3) && p !== firstPlace && p !== secondPlace && p !== thirdPlace
  );

  // TELA 1: Se a divulgação ainda NÃO foi autorizada
  if (!isPublished) {
    return (
      <div className="min-h-screen bg-arena-dark text-white p-6 sm:p-10 flex flex-col justify-between items-center text-center relative overflow-hidden select-none">
        {/* Mascote decorativo sutil */}
        <div className="absolute -bottom-20 -right-16 opacity-10 pointer-events-none">
          <ArenaMascot variant="transparent" width={560} />
        </div>

        {/* Header */}
        <div className="w-full flex justify-between items-center z-10 border-b border-arena-border/50 pb-4">
          <ArenaLogo variant="complete" width={280} />
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Centro de Espera com Efeito Neon */}
        <div className="max-w-xl mx-auto space-y-6 z-10 my-auto py-12">
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-arena-red/20 animate-ping opacity-60" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-b from-arena-surface to-arena-card border-2 border-arena-red/60 flex items-center justify-center shadow-neon-glow">
              <Hourglass className="w-10 h-10 text-arena-red animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/30 text-xs font-bold uppercase tracking-wider">
              <RadioTower className="w-3.5 h-3.5" />
              <span>Apuração do Voto Popular</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              RESULTADO EM APURAÇÃO
            </h1>
            <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto">
              A consolidação dos votos está em andamento. O pódio e a classificação oficial do Voto Popular serão revelados nesta tela em instantes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center py-4 text-xs text-gray-500 border-t border-arena-border/40 z-10">
          Arena Voice 2026 • Transmissão Oficial de Resultados
        </footer>
      </div>
    );
  }

  // TELA 2: PÓDIO OFICIAL E RANKING FINAL REVELADO
  return (
    <div className="min-h-screen bg-arena-dark text-white p-4 sm:p-8 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Glows e Mascote */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-arena-gold/5 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 opacity-10 pointer-events-none">
        <ArenaMascot variant="transparent" width={520} />
      </div>

      {/* Header Oficial do Telão */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-arena-border/60 pb-4 relative z-10">
        <ArenaLogo variant="complete" width={320} />

        <div className="text-center sm:text-right flex items-center sm:items-end gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-gold/15 text-arena-gold border border-arena-gold/30 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Resultado Oficial Homologado</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              VOTO <span className="text-arena-red">POPULAR</span>
            </h1>
            <p className="text-xs italic text-gray-400 font-serif">
              Grandes ideias também nascem do público.
            </p>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors shrink-0"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* PÓDIO PRINCIPAL EM 3D / COLUNAS */}
      <main className="flex-1 flex flex-col justify-center py-6 sm:py-10 relative z-10">
        <div className="flex items-end justify-center gap-3 sm:gap-6 md:gap-10 max-w-5xl mx-auto w-full px-2">
          {/* ================= 2º LUGAR (PRATA) ================= */}
          <div className="flex-1 max-w-[240px] flex flex-col items-center">
            {secondPlace ? (
              <div className="text-center mb-3 w-full animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-gradient-to-b from-slate-200 to-slate-400 text-black font-black flex items-center justify-center text-base shadow-md mx-auto mb-2 border-2 border-white">
                  2º
                </div>
                {secondPlace.bannerUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden mx-auto mb-2 border border-slate-400/40 shadow-md">
                    <img src={secondPlace.bannerUrl} alt={secondPlace.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <h3 className="font-extrabold text-sm sm:text-base text-gray-100 line-clamp-1">
                  {secondPlace.name}
                </h3>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-0.5">
                  {secondPlace.formattedGeneral}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Média Geral</div>
                <div className="text-xs font-bold text-slate-300 mt-1 bg-white/5 px-2 py-0.5 rounded-md inline-block">
                  {secondPlace.formattedPoints} pts
                </div>
              </div>
            ) : (
              <div className="text-center mb-3 text-gray-500 text-xs">Sem 2º Lugar</div>
            )}

            <div className="w-full h-48 sm:h-56 bg-gradient-to-t from-slate-700 via-slate-500 to-slate-400 rounded-t-2xl border-t-4 border-slate-300 shadow-xl flex flex-col items-center justify-center p-2">
              <Award className="w-10 h-10 text-slate-200 opacity-60" />
              <span className="text-xs font-black uppercase tracking-wider text-black/70 mt-1">2º Lugar</span>
            </div>
          </div>

          {/* ================= 1º LUGAR (OURO) ================= */}
          <div className="flex-1 max-w-[280px] flex flex-col items-center -mt-6">
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
                <h3 className="font-black text-base sm:text-xl text-arena-goldLight line-clamp-1">
                  {firstPlace.name}
                </h3>
                <div className="text-3xl sm:text-5xl font-black text-arena-gold font-mono mt-0.5">
                  {firstPlace.formattedGeneral}
                </div>
                <div className="text-xs text-yellow-200 uppercase font-bold tracking-wider">Média Geral</div>
                <div className="text-sm font-black text-black bg-arena-gold px-3 py-1 rounded-full mt-1.5 shadow-gold-glow inline-block">
                  {firstPlace.formattedPoints} pontos
                </div>
              </div>
            ) : (
              <div className="text-center mb-3 text-gray-500 text-xs">Sem 1º Lugar</div>
            )}

            <div className="w-full h-64 sm:h-72 bg-gradient-to-t from-amber-800 via-yellow-600 to-yellow-400 rounded-t-2xl border-t-4 border-yellow-200 shadow-gold-glow flex flex-col items-center justify-center p-2">
              <Trophy className="w-14 h-14 text-yellow-100 opacity-80" />
              <span className="text-sm font-black uppercase tracking-widest text-black/80 mt-1">Campeão</span>
            </div>
          </div>

          {/* ================= 3º LUGAR (BRONZE) ================= */}
          <div className="flex-1 max-w-[240px] flex flex-col items-center">
            {thirdPlace ? (
              <div className="text-center mb-3 w-full animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-gradient-to-b from-amber-600 to-amber-800 text-white font-black flex items-center justify-center text-base shadow-md mx-auto mb-2 border-2 border-amber-500">
                  3º
                </div>
                {thirdPlace.bannerUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden mx-auto mb-2 border border-amber-600/40 shadow-md">
                    <img src={thirdPlace.bannerUrl} alt={thirdPlace.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <h3 className="font-extrabold text-sm sm:text-base text-gray-100 line-clamp-1">
                  {thirdPlace.name}
                </h3>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-0.5">
                  {thirdPlace.formattedGeneral}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Média Geral</div>
                <div className="text-xs font-bold text-amber-300 mt-1 bg-white/5 px-2 py-0.5 rounded-md inline-block">
                  {thirdPlace.formattedPoints} pts
                </div>
              </div>
            ) : (
              <div className="text-center mb-3 text-gray-500 text-xs">Sem 3º Lugar</div>
            )}

            <div className="w-full h-40 sm:h-44 bg-gradient-to-t from-amber-950 via-amber-800 to-amber-700 rounded-t-2xl border-t-4 border-amber-500 shadow-xl flex flex-col items-center justify-center p-2">
              <Medal className="w-10 h-10 text-amber-200 opacity-60" />
              <span className="text-xs font-black uppercase tracking-wider text-black/70 mt-1">3º Lugar</span>
            </div>
          </div>
        </div>

        {/* Demais Posições em Cards Secundários */}
        {otherPlaces.length > 0 && (
          <div className="max-w-4xl mx-auto w-full mt-6 sm:mt-8 px-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
              Demais Participantes da Competição
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {otherPlaces.map((p) => (
                <div
                  key={p.projectId}
                  className="flex items-center justify-between p-3 rounded-xl bg-arena-card border border-arena-border text-xs"
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

      {/* Footer */}
      <footer className="text-center py-2 text-xs text-gray-500 border-t border-arena-border/40 relative z-10">
        Arena Voice — Voto Popular • Exibição em Telão Oficial ao Vivo
      </footer>
    </div>
  );
};

export default BigScreenRankingPage;
