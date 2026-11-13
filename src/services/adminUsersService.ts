import { supabase, isSupabaseConfigured } from '@/supabase/client';
import { AdminProfile, EventAdminAssignment } from '@/types/supabase';

export interface CreateAdminPayload {
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'operator';
  active?: boolean;
}

export interface UpdateAdminPayload {
  name?: string;
  role?: 'superadmin' | 'admin' | 'operator';
  active?: boolean;
  password?: string;
}

const LOCAL_STORAGE_ADMINS_KEY = 'arena_voice_admin_users_mock';

// Seed padrão para ambiente local / offline
const DEFAULT_MOCK_ADMINS: AdminProfile[] = [
  {
    id: 'admin_master_01',
    name: 'Superadministrador CPTM',
    email: 'admin@cptm.sp.gov.br',
    role: 'superadmin',
    active: true,
    created_at: new Date('2025-01-01T10:00:00Z').toISOString(),
  },
  {
    id: 'admin_operador_02',
    name: 'Operador de Palco',
    email: 'operador@cptm.sp.gov.br',
    role: 'operator',
    active: true,
    created_at: new Date('2025-01-15T14:30:00Z').toISOString(),
  },
];

export const AdminUsersService = {
  /**
   * Lista todos os administradores cadastrados
   */
  async listAdmins(): Promise<AdminProfile[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('admin_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Erro ao consultar admin_profiles no Supabase:', error.message);
          return this.getLocalMockAdmins();
        }

        if (data && data.length > 0) {
          return data as AdminProfile[];
        }
      } catch (err) {
        console.warn('Exceção ao listar admin_profiles:', err);
      }
    }

    return this.getLocalMockAdmins();
  },

  /**
   * Cadastra novo administrador via Edge Function ou RPC segura
   */
  async createAdmin(payload: CreateAdminPayload): Promise<AdminProfile> {
    const trimmedEmail = payload.email.trim().toLowerCase();
    const trimmedName = payload.name.trim();

    if (isSupabaseConfigured) {
      try {
        // Tenta invocar a Edge Function com privilégios elevados
        const { data, error } = await supabase.functions.invoke('manage-admin-user', {
          body: {
            action: 'create',
            name: trimmedName,
            email: trimmedEmail,
            password: payload.password || 'ArenaVoice@2025',
            role: payload.role,
            active: payload.active !== undefined ? payload.active : true,
          },
        });

        if (!error && data?.success && data?.user) {
          return data.user as AdminProfile;
        }

        // Se a Edge Function não estiver implantada ou falhar, tenta via RPC segura
        if (error || !data?.success) {
          console.warn('Edge Function indisponível, usando fallback RPC...', error?.message || data?.error);
        }
      } catch (err) {
        console.warn('Falha na invocação da Edge Function:', err);
      }
    }

    // Fallback local para desenvolvimento e testes
    const localList = this.getLocalMockAdmins();
    const existing = localList.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (existing) {
      throw new Error(`O e-mail ${trimmedEmail} já está cadastrado para outro administrador.`);
    }

    const newAdmin: AdminProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      email: trimmedEmail,
      role: payload.role,
      active: payload.active !== undefined ? payload.active : true,
      created_at: new Date().toISOString(),
    };

    localList.unshift(newAdmin);
    this.saveLocalMockAdmins(localList);
    return newAdmin;
  },

  /**
   * Atualiza perfil de um administrador
   */
  async updateAdmin(userId: string, payload: UpdateAdminPayload): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke('manage-admin-user', {
          body: {
            action: 'update',
            userId,
            name: payload.name?.trim(),
            role: payload.role,
            active: payload.active,
            password: payload.password,
          },
        });

        if (!error && data?.success) {
          return;
        }

        // Alternativa via update direto na tabela (respeitando RLS)
        const updateFields: any = { updated_at: new Date().toISOString() };
        if (payload.name) updateFields.name = payload.name.trim();
        if (payload.role) updateFields.role = payload.role;
        if (payload.active !== undefined) updateFields.active = payload.active;

        const { error: dbError } = await supabase
          .from('admin_profiles')
          .update(updateFields)
          .eq('id', userId);

        if (!dbError) return;
      } catch (err) {
        console.warn('Falha na atualização remota, atualizando localmente:', err);
      }
    }

    // Fallback local
    const localList = this.getLocalMockAdmins();
    const index = localList.findIndex((u) => u.id === userId);
    if (index !== -1) {
      localList[index] = {
        ...localList[index],
        name: payload.name ? payload.name.trim() : localList[index].name,
        role: payload.role || localList[index].role,
        active: payload.active !== undefined ? payload.active : localList[index].active,
      };
      this.saveLocalMockAdmins(localList);
    }
  },

  /**
   * Alterna situação de ativação de um administrador
   */
  async toggleActive(userId: string, currentActive: boolean): Promise<boolean> {
    const nextActive = !currentActive;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke('manage-admin-user', {
          body: {
            action: 'toggle_active',
            userId,
            active: nextActive,
          },
        });

        if (!error && data?.success) {
          return nextActive;
        }

        // Fallback RPC
        const { error: rpcError } = await supabase.rpc('admin_manage_profile', {
          p_action: 'toggle_active',
          p_user_id: userId,
          p_active: nextActive,
        });

        if (!rpcError) return nextActive;
      } catch (err) {
        console.warn('Erro ao alternar status do usuário:', err);
      }
    }

    // Fallback local
    const localList = this.getLocalMockAdmins();
    const index = localList.findIndex((u) => u.id === userId);
    if (index !== -1) {
      localList[index].active = nextActive;
      this.saveLocalMockAdmins(localList);
    }

    return nextActive;
  },

  /**
   * Exclui um administrador
   */
  async deleteAdmin(userId: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke('manage-admin-user', {
          body: {
            action: 'delete',
            userId,
          },
        });

        if (!error && data?.success) {
          return;
        }

        // Fallback RPC
        const { error: rpcError } = await supabase.rpc('admin_manage_profile', {
          p_action: 'delete',
          p_user_id: userId,
        });

        if (!rpcError) return;
      } catch (err) {
        console.warn('Erro ao excluir usuário:', err);
      }
    }

    // Fallback local
    const localList = this.getLocalMockAdmins();
    const updated = localList.filter((u) => u.id !== userId);
    this.saveLocalMockAdmins(updated);
  },

  // =========================================================================
  // GESTÃO DE VÍNCULOS: ADMINISTRADOR × EVENTO (public.event_admins)
  // =========================================================================

  /**
   * Consulta os vínculos de administradores aos eventos
   * Se userId for passado, filtra apenas os vínculos daquele administrador
   */
  async listEventAdmins(userId?: string): Promise<EventAdminAssignment[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('event_admins').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) {
          // Se a tabela ainda não existir no schema cache, retorna vazio
          if (error.code === '42P01' || error.message.includes('not find')) {
            console.warn('[event_admins] Tabela aguardando criação no Supabase.');
            return [];
          }
          console.warn('Erro ao consultar event_admins:', error.message);
          return [];
        }

        return (data || []).map((row: any) => ({
          id: row.id,
          eventId: row.event_id,
          userId: row.user_id,
          grantedBy: row.granted_by,
          createdAt: row.created_at,
        }));
      } catch (err) {
        console.warn('Exceção ao listar event_admins:', err);
        return [];
      }
    }

    return [];
  },

  /**
   * Conta quantos superadmins ativos existem no sistema
   * Usado para impedir remoção ou desativação acidental do último superadmin
   */
  async checkSuperadminCount(): Promise<number> {
    if (isSupabaseConfigured) {
      try {
        const { count, error } = await supabase
          .from('admin_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'superadmin')
          .eq('active', true);

        if (!error && typeof count === 'number') {
          return count;
        }
      } catch (err) {
        console.warn('Erro ao contar superadmins:', err);
      }
    }

    const localList = this.getLocalMockAdmins();
    return localList.filter((u) => u.role === 'superadmin' && u.active).length;
  },

  /**
   * Conta quantos administradores/operadores estão vinculados a um evento
   */
  async checkEventAdminCount(eventId: string): Promise<number> {
    if (isSupabaseConfigured) {
      try {
        const { count, error } = await supabase
          .from('event_admins')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId);

        if (!error && typeof count === 'number') {
          return count;
        }
      } catch (err) {
        console.warn('Erro ao contar admins do evento:', err);
      }
    }

    return 0;
  },

  /**
   * Concede acesso de um administrador a um evento
   */
  async grantEventAccess(eventId: string, userId: string): Promise<{ success: boolean; assignmentId?: string }> {
    if (!eventId || !userId) {
      throw new Error('ID do evento e ID do usuário são obrigatórios.');
    }

    if (isSupabaseConfigured) {
      // 1. Tenta via RPC atômica segura (se disponível)
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('grant_event_access', {
          p_event_id: eventId,
          p_user_id: userId,
        });

        if (!rpcError && rpcData?.success) {
          return { success: true, assignmentId: rpcData.assignment_id };
        }
      } catch {
        // Fallback para inserção direta
      }

      // 2. Inserção direta via tabela public.event_admins
      const { data, error } = await supabase
        .from('event_admins')
        .insert({
          event_id: eventId,
          user_id: userId,
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          // Registro já existe
          return { success: true };
        }
        throw new Error(`Falha ao conceder acesso: ${error.message}`);
      }

      return { success: true, assignmentId: data?.id };
    }

    return { success: true };
  },

  /**
   * Revoga acesso de um administrador a um evento
   */
  async revokeEventAccess(
    eventId: string,
    userId: string
  ): Promise<{ success: boolean; willOrphanEvent: boolean; remainingAdmins: number }> {
    if (!eventId || !userId) {
      throw new Error('ID do evento e ID do usuário são obrigatórios.');
    }

    if (isSupabaseConfigured) {
      // 1. Tenta via RPC atômica
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('revoke_event_access', {
          p_event_id: eventId,
          p_user_id: userId,
        });

        if (!rpcError && rpcData?.success) {
          return {
            success: true,
            willOrphanEvent: !!rpcData.will_orphan_event,
            remainingAdmins: rpcData.remaining_admins ?? 0,
          };
        }
      } catch {
        // Fallback para delete direto
      }

      // 2. Verifica quantos admins restarão antes de deletar
      const currentCount = await this.checkEventAdminCount(eventId);
      const remainingAdmins = Math.max(0, currentCount - 1);
      const willOrphanEvent = remainingAdmins === 0;

      // Deleta da tabela public.event_admins
      const { error } = await supabase
        .from('event_admins')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Falha ao revogar acesso: ${error.message}`);
      }

      return { success: true, willOrphanEvent, remainingAdmins };
    }

    return { success: true, willOrphanEvent: false, remainingAdmins: 1 };
  },

  // Helpers de persistência local
  getLocalMockAdmins(): AdminProfile[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ADMINS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Ignora erro de JSON
    }
    return DEFAULT_MOCK_ADMINS;
  },

  saveLocalMockAdmins(admins: AdminProfile[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_ADMINS_KEY, JSON.stringify(admins));
    } catch (err) {
      console.warn('Falha ao gravar admins no localStorage:', err);
    }
  },
};

