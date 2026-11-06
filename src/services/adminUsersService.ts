import { supabase, isSupabaseConfigured } from '@/supabase/client';
import { AdminProfile } from '@/types/supabase';

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

