import { supabase, isSupabaseConfigured } from '@/supabase/client';
import {
  EventDocument,
  ProjectDocument,
  RoundDocument,
  ResultDocument,
  generateDeterministicVoteId,
} from '@/types';
import { AdminMockService } from './adminMockService';

export const DEFAULT_EVENT_ID = 'arena-voice-2026';

export interface SubmitVotePayload {
  eventId: string;
  roundId: string;
  projectId: string;
  innovation: number;
  impact: number;
  development: number;
}

export type Unsubscribe = () => void;

// Utilitários de mapeamento entre colunas do PostgreSQL (snake_case) e Interfaces TypeScript (camelCase)
function mapEventRow(row: any): EventDocument {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    currentRoundId: row.current_round_id || null,
    currentProjectId: row.current_project_id || null,
    resultsPublished: row.results_published ?? false,
    createdAt: { seconds: Math.floor(new Date(row.created_at || Date.now()).getTime() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(new Date(row.updated_at || Date.now()).getTime() / 1000), nanoseconds: 0 } as any,
  };
}

function mapProjectRow(row: any): ProjectDocument {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    description: row.description || '',
    bannerUrl: row.banner_url || row.image_url || '',
    order: row.order ?? 1,
    active: row.active ?? true,
    createdAt: { seconds: Math.floor(new Date(row.created_at || Date.now()).getTime() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(new Date(row.updated_at || Date.now()).getTime() / 1000), nanoseconds: 0 } as any,
  };
}

