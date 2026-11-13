/**
 * ARENA VOICE — VOTO POPULAR
 * Serviço Oficial de Gerenciamento de Configurações por Evento (Etapa 4)
 *
 * Responsável por:
 * 1. Consultar configurações individuais por evento (tempo padrão da rodada, peso do voto popular, etc.)
 * 2. Atualizar configurações com validações estritas de intervalo no backend/RPC
 * 3. Rastrear e consultar histórico auditável de alterações por evento
 * 4. Fornecer fallback resiliente isolado por evento em caso de operação offline
 */

import { supabase, isSupabaseConfigured } from '@/supabase/client';
import {
  EventSettings,
  EventSettingsRow,
  EventSettingsHistoryItem,
  EventSettingsHistoryRow,
} from '@/types';

export const DEFAULT_SETTINGS: Omit<EventSettings, 'eventId'> = {
  defaultRoundDuration: 60, // 60 segundos padrão
  popularVoteWeight: 20.0, // 20% do Voto Popular
  showRealtimeScreen: true,
};

const STORAGE_PREFIX = 'arena_voice_event_settings_';
const HISTORY_STORAGE_PREFIX = 'arena_voice_event_settings_history_';

function mapSettingsRow(row: EventSettingsRow): EventSettings {
  return {
    eventId: row.event_id,
    defaultRoundDuration: Number(row.default_round_duration ?? 60),
    popularVoteWeight: Number(row.popular_vote_weight ?? 20.0),
    showRealtimeScreen: Boolean(row.show_realtime_screen ?? true),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export class SettingsService {
  /**
   * Obtém as configurações do evento informado.
   * Se ainda não existirem, inicializa com os padrões oficiais e persiste.
   */
  static async getSettings(eventId: string): Promise<EventSettings> {
    if (!eventId) {
      throw new Error('ID do evento é obrigatório para carregar configurações.');
    }

    if (isSupabaseConfigured) {
      try {
        // 1. Tenta buscar via RPC dedicada get_event_settings
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_event_settings',
          { p_event_id: eventId }
        );

        if (!rpcError && rpcData) {
          const mapped = mapSettingsRow(rpcData as EventSettingsRow);
          this.saveLocalBackup(eventId, mapped);
          return mapped;
        }

        // 2. Se a RPC não existir ainda, tenta consulta direta na tabela event_settings
        const { data: tableData, error: tableError } = await supabase
          .from('event_settings')
          .select('*')
          .eq('event_id', eventId)
          .maybeSingle();

        if (!tableError && tableData) {
          const mapped = mapSettingsRow(tableData as EventSettingsRow);
          this.saveLocalBackup(eventId, mapped);
          return mapped;
        }

        // 3. Se a tabela existir mas a linha não, tenta inserir configuração padrão
        if (!tableError && !tableData) {
          const { data: inserted, error: insertError } = await supabase
            .from('event_settings')
            .insert({
              event_id: eventId,
              default_round_duration: DEFAULT_SETTINGS.defaultRoundDuration,
              popular_vote_weight: DEFAULT_SETTINGS.popularVoteWeight,
              show_realtime_screen: DEFAULT_SETTINGS.showRealtimeScreen,
            })
            .select('*')
            .maybeSingle();

          if (!insertError && inserted) {
            const mapped = mapSettingsRow(inserted as EventSettingsRow);
            this.saveLocalBackup(eventId, mapped);
            return mapped;
          }
        }
      } catch (err) {
        console.warn(`[SettingsService] Falha ao carregar do Supabase para ${eventId}:`, err);
      }
    }

    // Fallback: Recupera do armazenamento local específico do evento
    return this.loadLocalBackup(eventId);
  }

  /**
   * Atualiza as configurações de um evento específico.
   * Validações de limites:
   * - Duração da rodada: entre 10 e 3600 segundos
   * - Peso do Voto Popular: entre 0.00% e 100.00%
   */
  static async updateSettings(
    eventId: string,
    payload: {
      defaultRoundDuration?: number;
      popularVoteWeight?: number;
      showRealtimeScreen?: boolean;
    }
  ): Promise<EventSettings> {
    if (!eventId) {
      throw new Error('ID do evento é obrigatório para atualizar configurações.');
    }

    // 1. Validações estritas de intervalo
    if (payload.defaultRoundDuration !== undefined) {
      const dur = Number(payload.defaultRoundDuration);
      if (isNaN(dur) || dur < 10 || dur > 3600) {
        throw new Error('A duração padrão da rodada deve ser um número inteiro entre 10 e 3600 segundos.');
      }
    }

    if (payload.popularVoteWeight !== undefined) {
      const weight = Number(payload.popularVoteWeight);
      if (isNaN(weight) || weight < 0 || weight > 100) {
        throw new Error('O peso do Voto Popular deve ser um percentual válido entre 0% e 100%.');
      }
    }

    // Carrega o estado atual para registrar histórico
    const current = await this.getSettings(eventId);

    const newDuration =
      payload.defaultRoundDuration !== undefined
        ? Math.round(Number(payload.defaultRoundDuration))
        : current.defaultRoundDuration;

    const newWeight =
      payload.popularVoteWeight !== undefined
        ? Number(payload.popularVoteWeight)
        : current.popularVoteWeight;

    const newShowScreen =
      payload.showRealtimeScreen !== undefined
        ? Boolean(payload.showRealtimeScreen)
        : current.showRealtimeScreen;

    if (isSupabaseConfigured) {
      try {
        // Tenta atualizar via RPC que grava histórico e garante controle de acesso
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'update_event_settings',
          {
            p_event_id: eventId,
            p_default_round_duration: newDuration,
            p_popular_vote_weight: newWeight,
            p_show_realtime_screen: newShowScreen,
          }
        );

        if (!rpcError && rpcData) {
          const updated = mapSettingsRow(rpcData as EventSettingsRow);
          this.saveLocalBackup(eventId, updated);
          return updated;
        }

        // Se RPC falhar, tenta fallback via upsert na tabela event_settings
        const { data: upsertData, error: upsertError } = await supabase
          .from('event_settings')
          .upsert(
            {
              event_id: eventId,
              default_round_duration: newDuration,
              popular_vote_weight: newWeight,
              show_realtime_screen: newShowScreen,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'event_id' }
          )
          .select('*')
          .single();

        if (!upsertError && upsertData) {
          const updated = mapSettingsRow(upsertData as EventSettingsRow);
          this.saveLocalBackup(eventId, updated);
          return updated;
        }

        if (rpcError) {
          throw new Error(`Falha no banco ao atualizar configurações: ${rpcError.message}`);
        }
      } catch (err: any) {
        console.warn(`[SettingsService] Erro ao persistir no Supabase: ${err.message}`);
        if (!err.message?.includes('network') && !err.message?.includes('fetch')) {
          // Se for erro de permissão ou validação, propaga
          throw err;
        }
      }
    }

    // Fallback local caso offline ou tabela não aplicada
    const updatedLocally: EventSettings = {
      eventId,
      defaultRoundDuration: newDuration,
      popularVoteWeight: newWeight,
      showRealtimeScreen: newShowScreen,
      updatedAt: new Date().toISOString(),
    };

    // Registra alteração no histórico local
    this.recordLocalHistory(eventId, current, updatedLocally);
    this.saveLocalBackup(eventId, updatedLocally);

    return updatedLocally;
  }

  /**
   * Obtém o histórico de alterações das configurações do evento
   */
  static async getHistory(eventId: string): Promise<EventSettingsHistoryItem[]> {
    if (!eventId) return [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('event_settings_history')
          .select('*')
          .eq('event_id', eventId)
          .order('changed_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          return data.map((row: EventSettingsHistoryRow) => ({
            id: row.id,
            eventId: row.event_id,
            settingKey: row.setting_key,
            oldValue: row.old_value,
            newValue: row.new_value,
            changedBy: row.changed_by,
            changedAt: row.changed_at,
            metadata: row.metadata,
          }));
        }
      } catch (err) {
        console.warn(`[SettingsService] Falha ao consultar histórico no Supabase:`, err);
      }
    }

    return this.loadLocalHistory(eventId);
  }

  /**
   * Recalcula explicitamente os resultados de um evento (ou projeto específico)
   * utilizando a configuração atual de peso. Ação auditável e voluntária.
   */
  static async recalculateResults(
    eventId: string,
    projectId?: string
  ): Promise<{ success: boolean; recalculatedCount: number }> {
    if (!eventId) throw new Error('ID do evento obrigatório para recálculo.');

    if (isSupabaseConfigured) {
      try {
        if (projectId) {
          const { error } = await supabase.rpc('reconcile_results', {
            p_event_id: eventId,
            p_project_id: projectId,
          });
          if (error) throw new Error(error.message);
          return { success: true, recalculatedCount: 1 };
        } else {
          // Recalcula todos os projetos ativos do evento
          const { data: projs, error: pError } = await supabase
            .from('projects')
            .select('id')
            .eq('event_id', eventId);

          if (pError) throw new Error(pError.message);

          let count = 0;
          for (const p of projs || []) {
            await supabase.rpc('reconcile_results', {
              p_event_id: eventId,
              p_project_id: p.id,
            });
            count++;
          }
          return { success: true, recalculatedCount: count };
        }
      } catch (err: any) {
        throw new Error(`Falha ao recalcular resultados no Supabase: ${err.message}`);
      }
    }

    return { success: true, recalculatedCount: 0 };
  }

  // --- MÉTODOS DE FALLBACK LOCAL ---

  private static loadLocalBackup(eventId: string): EventSettings {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${eventId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            eventId,
            defaultRoundDuration: Number(parsed.defaultRoundDuration ?? 60),
            popularVoteWeight: Number(parsed.popularVoteWeight ?? 20.0),
            showRealtimeScreen: Boolean(parsed.showRealtimeScreen ?? true),
            updatedAt: parsed.updatedAt,
          };
        }
      }
    } catch (err) {
      // Ignora erro de JSON
    }

    return {
      eventId,
      ...DEFAULT_SETTINGS,
    };
  }

  private static saveLocalBackup(eventId: string, settings: EventSettings): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${STORAGE_PREFIX}${eventId}`, JSON.stringify(settings));
        // Sincroniza também chave legada com as configurações do evento ativo
        localStorage.setItem(
          'arena_voice_admin_event_config',
          JSON.stringify({
            tempoPadraoRodadaSegundos: settings.defaultRoundDuration,
            pesoVotoPopularPercentual: settings.popularVoteWeight,
            exibirTelaoTempoReal: settings.showRealtimeScreen,
          })
        );
      }
    } catch (err) {
      // Ignora
    }
  }

  private static loadLocalHistory(eventId: string): EventSettingsHistoryItem[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(`${HISTORY_STORAGE_PREFIX}${eventId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (err) {
      // Ignora
    }
    return [];
  }

  private static recordLocalHistory(
    eventId: string,
    oldSettings: EventSettings,
    newSettings: EventSettings
  ): void {
    try {
      const history = this.loadLocalHistory(eventId);

      if (oldSettings.defaultRoundDuration !== newSettings.defaultRoundDuration) {
        history.unshift({
          id: `hist_${Date.now()}_dur`,
          eventId,
          settingKey: 'default_round_duration',
          oldValue: `${oldSettings.defaultRoundDuration}s`,
          newValue: `${newSettings.defaultRoundDuration}s`,
          changedBy: 'Admin Local',
          changedAt: new Date().toISOString(),
        });
      }

      if (oldSettings.popularVoteWeight !== newSettings.popularVoteWeight) {
        history.unshift({
          id: `hist_${Date.now()}_weight`,
          eventId,
          settingKey: 'popular_vote_weight',
          oldValue: `${oldSettings.popularVoteWeight}%`,
          newValue: `${newSettings.popularVoteWeight}%`,
          changedBy: 'Admin Local',
          changedAt: new Date().toISOString(),
        });
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(
          `${HISTORY_STORAGE_PREFIX}${eventId}`,
          JSON.stringify(history.slice(0, 50))
        );
      }
    } catch (err) {
      // Ignora
    }
  }
}
