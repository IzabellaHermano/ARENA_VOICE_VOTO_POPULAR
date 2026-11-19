import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '@/supabase/client';
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

export interface UserEventAssignmentInput {
  eventId: string;
  role: 'admin' | 'operator';
}

export const AdminUsersService = {
  /**
   * Lista todos os administradores cadastrados diretamente no banco de dados Supabase
   */
  async listAdmins(): Promise<AdminProfile[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

    const { data, error } = await supabase
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao consultar admin_profiles no Supabase:', error.message);
      throw new Error(`Falha ao listar usuários administrativos: ${error.message}`);
    }

    return (data || []) as AdminProfile[];
  },

  /**
   * Cadastra novo usuário administrativo real no Supabase Auth e persiste perfil em admin_profiles.
   * Utiliza um cliente isolado para o signUp para não interferir na sessão ativa do Superadmin.
   */
  async createAdmin(payload: CreateAdminPayload): Promise<AdminProfile> {
    const trimmedEmail = payload.email.trim().toLowerCase();
    const trimmedName = payload.name.trim();

    if (!trimmedName || !trimmedEmail) {
      throw new Error('Nome completo e e-mail institucional são obrigatórios.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

    // 1. Verifica se já existe perfil com este e-mail em admin_profiles
    const { data: existingProfiles, error: checkError } = await supabase
      .from('admin_profiles')
      .select('id, email')
      .eq('email', trimmedEmail);

    if (checkError) {
      console.warn('Aviso ao consultar perfis existentes:', checkError.message);
    } else if (existingProfiles && existingProfiles.length > 0) {
      throw new Error(`O e-mail "${trimmedEmail}" já está cadastrado para outro administrador.`);
    }

    // 2. Criação isolada da conta em auth.users
    const isolatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const initialPassword = payload.password?.trim() || 'ArenaVoice@2025';
    if (initialPassword.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }

    const { data: authData, error: authError } = await isolatedClient.auth.signUp({
      email: trimmedEmail,
      password: initialPassword,
      options: {
        data: {
          name: trimmedName,
          role: payload.role,
        },
      },
    });

    if (authError) {
      if (
        authError.message.toLowerCase().includes('already registered') ||
        authError.message.toLowerCase().includes('already exists')
      ) {
        throw new Error(`O e-mail "${trimmedEmail}" já está cadastrado no sistema de autenticação.`);
      }
      throw new Error(`Falha ao criar credenciais no Supabase Auth: ${authError.message}`);
    }

    // Se o Supabase Auth retornar usuário sem identities, o e-mail já existe
    if (!authData?.user || (authData.user.identities && authData.user.identities.length === 0)) {
      throw new Error(`O e-mail "${trimmedEmail}" já está cadastrado no sistema.`);
    }

    const newUserId = authData.user.id;

    // 3. Persistência do perfil em public.admin_profiles via RPC segura (SECURITY DEFINER)
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_manage_profile', {
      p_action: 'create',
      p_user_id: newUserId,
      p_name: trimmedName,
      p_email: trimmedEmail,
      p_role: payload.role,
      p_active: payload.active !== undefined ? payload.active : true,
    });

    if (rpcError) {
      console.error('Falha na RPC admin_manage_profile:', rpcError);
      // Tenta fallback com inserção direta em admin_profiles caso a RPC falhe
      const { data: inserted, error: insertError } = await supabase
        .from('admin_profiles')
        .insert({
          id: newUserId,
          name: trimmedName,
          email: trimmedEmail,
          role: payload.role,
          active: payload.active !== undefined ? payload.active : true,
        })
        .select('*')
        .single();

      if (insertError) {
        throw new Error(`Falha ao registrar perfil administrativo: ${insertError.message}`);
      }

      return inserted as AdminProfile;
    }

    if (rpcData && (rpcData as any).user) {
      return (rpcData as any).user as AdminProfile;
    }

    return {
      id: newUserId,
      name: trimmedName,
      email: trimmedEmail,
      role: payload.role,
      active: payload.active !== undefined ? payload.active : true,
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Atualiza perfil de um administrador
   */
  async updateAdmin(userId: string, payload: UpdateAdminPayload): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

    // 1. Tenta atualizar via RPC admin_manage_profile
    const { error: rpcError } = await supabase.rpc('admin_manage_profile', {
      p_action: 'update',
      p_user_id: userId,
      p_name: payload.name?.trim(),
      p_role: payload.role,
      p_active: payload.active,
    });

    if (!rpcError) return;

    // 2. Fallback via update direto na tabela admin_profiles
    const updateFields: any = { updated_at: new Date().toISOString() };
    if (payload.name) updateFields.name = payload.name.trim();
    if (payload.role) updateFields.role = payload.role;
    if (payload.active !== undefined) updateFields.active = payload.active;

    const { error: dbError } = await supabase
      .from('admin_profiles')
      .update(updateFields)
      .eq('id', userId);

    if (dbError) {
      throw new Error(`Falha ao atualizar dados do administrador: ${dbError.message}`);
    }
  },

  /**
   * Alterna situação de ativação de um administrador
   */
  async toggleActive(userId: string, currentActive: boolean): Promise<boolean> {
    const nextActive = !currentActive;

    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

    // 1. Tenta via RPC admin_manage_profile
    const { error: rpcError } = await supabase.rpc('admin_manage_profile', {
      p_action: 'toggle_active',
      p_user_id: userId,
      p_active: nextActive,
    });

    if (!rpcError) return nextActive;

    // 2. Fallback direto
    const { error } = await supabase
      .from('admin_profiles')
      .update({ active: nextActive, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      throw new Error(`Falha ao alterar situação do administrador: ${error.message}`);
    }

    return nextActive;
  },

  /**
   * Exclui um administrador e remove seus vínculos
   */
  async deleteAdmin(userId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

    // 1. Tenta via RPC admin_manage_profile
    const { error: rpcError } = await supabase.rpc('admin_manage_profile', {
      p_action: 'delete',
      p_user_id: userId,
    });

    if (!rpcError) return;

    // 2. Fallback direto: remove vínculos em event_admins e depois perfil
    await supabase.from('event_admins').delete().eq('user_id', userId);

    const { error } = await supabase
      .from('admin_profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new Error(`Falha ao excluir perfil do administrador: ${error.message}`);
    }
  },

  // =========================================================================
  // GESTÃO DE VÍNCULOS: ADMINISTRADOR × EVENTO (public.event_admins)
  // =========================================================================

  /**
   * Consulta os vínculos de administradores aos eventos com suporte ao papel individual
   * Se userId for passado, filtra apenas os vínculos daquele administrador
   */
  async listEventAdmins(userId?: string): Promise<EventAdminAssignment[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      let data: any[] | null = null;
      let error: any = null;

      let query = supabase.from('event_admins').select('id, event_id, user_id, granted_by, created_at, role');
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const res = await query;
      data = res.data;
      error = res.error;

      // Se a coluna role ainda não existir na tabela (aguardando patch SQL)
      if (error && error.message.includes('role')) {
        let fallbackQuery = supabase.from('event_admins').select('id, event_id, user_id, granted_by, created_at');
        if (userId) {
          fallbackQuery = fallbackQuery.eq('user_id', userId);
        }
        const fallbackRes = await fallbackQuery;
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
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
        role: (row.role === 'admin' ? 'admin' : 'operator') as 'admin' | 'operator',
        grantedBy: row.granted_by,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('Exceção ao listar event_admins:', err);
      return [];
    }
  },

  /**
   * Conta quantos superadmins ativos existem no sistema
   * Usado para impedir remoção ou desativação acidental do último superadmin
   */
  async checkSuperadminCount(): Promise<number> {
    if (!isSupabaseConfigured) return 1;

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

    return 1;
  },

  /**
   * Conta quantos administradores/operadores estão vinculados a um evento
   */
  async checkEventAdminCount(eventId: string): Promise<number> {
    if (!isSupabaseConfigured) return 0;

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

    return 0;
  },

  /**
   * Concede ou atualiza acesso de um usuário a um evento com papel ('admin' ou 'operator')
   */
  async grantEventAccess(
    eventId: string,
    userId: string,
    role: 'admin' | 'operator' = 'operator'
  ): Promise<{ success: boolean; assignmentId?: string }> {
    if (!eventId || !userId) {
      throw new Error('ID do evento e ID do usuário são obrigatórios.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const grantedBy = currentUser?.id || null;

    // 1. Tenta inserir/atualizar com a coluna role
    try {
      const { data, error } = await supabase
        .from('event_admins')
        .upsert(
          {
            event_id: eventId,
            user_id: userId,
            role,
            granted_by: grantedBy,
          },
          { onConflict: 'event_id,user_id' }
        )
        .select('id')
        .single();

      if (!error) {
        return { success: true, assignmentId: data?.id };
      }

      // Se der erro de coluna role não encontrada, tenta sem a coluna role
      if (error.message.includes('role')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('event_admins')
          .upsert(
            {
              event_id: eventId,
              user_id: userId,
              granted_by: grantedBy,
            },
            { onConflict: 'event_id,user_id' }
          )
          .select('id')
          .single();

        if (fallbackError) {
          // Tenta via RPC legada grant_event_access
          const { data: rpcData, error: rpcError } = await supabase.rpc('grant_event_access', {
            p_event_id: eventId,
            p_user_id: userId,
          });
          if (!rpcError && rpcData?.success) {
            return { success: true, assignmentId: rpcData.assignment_id };
          }
          throw new Error(`Falha ao conceder acesso: ${fallbackError.message}`);
        }

        return { success: true, assignmentId: fallbackData?.id };
      }

      throw new Error(`Falha ao conceder acesso: ${error.message}`);
    } catch (err: any) {
      throw new Error(`Falha ao conceder acesso ao evento: ${err.message}`);
    }
  },

  /**
   * Atualiza o papel de um usuário em um determinado evento
   */
  async updateEventRole(
    eventId: string,
    userId: string,
    role: 'admin' | 'operator'
  ): Promise<void> {
    if (!eventId || !userId) {
      throw new Error('ID do evento e ID do usuário são obrigatórios.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

    const { error } = await supabase
      .from('event_admins')
      .update({ role })
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Falha ao atualizar papel no evento: ${error.message}`);
    }
  },

  /**
   * Sincroniza em lote todos os acessos de eventos de um usuário
   */
  async syncUserEventAccess(
    userId: string,
    assignments: UserEventAssignmentInput[]
  ): Promise<void> {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

    // 1. Tenta via RPC sync_admin_event_access
    try {
      const payload = assignments.map((a) => ({
        event_id: a.eventId,
        role: a.role,
      }));

      const { data: rpcData, error: rpcError } = await supabase.rpc('sync_admin_event_access', {
        p_user_id: userId,
        p_assignments: payload,
      });

      if (!rpcError && rpcData?.success) {
        return;
      }
    } catch {
      // Continua para o fallback direto
    }

    // 2. Fallback direto: remove vínculos anteriores e insere os novos
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const grantedBy = currentUser?.id || null;

    await supabase.from('event_admins').delete().eq('user_id', userId);

    if (assignments.length > 0) {
      const rows = assignments.map((a) => ({
        event_id: a.eventId,
        user_id: userId,
        role: a.role,
        granted_by: grantedBy,
      }));

      const { error: insertError } = await supabase.from('event_admins').insert(rows);
      if (insertError) {
        // Se a coluna role não existir, insere sem role
        if (insertError.message.includes('role')) {
          const rowsFallback = assignments.map((a) => ({
            event_id: a.eventId,
            user_id: userId,
            granted_by: grantedBy,
          }));
          const { error: fbErr } = await supabase.from('event_admins').insert(rowsFallback);
          if (fbErr) {
            throw new Error(`Falha ao sincronizar vínculos com eventos: ${fbErr.message}`);
          }
          return;
        }
        throw new Error(`Falha ao sincronizar vínculos com eventos: ${insertError.message}`);
      }
    }
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

    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado.');
    }

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
  },
};

export default AdminUsersService;