function mapRoundRow(row: any): RoundDocument {
  return {
    id: row.id,
    eventId: row.event_id,
    projectId: row.project_id,
    status: row.status,
    startedAt: row.started_at ? ({ seconds: Math.floor(new Date(row.started_at).getTime() / 1000), nanoseconds: 0 } as any) : null,
    endedAt: row.ended_at ? ({ seconds: Math.floor(new Date(row.ended_at).getTime() / 1000), nanoseconds: 0 } as any) : null,
    createdAt: { seconds: Math.floor(new Date(row.created_at || Date.now()).getTime() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(new Date(row.updated_at || Date.now()).getTime() / 1000), nanoseconds: 0 } as any,
  };
}

function mapResultRow(row: any): ResultDocument {
  return {
    id: row.id,
    eventId: row.event_id,
    projectId: row.project_id,
    totalVotes: Number(row.total_votes || 0),
    sumInnovation: Number(row.sum_innovation || 0),
    sumImpact: Number(row.sum_impact || 0),
    sumDevelopment: Number(row.sum_development || 0),
    averageInnovation: row.average_innovation !== null ? Number(row.average_innovation) : null,
    averageImpact: row.average_impact !== null ? Number(row.average_impact) : null,
    averageDevelopment: row.average_development !== null ? Number(row.average_development) : null,
    averageGeneral: row.average_general !== null ? Number(row.average_general) : null,
    percentage: row.percentage !== null ? Number(row.percentage) : null,
    popularPoints: row.popular_points !== null ? Number(row.popular_points) : null,
    updatedAt: { seconds: Math.floor(new Date(row.updated_at || Date.now()).getTime() / 1000), nanoseconds: 0 } as any,
  };
}

export const EventService = {
  /**
   * Monitora o evento principal em tempo real via Supabase Realtime
   */
  subscribeToCurrentEvent(
    eventId: string,
    onUpdate: (event: EventDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!isSupabaseConfigured) {
      const mockEvent = AdminMockService.getEventConfig();
      const mockRound = AdminMockService.getRound();
      onUpdate({
        id: eventId,
        name: mockEvent.nomeEvento,
        status: 'active',
        currentRoundId: null,
        currentProjectId: mockRound.projetoAtualId,
        resultsPublished: false,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      });
      return () => {};
    }

    let isSubscribed = true;

    // 1. Consulta inicial via SELECT
    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();

        if (!isSubscribed) return;
        if (error) {
          console.warn('Erro ao consultar evento no Supabase:', error.message);
          if (onError) onError(new Error(error.message));
          return;
        }

        if (data) {
          onUpdate(mapEventRow(data));
        } else {
          // Cria evento padrão se não existir
          const { data: created } = await supabase
            .from('events')
            .insert({ id: eventId, name: 'Arena Voice 2026', status: 'active', results_published: false })
            .select('*')
            .single();

          if (created && isSubscribed) onUpdate(mapEventRow(created));
        }
      } catch (err: any) {
        if (isSubscribed && onError) onError(err);
      }
    };

    fetchEvent();

    // 2. Canal Realtime no PostgreSQL
    const channelId = `event_sub_${eventId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          if (!isSubscribed) return;
          if (payload.new && (payload.new as any).id) {
            onUpdate(mapEventRow(payload.new));
          } else {
            fetchEvent();
          }
        }
      )
      .subscribe();

    // 3. Listener de reconexão de rede
    const handleOnline = () => {
      fetchEvent();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  },

  /**
   * Monitora a rodada ativa do evento diretamente na tabela rounds
   * Sincronização direta e instantânea com garantia de estado
   */
  subscribeToActiveRound(
    roundId: string | null | undefined,
    onUpdate: (round: RoundDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!isSupabaseConfigured) {
      const mockRound = AdminMockService.getRound();
      onUpdate({
        id: roundId || 'round_mock_projeto01',
        eventId: DEFAULT_EVENT_ID,
        projectId: mockRound.projetoAtualId,
        status: mockRound.status === 'aberta' ? 'open' : mockRound.status === 'encerrada' ? 'closed' : 'waiting',
        startedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        endedAt: null,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      });
      return () => {};
    }

    let isSubscribed = true;

    // 1. Consulta inicial
    const fetchRound = async () => {
      try {
        let query = supabase.from('rounds').select('*');

        if (roundId) {
          query = query.eq('id', roundId);
        } else {
          // Se roundId não for passado, busca a rodada 'open' mais recente do evento
          query = query
            .eq('event_id', DEFAULT_EVENT_ID)
            .eq('status', 'open')
            .order('started_at', { ascending: false })
            .limit(1);
        }

        const { data, error } = await query.maybeSingle();

        if (!isSubscribed) return;
        if (error) {
          console.warn('Erro ao consultar rodada no Supabase:', error.message);
          if (onError) onError(new Error(error.message));
          return;
        }

        if (data) {
          onUpdate(mapRoundRow(data));
        } else {
          onUpdate(null);
        }
      } catch (err: any) {
        if (isSubscribed && onError) onError(err);
      }
    };

    fetchRound();

    // 2. Canal Realtime ouvindo a tabela rounds para o evento
    const channelId = `round_sub_${roundId || 'any'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds', filter: `event_id=eq.${DEFAULT_EVENT_ID}` },
        (payload) => {
          if (!isSubscribed) return;
          if (payload.new && (payload.new as any).id) {
            // Se roundId foi especificado, só atualiza se for ela; caso contrário, atualiza qualquer rodada ativa
            if (!roundId || (payload.new as any).id === roundId) {
              onUpdate(mapRoundRow(payload.new));
            } else if ((payload.new as any).status === 'open') {
              onUpdate(mapRoundRow(payload.new));
            }
          } else {
            fetchRound();
          }
        }
      )
      .subscribe();

    const handleOnline = () => {
      fetchRound();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  },

  /**
   * Monitora um projeto específico em tempo real
   */
  subscribeToProject(
    projectId: string,
    onUpdate: (project: ProjectDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!projectId) {
      onUpdate(null);
      return () => {};
    }

    if (!isSupabaseConfigured) {
      const p = AdminMockService.getProjects().find((proj) => proj.id === projectId);
      if (p) {
        onUpdate({
          id: p.id,
          eventId: DEFAULT_EVENT_ID,
          name: p.nome,
          description: p.descricao || '',
          bannerUrl: p.bannerUrl || '',
          order: p.ordem,
          active: p.ativo,
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
          updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        });
      }
      return () => {};
    }

    let isSubscribed = true;

    const fetchProject = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .maybeSingle();

        if (!isSubscribed) return;
        if (error && onError) onError(new Error(error.message));
        if (data) onUpdate(mapProjectRow(data));
        else onUpdate(null);
      } catch (err: any) {
        if (isSubscribed && onError) onError(err);
      }
    };

    fetchProject();

    const channelId = `project_sub_${projectId}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        (payload) => {
          if (!isSubscribed) return;
          if (payload.new) onUpdate(mapProjectRow(payload.new));
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  },

  /**
   * Monitora a lista completa de projetos do evento em tempo real
   */
  subscribeToProjectsList(
    eventId: string,
    onUpdate: (projects: ProjectDocument[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!isSupabaseConfigured) {
      const mockList = AdminMockService.getProjects().map((p) => ({
        id: p.id,
        eventId,
        name: p.nome,
        description: p.descricao || '',
        bannerUrl: p.bannerUrl || '',
        order: p.ordem,
        active: p.ativo,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      }));
      onUpdate(mockList);
      return () => {};
    }

    let isSubscribed = true;

    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('event_id', eventId)
          .order('order', { ascending: true });

        if (!isSubscribed) return;
        if (error) {
          if (onError) onError(new Error(error.message));
          return;
        }

        if (data && data.length > 0) {
          onUpdate(data.map(mapProjectRow));
        } else {
          onUpdate([]);
        }
      } catch (err: any) {
        if (isSubscribed && onError) onError(err);
      }
    };

    fetchProjects();

    const channelId = `projects_list_sub_${eventId}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `event_id=eq.${eventId}` },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  },

  /**
   * Monitora os resultados consolidados de um projeto em tempo real
   */
  subscribeToProjectResult(
    eventId: string,
    projectId: string,
    onUpdate: (result: ResultDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const resultDocId = `${eventId}_${projectId}`;

    if (!isSupabaseConfigured) {
      onUpdate(null);
      return () => {};
    }

    let isSubscribed = true;

    const fetchResult = async () => {
      try {
        const { data, error } = await supabase
          .from('results')
          .select('*')
          .eq('id', resultDocId)
          .maybeSingle();

        if (!isSubscribed) return;
        if (error && onError) {
          onError(new Error(error.message));
          return;
        }

        if (data) {
          onUpdate(mapResultRow(data));
        } else {
          onUpdate(null);
        }
      } catch (err: any) {
        if (isSubscribed && onError) onError(err);
      }
    };

    fetchResult();

    const channelId = `result_sub_${resultDocId}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results', filter: `id=eq.${resultDocId}` },
        (payload) => {
          if (!isSubscribed) return;
          if (payload.new) {
            onUpdate(mapResultRow(payload.new));
          } else {
            fetchResult();
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  },

  /**
   * Monitora em tempo real TODOS os resultados consolidados do evento
   * Fonte oficial e verdadeira de dados (sem inserção de dados fictícios)
   */
  subscribeToAllEventResults(
    eventId: string,
    onUpdate: (results: ResultDocument[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!isSupabaseConfigured) {
      onUpdate([]);
      return () => {};
    }

    let isSubscribed = true;

    const fetchAllResults = async () => {
      try {
        const { data, error } = await supabase
          .from('results')
          .select('*')
          .eq('event_id', eventId);

        if (!isSubscribed) return;
        if (error) {
          if (onError) onError(new Error(error.message));
          return;
        }
        onUpdate((data || []).map(mapResultRow));
      } catch (err: any) {
        if (isSubscribed && onError) onError(err);
      }
    };

    fetchAllResults();

    const channelId = `all_results_sub_${eventId}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results', filter: `event_id=eq.${eventId}` },
        () => {
          fetchAllResults();
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  },

  /**
   * Alterna a autorização de divulgação pública dos resultados no telão
   */
  async toggleResultsPublished(eventId: string, published: boolean): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('events')
        .update({ results_published: published, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw new Error(error.message);
      return;
    }

    const currentConfig = AdminMockService.getEventConfig();
    AdminMockService.saveEventConfig({ ...currentConfig, exibirTelaoTempoReal: published });
  },

  /**
   * Verifica se o participante já registrou voto no projeto especificado
   */
  async checkUserVote(
    eventId: string,
    projectId: string,
    voterUid: string
  ): Promise<boolean> {
    if (!voterUid) return false;

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('votes')
          .select('id')
          .eq('event_id', eventId)
          .eq('project_id', projectId)
          .eq('voter_id', voterUid)
          .maybeSingle();

        return Boolean(data?.id);
      } catch (err) {
        console.warn('Falha na consulta direta de voto no Supabase:', err);
      }
    }

    const localKey = `voted_${eventId}_${projectId}_${voterUid}`;
    return localStorage.getItem(localKey) === 'true';
  },

  // ==========================================
  // FUNÇÕES RPC ATÔMICAS DO SUPABASE (PL/pgSQL)
  // ==========================================

  /**
   * Abre uma rodada no servidor de forma atômica
   */
  async openRound(eventId: string, projectId: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('open_round', {
        p_event_id: eventId,
        p_project_id: projectId,
      });

      if (error) throw new Error(error.message);
      return data as { success: boolean; round_id: string; project_id: string };
    }

    // Fallback local caso Supabase não esteja configurado
    AdminMockService.saveRound({
      projetoAtualId: projectId,
      status: 'aberta',
      inicio: new Date().toISOString(),
      totalVotos: 0,
    });
    return { success: true, round_id: `round_mock_${projectId}`, project_id: projectId };
  },

  /**
   * Encerra a rodada ativa no servidor
   */
  async closeRound(eventId: string, roundId?: string | null) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('close_round', {
        p_event_id: eventId,
        p_round_id: roundId || null,
      });

      if (error) throw new Error(error.message);
      return data as { success: boolean; round_id: string };
    }

    // Fallback local
    const current = AdminMockService.getRound();
    AdminMockService.saveRound({
      ...current,
      status: 'encerrada',
      fim: new Date().toISOString(),
    });
    return { success: true, round_id: roundId || 'mock_round' };
  },

  /**
   * Prepara o próximo projeto em estado de espera ('waiting')
   * Se nextProjectId for omitido, a procedure avança automaticamente para o próximo por ordem
   */
  async prepareNextRound(eventId: string, nextProjectId?: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('prepare_next_round', {
        p_event_id: eventId,
        p_next_project_id: nextProjectId || null,
      });

      if (error) throw new Error(error.message);
      return data as { success: boolean; project_id: string };
    }

    // Fallback local
    const projects = AdminMockService.getProjects();
    const currentRound = AdminMockService.getRound();
    const currentIndex = projects.findIndex((p) => p.id === currentRound.projetoAtualId);
    const nextIndex = (currentIndex + 1) % projects.length;
    const nextProj = projects[nextIndex];

    AdminMockService.saveRound({
      projetoAtualId: nextProj.id,
      status: 'aguardando',
      inicio: undefined,
      fim: undefined,
      totalVotos: 0,
    });

    return { success: true, project_id: nextProj.id, status: 'waiting' };
  },

  /**
   * Envia o voto oficial do público para a transação atômica do Supabase
   * O voter_id é extraído exclusivamente pelo auth.uid() no servidor PostgreSQL!
   */
  async submitVote(payload: SubmitVotePayload) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('submit_vote', {
        p_event_id: payload.eventId,
        p_round_id: payload.roundId,
        p_project_id: payload.projectId,
        p_innovation: payload.innovation,
        p_impact: payload.impact,
        p_development: payload.development,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as { success: boolean; vote_id: string };
    }

    // Fallback local de demonstração
    const voteDocId = generateDeterministicVoteId(payload.eventId, payload.projectId, 'local_voter');
    return {
      success: true,
      vote_id: voteDocId,
      message: 'Voto registrado com sucesso (modo local).',
    };
  },

  /**
   * Consulta os resultados de auditoria para o painel de controle
   */
  async getAdminResults(eventId: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('get_admin_results', {
        p_event_id: eventId,
      });

      if (error) throw new Error(error.message);
      return data as { success: boolean; results: Array<Record<string, unknown>> };
    }

    return {
      success: true,
      results: [],
    };
  },

  /**
   * Reconcilia os resultados do evento no servidor
   */
  async reconcileResults(eventId: string, projectId?: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('reconcile_results', {
        p_event_id: eventId,
        p_project_id: projectId || null,
      });

      if (error) throw new Error(error.message);
      return data as { success: boolean; reconciled_projects: number };
    }

    return { success: true, reconciled_projects: 0 };
  },
};

export default EventService;
