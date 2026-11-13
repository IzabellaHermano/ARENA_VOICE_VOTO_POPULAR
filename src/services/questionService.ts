import { supabase, isSupabaseConfigured } from '@/supabase/client';
import { EventQuestion } from '@/types/supabase';

export interface CreateQuestionPayload {
  title: string;
  description?: string;
  position?: number;
  active?: boolean;
}

export interface UpdateQuestionPayload {
  title?: string;
  description?: string;
  position?: number;
  active?: boolean;
}

const LOCAL_STORAGE_KEY_PREFIX = 'arena_voice_questions_';

// Critérios padrão para arena-voice-2026 ou inicialização
export const DEFAULT_CRITERIA_QUESTIONS: Omit<EventQuestion, 'eventId'>[] = [
  {
    id: 'q_default_inno',
    title: 'Nível de Inovação',
    description: 'Avalia a originalidade e a inovação da solução.',
    position: 1,
    active: true,
    required: true,
    minScore: 1,
    maxScore: 5,
  },
  {
    id: 'q_default_impact',
    title: 'Impacto do Projeto na CPTM',
    description: 'Avalia a contribuição do projeto para a companhia.',
    position: 2,
    active: true,
    required: true,
    minScore: 1,
    maxScore: 5,
  },
  {
    id: 'q_default_dev',
    title: 'Salto de Desenvolvimento do Projeto',
    description: 'Avalia a evolução apresentada pelo projeto.',
    position: 3,
    active: true,
    required: true,
    minScore: 1,
    maxScore: 5,
  },
];

