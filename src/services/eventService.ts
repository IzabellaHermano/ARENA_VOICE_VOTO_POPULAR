import { supabase, isSupabaseConfigured } from '@/supabase/client';
import {
  EventDocument,
  ProjectDocument,
  RoundDocument,
  ResultDocument,
  generateDeterministicVoteId,
} from '@/types';
import { calculateApprovalStats, ApprovalStats } from '@/utils/approvalCalculator';
import { AdminMockService } from './adminMockService';

export type { ApprovalStats };

export const DEFAULT_EVENT_ID = 'arena-voice-2026';

export interface SubmitVotePayload {
  eventId: string;
  roundId: string;
  projectId: string;
  innovation: number;
  impact: number;
  development: number;
}

export interface CreateEventPayload {
  id?: string;
  name: string;
  subtitle?: string;
  description?: string;
  eventDate?: string;
  bannerUrl?: string;
  status?: 'draft' | 'active' | 'finished' | 'archived';
}

export interface UpdateEventPayload {
  name?: string;
  subtitle?: string;
  description?: string;
  eventDate?: string;
  bannerUrl?: string;
  status?: 'draft' | 'active' | 'finished' | 'archived';
  resultsPublished?: boolean;
}

export interface EventSummary extends EventDocument {
  projectsCount: number;
}

export interface CreateProjectPayload {
  id?: string;
  eventId?: string;
  name: string;
  category?: string;
  description?: string;
  bannerUrl?: string;
  order?: number;
  active?: boolean;
  status?: 'active' | 'inactive' | 'draft';
}

export interface UpdateProjectPayload {
  name?: string;
  category?: string;
  description?: string;
  bannerUrl?: string;
  order?: number;
  active?: boolean;
  status?: 'active' | 'inactive' | 'draft';
}

export interface ProjectHistoryCheck {
  hasHistory: boolean;
  canDelete: boolean;
  roundsCount: number;
  votesCount: number;
  resultsCount: number;
  summary: string;
}

export type Unsubscribe = () => void;

// Utilitários de mapeamento entre colunas do PostgreSQL (snake_case) e Interfaces TypeScript (camelCase)
function mapEventRow(row: any): EventDocument {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    subtitle: row.subtitle || '',
    eventDate: row.event_date || null,
    bannerUrl: row.banner_url || '',
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
    category: row.category || '',
    description: row.description || '',
    bannerUrl: row.banner_url || row.image_url || '',
    order: row.order ?? 1,
    active: row.active ?? true,
    status: row.status || (row.active ? 'active' : 'inactive'),
    createdAt: { seconds: Math.floor(new Date(row.created_at || Date.now()).getTime() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(new Date(row.updated_at || Date.now()).getTime() / 1000), nanoseconds: 0 } as any,
  };
}

function createTimestamp(dateVal: any) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  const millis = isNaN(d.getTime()) ? Date.now() : d.getTime();
  const seconds = Math.floor(millis / 1000);
  return {
    seconds,
    nanoseconds: 0,
    toMillis: () => millis,
    toDate: () => new Date(millis),
  } as any;
}

