import React, { useState, useEffect, useMemo } from 'react';
import { ArenaLogo } from '@/components/branding';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { AdminMockService } from '@/services/adminMockService';
import { ProjectDocument, ResultDocument, EventDocument } from '@/types';
import { buildRankedResults, ProjectScoringResult } from '@/utils/scoring';
import {
  PublishResultsBanner,
  ProjectResultCard,
  CriteriaComparisonChart,
  ParticipationChart,
  ResultsTable,
  ExportModal,
} from '@/components/results';
import {
  Download,
  ExternalLink,
  Trophy,
  Loader2,
  LayoutGrid,
  BarChart3,
  Table as TableIcon,
} from 'lucide-react';

export const AdminResultsPage: React.FC = () => {
  const [activeEvent, setActiveEvent] = useState<EventDocument | null>(null);
  const [projects, setProjects] = useState<ProjectDocument[]>([]);
  const [resultsList, setResultsList] = useState<ResultDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPublish, setIsUpdatingPublish] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'charts' | 'table'>('cards');

  // 1. Escuta o evento em tempo real (para status de publicação resultsPublished)
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
        // Fallback local do MockService
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
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // 3. Escuta todos os resultados consolidados do evento em tempo real
  useEffect(() => {
    const unsub = EventService.subscribeToAllEventResults(DEFAULT_EVENT_ID, (resList) => {
      if (resList && resList.length > 0) {
        setResultsList(resList);
      } else {
        // Fallback para mock demonstrativo com 4 projetos avaliados e 1 sem avaliações
        const mockResults: ResultDocument[] = [
          {
            id: `${DEFAULT_EVENT_ID}_projeto01`,
            eventId: DEFAULT_EVENT_ID,
            projectId: 'projeto01',
            totalVotes: 142,
            sumInnovation: 610.6,
            sumImpact: 639.0,
            sumDevelopment: 582.2,
            averageInnovation: 4.3,
            averageImpact: 4.5,
            averageDevelopment: 4.1,
            averageGeneral: 4.3,
            percentage: 86.0,
            popularPoints: 17.2,
            updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
          },
          {
            id: `${DEFAULT_EVENT_ID}_projeto02`,
            eventId: DEFAULT_EVENT_ID,
            projectId: 'projeto02',
            totalVotes: 128,
            sumInnovation: 486.4,
            sumImpact: 512.0,
            sumDevelopment: 460.8,
            averageInnovation: 3.8,
            averageImpact: 4.0,
            averageDevelopment: 3.6,
            averageGeneral: 3.8,
            percentage: 76.0,
            popularPoints: 15.2,
            updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
          },
          {
            id: `${DEFAULT_EVENT_ID}_projeto03`,
            eventId: DEFAULT_EVENT_ID,
            projectId: 'projeto03',
            totalVotes: 156,
            sumInnovation: 717.6,
            sumImpact: 655.2,
            sumDevelopment: 733.2,
            averageInnovation: 4.6,
            averageImpact: 4.2,
            averageDevelopment: 4.7,
            averageGeneral: 4.5,
            percentage: 90.0,
            popularPoints: 18.0,
            updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
          },
          {
            id: `${DEFAULT_EVENT_ID}_projeto04`,
            eventId: DEFAULT_EVENT_ID,
            projectId: 'projeto04',
            totalVotes: 110,
            sumInnovation: 506.0,
            sumImpact: 473.0,
            sumDevelopment: 473.0,
            averageInnovation: 4.6,
            averageImpact: 4.3,
            averageDevelopment: 4.3,
            averageGeneral: 3.8,
            percentage: 76.0,
            popularPoints: 15.2,
            updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
          },
        ];
        setResultsList(mockResults);
      }
    });
    return () => unsub();
  }, []);

  // 4. Constrói o ranking matemático oficial respeitando todas as regras da Etapa 6
  const rankedResults: ProjectScoringResult[] = useMemo(() => {
    const resultsMap = new Map<string, ResultDocument>();
    resultsList.forEach((r) => {
      resultsMap.set(r.projectId, r);
    });
    return buildRankedResults(projects, resultsMap);
  }, [projects, resultsList]);

  // Estatísticas Rápidas
  const totalVotesCount = useMemo(() => {
    return rankedResults.reduce((acc, p) => acc + (p.totalVotes || 0), 0);
  }, [rankedResults]);

  const topProject = rankedResults.find((p) => p.rank === 1);

  // Manipulador de Publicação no Telão
  const handleTogglePublish = async (newStatus: boolean) => {
    setIsUpdatingPublish(true);
    try {
      await EventService.toggleResultsPublished(DEFAULT_EVENT_ID, newStatus);
      setActiveEvent((prev) => (prev ? { ...prev, resultsPublished: newStatus } : null));
    } catch (err) {
      console.warn('Erro ao atualizar status de divulgação no Firestore:', err);
      // Fallback local se Firestore emulador offline
      setActiveEvent((prev) =>
        prev
          ? { ...prev, resultsPublished: newStatus }
          : ({ id: DEFAULT_EVENT_ID, resultsPublished: newStatus } as any)
      );
    } finally {
      setIsUpdatingPublish(false);
    }
  };

  const isPublished = activeEvent?.resultsPublished ?? false;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <ArenaLogo variant="textWithSlogan" width={240} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
            Dashboard Geral de Resultados — Voto Popular (20%)
          </h2>
          <p className="text-xs text-gray-400">
            Apuração em tempo real com dados agregados do servidor • Máximo de 20 pontos por projeto
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Exibição do Telão */}
          <a
            href="/resultados/telao"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-arena-gold/20 to-amber-600/20 hover:from-arena-gold/30 hover:to-amber-600/30 text-arena-gold border border-arena-gold/40 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-yellow-glow"
          >
            <Trophy className="w-4 h-4 text-arena-gold" />
            <span>Abrir Telão</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>

          {/* Botão de Exportação */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="bg-arena-card hover:bg-white/10 text-gray-200 border border-arena-border text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 text-arena-blueLight" />
            <span>Exportar Relatórios</span>
          </button>
        </div>
      </div>

      {/* Banner de Controle de Divulgação */}
      <PublishResultsBanner
        isPublished={isPublished}
        onTogglePublish={handleTogglePublish}
        isUpdating={isUpdatingPublish}
      />

      {/* 4 Cards de Estatísticas Rápidas do Evento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-arena-card border border-arena-border">
          <span className="text-[11px] font-semibold uppercase text-gray-400">Total de Projetos</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-white">{projects.length}</span>
            <span className="text-xs text-arena-blue font-bold">Na competição</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-arena-card border border-arena-border">
          <span className="text-[11px] font-semibold uppercase text-gray-400">Votos Computados</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-arena-blueLight font-mono">{totalVotesCount}</span>
            <span className="text-xs text-gray-400 font-semibold">100% únicos</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-arena-card border border-arena-gold/30 bg-gradient-to-br from-arena-gold/10 to-transparent">
          <span className="text-[11px] font-bold uppercase text-arena-gold">Líder Atual</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm sm:text-base font-black text-white line-clamp-1">
              {topProject ? topProject.name : 'Aguardando'}
            </span>
            <span className="text-xs font-black text-arena-gold font-mono shrink-0 ml-1">
              {topProject?.hasEvaluations ? `${topProject.formattedPoints} pts` : '-'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-arena-card border border-arena-border">
          <span className="text-[11px] font-semibold uppercase text-gray-400">Peso no Evento</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-400 font-mono">20%</span>
            <span className="text-xs text-gray-400 font-semibold">Voto Popular</span>
          </div>
        </div>
      </div>

      {/* Abas de Visualização do Dashboard */}
      <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-arena-border w-fit">
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'cards'
              ? 'bg-arena-red text-white shadow-neon-glow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Resumo dos Projetos</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'charts'
              ? 'bg-arena-red text-white shadow-neon-glow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Gráficos Comparativos</span>
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'table'
              ? 'bg-arena-red text-white shadow-neon-glow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Tabela Detalhada</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 gap-2 text-arena-blue text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando dados agregados do servidor...</span>
        </div>
      ) : (
        <>
          {/* Conteúdo da Aba: Cards de Projetos */}
          {activeTab === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
              {rankedResults.map((project) => (
                <ProjectResultCard key={project.projectId} project={project} />
              ))}
            </div>
          )}

          {/* Conteúdo da Aba: Gráficos Comparativos */}
          {activeTab === 'charts' && (
            <div className="space-y-6 animate-fade-in">
              <CriteriaComparisonChart projects={rankedResults} />
              <ParticipationChart projects={rankedResults} />
            </div>
          )}

          {/* Conteúdo da Aba: Tabela Detalhada */}
          {activeTab === 'table' && (
            <div className="animate-fade-in">
              <ResultsTable results={rankedResults} />
            </div>
          )}
        </>
      )}

      {/* Modal de Exportação */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        results={rankedResults}
        eventName={activeEvent?.name || 'Arena Voice 2026'}
      />
    </div>
  );
};

export default AdminResultsPage;
