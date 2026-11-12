import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { useAdminEvent } from '@/contexts/AdminEventContext';
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
  const navigate = useNavigate();
  const { currentEventId } = useAdminEvent();
  const activeEventId = currentEventId || DEFAULT_EVENT_ID;

  // Redireciona para Meus Eventos se nenhum evento foi selecionado
  useEffect(() => {
    if (!currentEventId) {
      navigate('/admin/eventos', { replace: true });
    }
  }, [currentEventId, navigate]);

  const [activeEvent, setActiveEvent] = useState<EventDocument | null>(null);
  const [projects, setProjects] = useState<ProjectDocument[]>([]);
  const [resultsList, setResultsList] = useState<ResultDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPublish, setIsUpdatingPublish] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'charts' | 'table'>('cards');

  // 1. Escuta o evento em tempo real (para status de publicação resultsPublished)
  useEffect(() => {
    if (!activeEventId) return;

    const unsub = EventService.subscribeToCurrentEvent(activeEventId, (ev) => {
      if (ev) {
        setActiveEvent(ev);
      }
    });
    return () => unsub();
  }, [activeEventId]);

  // 2. Escuta os projetos em tempo real exclusivamente do Supabase
  useEffect(() => {
    if (!activeEventId) return;

    const unsub = EventService.subscribeToProjectsList(activeEventId, (projs) => {
      setProjects(projs || []);
      setIsLoading(false);
    });
    return () => unsub();
  }, [activeEventId]);

  // 3. Escuta todos os resultados consolidados do evento em tempo real
  useEffect(() => {
    if (!activeEventId) return;

    const unsub = EventService.subscribeToAllEventResults(activeEventId, (resList) => {
      setResultsList(resList || []);
    });
    return () => unsub();
  }, [activeEventId]);

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
      await EventService.toggleResultsPublished(activeEventId, newStatus);
      setActiveEvent((prev) => (prev ? { ...prev, resultsPublished: newStatus } : null));
    } catch (err) {
      console.warn('Erro ao atualizar status de divulgação no Supabase:', err);
      // Fallback local se erro
      setActiveEvent((prev) =>
        prev
          ? { ...prev, resultsPublished: newStatus }
          : ({ id: activeEventId, resultsPublished: newStatus } as any)
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