export const QuestionService = {
  /**
   * Lista as perguntas configuradas para o evento selecionado
   */
  async listQuestions(eventId: string, includeInactive = false): Promise<EventQuestion[]> {
    if (!eventId) return [];

    if (isSupabaseConfigured) {
      try {
        // 1. Tenta via RPC pública/administrativa
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_event_questions', {
          p_event_id: eventId,
          p_include_inactive: includeInactive,
        });

        if (!rpcErr && rpcData?.success && Array.isArray(rpcData.questions)) {
          return rpcData.questions.map((q: any) => ({
            id: q.id,
            eventId: q.event_id || eventId,
            title: q.title,
            description: q.description || '',
            position: q.position,
            active: q.active,
            required: q.required ?? true,
            minScore: q.min_score ?? 1,
            maxScore: q.max_score ?? 5,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
          }));
        }

        // 2. Consulta direta à tabela public.event_questions
        let query = supabase
          .from('event_questions')
          .select('*')
          .eq('event_id', eventId)
          .order('position', { ascending: true });

        if (!includeInactive) {
          query = query.eq('active', true);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((q: any) => ({
            id: q.id,
            eventId: q.event_id,
            title: q.title,
            description: q.description || '',
            position: q.position,
            active: q.active,
            required: q.required ?? true,
            minScore: q.min_score ?? 1,
            maxScore: q.max_score ?? 5,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
          }));
        }
      } catch (err) {
        console.warn('[QuestionService] Erro ao listar perguntas no Supabase:', err);
      }
    }

    // Fallback local isolado por evento
    return this.getLocalQuestions(eventId, includeInactive);
  },

  /**
   * Cria uma nova pergunta associada ao evento
   */
  async createQuestion(eventId: string, payload: CreateQuestionPayload): Promise<EventQuestion> {
    if (!eventId) throw new Error('ID do evento é obrigatório.');
    if (!payload.title?.trim()) throw new Error('Título da pergunta é obrigatório.');

    const trimmedTitle = payload.title.trim();
    const trimmedDesc = payload.description?.trim() || '';

    if (isSupabaseConfigured) {
      // 1. Tenta via RPC segura
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('manage_event_question', {
          p_action: 'create',
          p_event_id: eventId,
          p_title: trimmedTitle,
          p_description: trimmedDesc,
          p_position: payload.position,
          p_active: payload.active ?? true,
        });

        if (!rpcErr && rpcData?.success && rpcData.question) {
          const q = rpcData.question;
          const newQ: EventQuestion = {
            id: q.id,
            eventId: q.event_id || eventId,
            title: q.title,
            description: q.description || '',
            position: q.position,
            active: q.active,
            required: q.required ?? true,
            minScore: q.min_score ?? 1,
            maxScore: q.max_score ?? 5,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
          };
          this.syncLocalQuestion(eventId, newQ);
          return newQ;
        }
      } catch (err) {
        console.warn('[QuestionService] Falha na RPC create, tentando inserção direta:', err);
      }

      // 2. Inserção direta via tabela
      try {
        const { data, error } = await supabase
          .from('event_questions')
          .insert({
            event_id: eventId,
            title: trimmedTitle,
            description: trimmedDesc,
            position: payload.position ?? 1,
            active: payload.active ?? true,
            required: true,
            min_score: 1,
            max_score: 5,
          })
          .select()
          .single();

        if (!error && data) {
          const newQ: EventQuestion = {
            id: data.id,
            eventId: data.event_id,
            title: data.title,
            description: data.description || '',
            position: data.position,
            active: data.active,
            required: data.required ?? true,
            minScore: data.min_score ?? 1,
            maxScore: data.max_score ?? 5,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          this.syncLocalQuestion(eventId, newQ);
          return newQ;
        }
      } catch (err) {
        console.warn('[QuestionService] Falha na inserção direta:', err);
      }
    }

    // Fallback local
    const localList = this.getLocalQuestions(eventId, true);
    const position = payload.position ?? localList.length + 1;
    const newQuestion: EventQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId,
      title: trimmedTitle,
      description: trimmedDesc,
      position,
      active: payload.active ?? true,
      required: true,
      minScore: 1,
      maxScore: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localList.push(newQuestion);
    this.saveLocalQuestions(eventId, localList);
    return newQuestion;
  },

  /**
   * Atualiza os dados de uma pergunta existente
   */
  async updateQuestion(
    eventId: string,
    questionId: string,
    payload: UpdateQuestionPayload
  ): Promise<EventQuestion> {
    if (!eventId || !questionId) throw new Error('ID do evento e da pergunta são obrigatórios.');

    if (isSupabaseConfigured) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('manage_event_question', {
          p_action: 'update',
          p_event_id: eventId,
          p_question_id: questionId,
          p_title: payload.title?.trim(),
          p_description: payload.description !== undefined ? payload.description.trim() : undefined,
          p_position: payload.position,
          p_active: payload.active,
        });

        if (!rpcErr && rpcData?.success && rpcData.question) {
          const q = rpcData.question;
          const updated: EventQuestion = {
            id: q.id,
            eventId: q.event_id || eventId,
            title: q.title,
            description: q.description || '',
            position: q.position,
            active: q.active,
            required: q.required ?? true,
            minScore: q.min_score ?? 1,
            maxScore: q.max_score ?? 5,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
          };
          this.syncLocalQuestion(eventId, updated);
          return updated;
        }
      } catch (err) {
        console.warn('[QuestionService] Falha na atualização remota:', err);
      }
    }

    // Fallback local
    const localList = this.getLocalQuestions(eventId, true);
    const index = localList.findIndex((q) => q.id === questionId);
    if (index === -1) throw new Error('Pergunta não encontrada.');

    const updated: EventQuestion = {
      ...localList[index],
      title: payload.title !== undefined ? payload.title.trim() : localList[index].title,
      description: payload.description !== undefined ? payload.description.trim() : localList[index].description,
      position: payload.position !== undefined ? payload.position : localList[index].position,
      active: payload.active !== undefined ? payload.active : localList[index].active,
      updatedAt: new Date().toISOString(),
    };

    localList[index] = updated;
    this.saveLocalQuestions(eventId, localList);
    return updated;
  },

  /**
   * Alterna o status ativo/inativo de uma pergunta
   */
  async toggleActive(eventId: string, questionId: string, currentActive: boolean): Promise<boolean> {
    const nextActive = !currentActive;

    if (isSupabaseConfigured) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('manage_event_question', {
          p_action: 'toggle_active',
          p_event_id: eventId,
          p_question_id: questionId,
          p_active: nextActive,
        });

        if (!rpcErr && rpcData?.success) {
          this.updateLocalActiveState(eventId, questionId, nextActive);
          return nextActive;
        }
      } catch (err) {
        console.warn('[QuestionService] Falha ao alternar status no Supabase:', err);
      }
    }

    this.updateLocalActiveState(eventId, questionId, nextActive);
    return nextActive;
  },

  /**
   * Exclui ou arquiva uma pergunta
   */
  async deleteQuestion(eventId: string, questionId: string): Promise<void> {
    if (!eventId || !questionId) throw new Error('ID do evento e da pergunta são obrigatórios.');

    if (isSupabaseConfigured) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('manage_event_question', {
          p_action: 'delete',
          p_event_id: eventId,
          p_question_id: questionId,
        });

        if (!rpcErr && rpcData?.success) {
          this.removeLocalQuestion(eventId, questionId);
          return;
        }

        if (rpcErr && rpcErr.message?.includes('votos registrados')) {
          throw new Error(rpcErr.message);
        }
      } catch (err: any) {
        if (err.message?.includes('votos registrados')) {
          throw err;
        }
        console.warn('[QuestionService] Erro na exclusão remota, aplicando localmente:', err);
      }
    }

    this.removeLocalQuestion(eventId, questionId);
  },

  /**
   * Reordena a sequência de perguntas do evento
   */
  async reorderQuestions(eventId: string, questionIds: string[]): Promise<void> {
    if (!eventId || !questionIds?.length) return;

    if (isSupabaseConfigured) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('reorder_event_questions', {
          p_event_id: eventId,
          p_question_ids: questionIds,
        });

        if (!rpcErr && rpcData?.success) {
          this.applyLocalReorder(eventId, questionIds);
          return;
        }
      } catch (err) {
        console.warn('[QuestionService] Erro na reordenação remota:', err);
      }
    }

    this.applyLocalReorder(eventId, questionIds);
  },

  /**
   * Monitora em tempo real as perguntas do evento
   */
  subscribeToQuestions(
    eventId: string,
    onUpdate: (questions: EventQuestion[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!eventId) {
      onUpdate([]);
      return () => {};
    }

    let isSubscribed = true;

    const fetchAll = async () => {
      try {
        const list = await this.listQuestions(eventId, false);
        if (isSubscribed) {
          onUpdate(list);
        }
      } catch (err: any) {
        if (isSubscribed && onError) onError(err);
      }
    };

    fetchAll();

    if (!isSupabaseConfigured) {
      return () => {
        isSubscribed = false;
      };
    }

    const channelId = `event_questions_sub_${eventId}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_questions',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          if (isSubscribed) {
            fetchAll();
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  },

  // =========================================================================
  // PERSISTÊNCIA LOCAL ISOLADA POR EVENTO
  // =========================================================================

  getLocalQuestions(eventId: string, includeInactive = false): EventQuestion[] {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${eventId}`);
      if (raw) {
        const list: EventQuestion[] = JSON.parse(raw);
        const filtered = includeInactive ? list : list.filter((q) => q.active);
        return filtered.sort((a, b) => a.position - b.position);
      }
    } catch {
      // Ignora erro de JSON
    }

    // Inicializa com as 3 perguntas oficiais da CPTM se for o evento oficial ou primeiro acesso
    const defaultList: EventQuestion[] = DEFAULT_CRITERIA_QUESTIONS.map((q) => ({
      ...q,
      eventId,
    }));
    this.saveLocalQuestions(eventId, defaultList);
    return defaultList;
  },

  saveLocalQuestions(eventId: string, list: EventQuestion[]): void {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${eventId}`, JSON.stringify(list));
    } catch (err) {
      console.warn('Falha ao gravar perguntas no localStorage:', err);
    }
  },

  syncLocalQuestion(eventId: string, question: EventQuestion): void {
    const list = this.getLocalQuestions(eventId, true);
    const idx = list.findIndex((q) => q.id === question.id);
    if (idx !== -1) {
      list[idx] = question;
    } else {
      list.push(question);
    }
    this.saveLocalQuestions(eventId, list);
  },

  updateLocalActiveState(eventId: string, questionId: string, active: boolean): void {
    const list = this.getLocalQuestions(eventId, true);
    const idx = list.findIndex((q) => q.id === questionId);
    if (idx !== -1) {
      list[idx].active = active;
      this.saveLocalQuestions(eventId, list);
    }
  },

  removeLocalQuestion(eventId: string, questionId: string): void {
    const list = this.getLocalQuestions(eventId, true);
    const filtered = list.filter((q) => q.id !== questionId);
    this.saveLocalQuestions(eventId, filtered);
  },

  applyLocalReorder(eventId: string, questionIds: string[]): void {
    const list = this.getLocalQuestions(eventId, true);
    const reordered: EventQuestion[] = [];

    questionIds.forEach((id, index) => {
      const found = list.find((q) => q.id === id);
      if (found) {
        reordered.push({ ...found, position: index + 1 });
      }
    });

    // Mantém perguntas que porventura não estavam no array
    list.forEach((q) => {
      if (!questionIds.includes(q.id)) {
        reordered.push({ ...q, position: reordered.length + 1 });
      }
    });

    this.saveLocalQuestions(eventId, reordered);
  },
};

