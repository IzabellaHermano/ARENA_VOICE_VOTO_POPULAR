import { supabase, isSupabaseConfigured } from '@/supabase/client';

export interface AppUser {
  id: string;
  uid: string;
  email?: string;
  is_anonymous?: boolean;
}

export interface AdminAuthResult {
  user: AppUser;
  role: 'superadmin' | 'admin' | 'operator';
  isAdmin: boolean;
}

export const AuthService = {
  /**
   * Garante a sessão anônima do público (passos 1 a 3 do fluxo)
   * Utiliza Supabase Anonymous Auth com persistência em localStorage.
   */
  async ensureAnonymousUser(): Promise<AppUser> {
    if (isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          const u = sessionData.session.user;
          return {
            id: u.id,
            uid: u.id,
            email: u.email,
            is_anonymous: u.is_anonymous ?? true,
          };
        }

        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        if (data.user) {
          return {
            id: data.user.id,
            uid: data.user.id,
            email: data.user.email,
            is_anonymous: true,
          };
        }
      } catch (err) {
        console.warn('Supabase Auth online indisponível, utilizando fallback local:', err);
      }
    }

    // Fallback de UID persistente local para desenvolvimento sem servidor
    let fallbackUid = localStorage.getItem('arena_voice_voter_fallback_uid');
    if (!fallbackUid) {
      fallbackUid = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('arena_voice_voter_fallback_uid', fallbackUid);
    }

    return {
      id: fallbackUid,
      uid: fallbackUid,
      is_anonymous: true,
    };
  },

  /**
   * Autenticação administrativa com validação rigorosa de admin_profiles no Supabase
   */
  async signInAdmin(email: string, pass: string): Promise<AdminAuthResult> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        throw new Error(error.message || 'Falha ao autenticar com as credenciais informadas.');
      }

      if (!data.user) {
        throw new Error('Usuário não localizado após autenticação.');
      }

      // Consulta se o usuário possui registro ativo na tabela admin_profiles
      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('id, name, email, role, active')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || !profile.active) {
        await supabase.auth.signOut();
        throw new Error(
          'Acesso negado: Este e-mail não possui perfil administrativo ativo cadastrado no sistema.'
        );
      }

      return {
        user: {
          id: data.user.id,
          uid: data.user.id,
          email: data.user.email,
          is_anonymous: false,
        },
        role: profile.role,
        isAdmin: true,
      };
    }

    // Modo de demonstração / fallback local quando o Supabase não estiver configurado
    await new Promise((resolve) => setTimeout(resolve, 600));
    const demoUser: AppUser = {
      id: 'admin_demo_id',
      uid: 'admin_demo_id',
      email: email.trim(),
      is_anonymous: false,
    };

    return {
      user: demoUser,
      role: 'admin',
      isAdmin: true,
    };
  },

  /**
   * Realiza logout do usuário ativo
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Erro ao desconectar do Supabase Auth:', err);
      }
    }
    sessionStorage.removeItem('arena_voice_admin_token');
    localStorage.removeItem('arena_voice_admin_token');
  },

  /**
   * Solicita redefinição de senha por e-mail via Supabase Auth
   */
  async resetPassword(email: string): Promise<void> {
    const trimmed = email.trim().toLowerCase();
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) {
        throw new Error(`Falha ao enviar instruções de recuperação: ${error.message}`);
      }
      return;
    }

    // Fallback simulado
    await new Promise((resolve) => setTimeout(resolve, 500));
  },

  /**
   * Recupera a sessão administrativa atual validada
   */
  async getAdminSession(): Promise<AdminAuthResult | null> {
    // 1. Tenta verificar sessão no Supabase Auth
    if (isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (user && !user.is_anonymous) {
          const { data: profile } = await supabase
            .from('admin_profiles')
            .select('id, name, email, role, active')
            .eq('id', user.id)
            .single();

          if (profile && profile.active) {
            return {
              user: {
                id: user.id,
                uid: user.id,
                email: user.email,
                is_anonymous: false,
              },
              role: profile.role,
              isAdmin: true,
            };
          } else if (profile && !profile.active) {
            await this.signOut();
            return null;
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar sessão administrativa remota:', err);
      }
    }

    // 2. Fallback de sessão armazenada no navegador (sessionStorage / localStorage)
    const stored =
      sessionStorage.getItem('arena_voice_admin_token') ||
      localStorage.getItem('arena_voice_admin_token');

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.uid && parsed.role) {
          return {
            user: {
              id: parsed.uid,
              uid: parsed.uid,
              email: parsed.email,
              is_anonymous: false,
            },
            role: parsed.role,
            isAdmin: true,
          };
        }
      } catch {
        // Ignora JSON corrompido
      }
    }

    return null;
  },

  /**
   * Retorna o usuário atualmente autenticado ou null
   */
  async getCurrentUser(): Promise<AppUser | null> {
    if (isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const u = data.session.user;
        return {
          id: u.id,
          uid: u.id,
          email: u.email,
          is_anonymous: u.is_anonymous ?? true,
        };
      }
    }
    return null;
  },

  /**
   * Observador do estado de autenticação via Supabase
   */
  onAuthStateChange(callback: (user: AppUser | null) => void) {
    if (!isSupabaseConfigured) {
      return { unsubscribe: () => {} };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          uid: session.user.id,
          email: session.user.email,
          is_anonymous: session.user.is_anonymous ?? true,
        });
      } else {
        callback(null);
      }
    });

    return {
      unsubscribe: () => listener.subscription.unsubscribe(),
    };
  },
};

export default AuthService;