function mapRoundRow(row: any): RoundDocument {
  return {
    id: row.id,
    eventId: row.event_id,
    projectId: row.project_id,
    status: row.status,
    startedAt: createTimestamp(row.started_at),
    endedAt: createTimestamp(row.ended_at),
    createdAt: createTimestamp(row.created_at || Date.now()),
    updatedAt: createTimestamp(row.updated_at || Date.now()),
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
   * Consulta a lista de todos os eventos com contagem de projetos
   */
  async listEvents(): Promise<EventSummary[]> {
    if (!isSupabaseConfigured) {
      return [{
        id: DEFAULT_EVENT_ID,
        name: 'Arena Voice 2026',
        description: 'Competição oficial de inovação com voto popular em tempo real.',
        status: 'active',
        currentRoundId: null,
        currentProjectId: null,
        resultsPublished: false,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        projectsCount: 1,
      }];
    }

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Falha ao listar eventos no Supabase: ${error.message}`);
    }

    // Consulta contagem de projetos agrupada por evento
    const { data: projects } = await supabase
      .from('projects')
      .select('event_id');

    const countMap: Record<string, number> = {};
    (projects || []).forEach((p: any) => {
      if (p.event_id) {
        countMap[p.event_id] = (countMap[p.event_id] || 0) + 1;
      }
    });

    return (events || []).map((ev: any) => ({
      ...mapEventRow(ev),
      projectsCount: countMap[ev.id] || 0,
    }));
  },

  /**
   * Monitora em tempo real a lista de eventos com contagem de projetos
   */
  subscribeToEventsList(
    onUpdate: (events: EventSummary[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!isSupabaseConfigured) {
      onUpdate([{
        id: DEFAULT_EVENT_ID,
        name: 'Arena Voice 2026',
        description: 'Competição oficial de inovação com voto popular em tempo real.',
        status: 'active',
        currentRoundId: null,
        currentProjectId: null,
        resultsPublished: false,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        projectsCount: 1,
      }]);
      return () => {};
    }

    let isSubscribed = true;

    const fetchAll = async () => {
      try {
        const events = await this.listEvents();
        if (isSubscribed) {
          onUpdate(events);
        }
      } catch (err: any) {
        if (isSubscribed && onError) onError(err);
      }
    };

    fetchAll();

    const channelId = `events_list_sub_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        if (isSubscribed) fetchAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        if (isSubscribed) fetchAll();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchAll();
        }
      });

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  },

  /**
   * Cria um novo evento oficial no Supabase (public.events)
   */
  async createEvent(payload: CreateEventPayload): Promise<EventDocument> {
    if (!payload.name || !payload.name.trim()) {
      throw new Error('O nome do evento é obrigatório.');
    }

    const trimmedName = payload.name.trim();

    // Gera um ID/slug único e limpo
    let id = payload.id?.trim();
    if (!id) {
      const slug = trimmedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      id = slug ? `${slug}-${Date.now().toString(36)}` : `evento-${Date.now().toString(36)}`;
    }

    const status = payload.status || 'draft';

    const insertPayload: Record<string, any> = {
      id,
      name: trimmedName,
      description: payload.description?.trim() || '',
      status: status === 'archived' ? 'draft' : status,
      results_published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (payload.subtitle) insertPayload.subtitle = payload.subtitle.trim();
    if (payload.eventDate) insertPayload.event_date = payload.eventDate;
    if (payload.bannerUrl) insertPayload.banner_url = payload.bannerUrl.trim();

    const { data, error } = await supabase
      .from('events')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      // Se deu erro por coluna opcional não existente (ex.: subtitle, event_date), tenta fallback apenas com colunas padrão
      if (error.message.includes('column') || error.code === '42703') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('events')
          .insert({
            id,
            name: trimmedName,
            description: payload.description?.trim() || (payload.subtitle ? `${payload.subtitle} - ${payload.description || ''}` : ''),
            status: status === 'archived' ? 'draft' : status,
            results_published: false,
          })
          .select('*')
          .single();

        if (fallbackError) {
          throw new Error(`Falha ao criar evento no Supabase: ${fallbackError.message}`);
        }
        return mapEventRow(fallbackData);
      }

      throw new Error(`Falha ao cadastrar evento: ${error.message}`);
    }

    return mapEventRow(data);
  },

  /**
   * Atualiza dados de um evento existente no Supabase
   */
  async updateEvent(eventId: string, payload: UpdateEventPayload): Promise<EventDocument> {
    if (!eventId) throw new Error('ID do evento é obrigatório.');

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updatePayload.name = payload.name.trim();
    if (payload.description !== undefined) updatePayload.description = payload.description.trim();
    if (payload.status !== undefined) {
      updatePayload.status = payload.status === 'archived' ? 'draft' : payload.status;
    }
    if (payload.resultsPublished !== undefined) updatePayload.results_published = payload.resultsPublished;
    if (payload.subtitle !== undefined) updatePayload.subtitle = payload.subtitle.trim();
    if (payload.eventDate !== undefined) updatePayload.event_date = payload.eventDate;
    if (payload.bannerUrl !== undefined) updatePayload.banner_url = payload.bannerUrl.trim();

    const { data, error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId)
      .select('*')
      .single();

    if (error) {
      // Fallback caso alguma coluna opcional ainda não exista no schema
      if (error.message.includes('column') || error.code === '42703') {
        const minimalPayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (payload.name !== undefined) minimalPayload.name = payload.name.trim();
        if (payload.description !== undefined) minimalPayload.description = payload.description.trim();
        if (payload.status !== undefined) minimalPayload.status = payload.status === 'archived' ? 'draft' : payload.status;
        if (payload.resultsPublished !== undefined) minimalPayload.results_published = payload.resultsPublished;

        const { data: retryData, error: retryError } = await supabase
          .from('events')
          .update(minimalPayload)
          .eq('id', eventId)
          .select('*')
          .single();

        if (retryError) throw new Error(`Falha ao atualizar evento: ${retryError.message}`);
        return mapEventRow(retryData);
      }

      throw new Error(`Falha ao atualizar evento: ${error.message}`);
    }

    return mapEventRow(data);
  },

  /**
   * Obtém detalhes de um evento específico pelo ID
   */
  async getEventById(eventId: string): Promise<EventDocument | null> {
    if (!eventId) return null;
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (error) {
      console.warn(`Erro ao buscar evento ${eventId}:`, error.message);
      return null;
    }

    return data ? mapEventRow(data) : null;
  },

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

    // 2. Canal Realtime no PostgreSQL com tratamento de ciclo de vida
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
      .subscribe((status, err) => {
        if (!isSubscribed) return;
        if (status === 'SUBSCRIBED') {
          fetchEvent();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime events] status: ${status}`, err?.message);
          // Tenta re-sincronizar via REST em caso de instabilidade do WebSocket
          fetchEvent();
        }
      });

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

    // 2. Canal Realtime ouvindo a tabela rounds para o evento com tratamento de ciclo de vida
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
      .subscribe((status, err) => {
        if (!isSubscribed) return;
        if (status === 'SUBSCRIBED') {
          fetchRound();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime rounds] status: ${status}`, err?.message);
          fetchRound();
        }
      });

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
   * Monitora a rodada mais recente da competição (seja aberta ou recém-encerrada)
   * Essencial para o ciclo de vida completo do Telão (Estados 1, 2, 3 e 4)
   */
  subscribeToLatestRound(
    eventId: string,
    onUpdate: (round: RoundDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!isSupabaseConfigured) {
      onUpdate(null);
      return () => {};
    }

    let isSubscribed = true;

    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase
          .from('rounds')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isSubscribed) return;
        if (error) {
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

    fetchLatest();

    const channelId = `latest_round_sub_${eventId}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds', filter: `event_id=eq.${eventId}` },
        () => {
          fetchLatest();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchLatest();
        }
      });

    const handleOnline = () => {
      fetchLatest();
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
      .subscribe((status, err) => {
        if (!isSubscribed) return;
        if (status === 'SUBSCRIBED') {
          fetchProject();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime project] status: ${status}`, err?.message);
          fetchProject();
        }
      });

    const handleOnline = () => {
      fetchProject();
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
      .subscribe((status, err) => {
        if (!isSubscribed) return;
        if (status === 'SUBSCRIBED') {
          fetchProjects();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime projects list] status: ${status}`, err?.message);
          fetchProjects();
        }
      });

    const handleOnline = () => {
      fetchProjects();
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
      .subscribe((status, err) => {
        if (!isSubscribed) return;
        if (status === 'SUBSCRIBED') {
          fetchResult();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime result] status: ${status}`, err?.message);
          fetchResult();
        }
      });

    const handleOnline = () => {
      fetchResult();
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
      .subscribe((status, err) => {
        if (!isSubscribed) return;
        if (status === 'SUBSCRIBED') {
          fetchAllResults();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime all results] status: ${status}`, err?.message);
          fetchAllResults();
        }
      });

    const handleOnline = () => {
      fetchAllResults();
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

  /**
   * Cadastra um novo projeto oficial no Supabase (public.projects)
   */
  async createProject(projectData: CreateProjectPayload): Promise<ProjectDocument> {
    if (!projectData.name || !projectData.name.trim()) {
      throw new Error('O nome do projeto é obrigatório.');
    }

    const trimmedName = projectData.name.trim();
    const eventId = projectData.eventId || DEFAULT_EVENT_ID;

    let id = projectData.id?.trim();
    if (!id) {
      const slug = trimmedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      id = slug ? `proj_${slug}_${Date.now().toString(36)}` : `proj_${Date.now()}`;
    }

    let order = projectData.order;
    if (order === undefined || order === null || order < 1) {
      if (isSupabaseConfigured) {
        const { count } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId);
        order = (count || 0) + 1;
      } else {
        order = 1;
      }
    }

    const active = projectData.active ?? true;
    const status = projectData.status || (active ? 'active' : 'inactive');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          id,
          event_id: eventId,
          name: trimmedName,
          category: projectData.category?.trim() || '',
          description: projectData.description?.trim() || '',
          banner_url: projectData.bannerUrl?.trim() || '',
          image_url: projectData.bannerUrl?.trim() || '',
          order,
          active,
          status,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao inserir projeto no Supabase:', error);
        throw new Error(`Falha ao cadastrar projeto no banco: ${error.message}`);
      }

      return mapProjectRow(data);
    }

    throw new Error('Supabase não está configurado para operações no banco de dados.');
  },

  /**
   * Atualiza os dados de um projeto existente diretamente no Supabase
   * Preserva a chave primária (id) e a integridade de rodadas e votos
   */
  async updateProject(projectId: string, projectData: UpdateProjectPayload): Promise<ProjectDocument> {
    if (!projectId) {
      throw new Error('Identificador do projeto é obrigatório para atualização.');
    }

    if (projectData.name !== undefined && !projectData.name.trim()) {
      throw new Error('O nome do projeto não pode ser vazio.');
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (projectData.name !== undefined) updatePayload.name = projectData.name.trim();
    if (projectData.category !== undefined) updatePayload.category = projectData.category.trim();
    if (projectData.description !== undefined) updatePayload.description = projectData.description.trim();
    if (projectData.bannerUrl !== undefined) {
      updatePayload.banner_url = projectData.bannerUrl.trim();
      updatePayload.image_url = projectData.bannerUrl.trim();
    }
    if (projectData.order !== undefined) updatePayload.order = Number(projectData.order);
    if (projectData.active !== undefined) {
      updatePayload.active = Boolean(projectData.active);
      if (!projectData.status) {
        updatePayload.status = projectData.active ? 'active' : 'inactive';
      }
    }
    if (projectData.status !== undefined) updatePayload.status = projectData.status;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', projectId)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar projeto no Supabase:', error);
        throw new Error(`Falha ao atualizar projeto no banco: ${error.message}`);
      }

      return mapProjectRow(data);
    }

    throw new Error('Supabase não está configurado para operações no banco de dados.');
  },

  /**
   * Verifica a integridade histórica de um projeto (rodadas, votos e resultados)
   * Garante que nenhum projeto com votos computados seja excluído acidentalmente
   */
  async checkProjectHistory(projectId: string): Promise<ProjectHistoryCheck> {
    if (!isSupabaseConfigured) {
      return {
        hasHistory: false,
        canDelete: true,
        roundsCount: 0,
        votesCount: 0,
        resultsCount: 0,
        summary: 'Supabase não conectado.',
      };
    }

    try {
      const [roundsRes, votesRes, resultsRes] = await Promise.all([
        supabase.from('rounds').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('votes').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('results').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      ]);

      const roundsCount = roundsRes.count || 0;
      const votesCount = votesRes.count || 0;
      const resultsCount = resultsRes.count || 0;
      const hasHistory = roundsCount > 0 || votesCount > 0 || resultsCount > 0;

      return {
        hasHistory,
        canDelete: !hasHistory,
        roundsCount,
        votesCount,
        resultsCount,
        summary: hasHistory
          ? `O projeto possui histórico com ${roundsCount} rodada(s), ${votesCount} voto(s) e ${resultsCount} resultado(s) associados.`
          : 'Nenhum histórico de rodada ou voto associado. Exclusão segura permitida.',
      };
    } catch (err: any) {
      console.warn('Erro ao verificar histórico do projeto:', err);
      return {
        hasHistory: false,
        canDelete: false,
        roundsCount: 0,
        votesCount: 0,
        resultsCount: 0,
        summary: 'Erro ao verificar integridade.',
      };
    }
  },

  /**
   * Exclusão segura de projeto:
   * Bloqueia exclusão física se houver histórico de votos ou rodadas.
   * Permite exclusão caso o projeto seja limpo (sem vínculos).
   */
  async deleteProject(projectId: string, force = false): Promise<{ success: boolean; id: string }> {
    if (!projectId) {
      throw new Error('Identificador do projeto é obrigatório para exclusão.');
    }

    if (!force) {
      const history = await this.checkProjectHistory(projectId);
      if (history.hasHistory) {
        throw new Error(
          `Não é possível excluir fisicamente este projeto pois ele possui histórico registrado (${history.summary}). Para retirá-lo da votação sem violar a rastreabilidade da competição, utilize a opção de desativar o projeto.`
        );
      }
    }

    if (isSupabaseConfigured) {
      // Limpa referência de current_project_id no evento se for o projeto atual
      await supabase
        .from('events')
        .update({ current_project_id: null })
        .eq('current_project_id', projectId);

      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) {
        console.error('Erro ao excluir projeto no Supabase:', error);
        throw new Error(`Falha ao excluir projeto do banco: ${error.message}`);
      }

      return { success: true, id: projectId };
    }

    throw new Error('Supabase não está configurado para operações no banco de dados.');
  },

  /**
   * Alterna o estado ativo/inativo de um projeto diretamente no Supabase
   */
  async toggleProjectActive(projectId: string, active: boolean): Promise<ProjectDocument> {
    return this.updateProject(projectId, {
      active,
      status: active ? 'active' : 'inactive',
    });
  },

  /**
   * Consulta e calcula as estatísticas reais de aprovação do projeto (Ponteiro Dinâmico)
   * Baseado exclusivamente nos votos reais registrados no Supabase
   */
  async getProjectApprovalStats(
    eventId: string,
    projectId: string,
    roundId?: string
  ): Promise<ApprovalStats> {
    if (!isSupabaseConfigured || !projectId) {
      return calculateApprovalStats([]);
    }

    try {
      let query = supabase
        .from('votes')
        .select('innovation, impact, development, round_id')
        .eq('event_id', eventId)
        .eq('project_id', projectId);

      if (roundId) {
        query = query.eq('round_id', roundId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Erro ao consultar votos para ponteiro de aprovação:', error.message);
      }

      // Consulta complementar à tabela results (pública e consolidada no Supabase)
      const { data: resRow } = await supabase
        .from('results')
        .select('*')
        .eq('id', `${eventId}_${projectId}`)
        .maybeSingle();

      const preAgg = resRow
        ? {
            totalVotes: Number(resRow.total_votes || 0),
            averageGeneral: resRow.average_general !== null ? Number(resRow.average_general) : undefined,
          }
        : undefined;

      if (data && data.length > 0) {
        return calculateApprovalStats(data, preAgg);
      }

      if (preAgg && preAgg.totalVotes && preAgg.totalVotes > 0) {
        return calculateApprovalStats([], preAgg);
      }

      return calculateApprovalStats([]);
    } catch (err) {
      console.warn('Falha no cálculo do ponteiro:', err);
      return calculateApprovalStats([]);
    }
  },

  /**
   * Monitora em tempo real as estatísticas de aprovação do projeto (Ponteiro Dinâmico)
   * Dispara atualização após cada voto registrado no Supabase
   */
  subscribeToProjectApprovalStats(
    eventId: string,
    projectId: string,
    roundId: string | undefined,
    onUpdate: (stats: ApprovalStats) => void
  ): Unsubscribe {
    if (!isSupabaseConfigured || !projectId) {
      onUpdate(calculateApprovalStats([]));
      return () => {};
    }

    let isSubscribed = true;

    const fetchStats = async () => {
      if (!isSubscribed) return;
      const stats = await this.getProjectApprovalStats(eventId, projectId, roundId);
      if (isSubscribed) onUpdate(stats);
    };

    fetchStats();

    // Escuta mudanças atômicas em results (que é atualizado em cada voto) e em votes
    const resultDocId = `${eventId}_${projectId}`;
    const channelId = `approval_gauge_${resultDocId}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results', filter: `id=eq.${resultDocId}` },
        () => {
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `project_id=eq.${projectId}` },
        () => {
          fetchStats();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchStats();
        }
      });

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  },
};

export default EventService;
