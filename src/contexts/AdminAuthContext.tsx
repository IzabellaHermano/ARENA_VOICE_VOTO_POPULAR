import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthService, AdminAuthResult } from '@/services/authService';

export interface AdminUserData {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'operator';
  active: boolean;
}

export interface AdminAuthContextType {
  adminUser: AdminUserData | null;
  role: 'superadmin' | 'admin' | 'operator' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperadmin: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  canManageUsers: boolean;
  canManageProjects: boolean;
  canControlRounds: boolean;
  login: (email: string, pass: string) => Promise<AdminAuthResult>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getAdminSession();
      if (session) {
        // Extrai nome do localStorage ou email
        const stored =
          sessionStorage.getItem('arena_voice_admin_token') ||
          localStorage.getItem('arena_voice_admin_token');
        let userName = 'Administrador';
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.name) userName = parsed.name;
          } catch {}
        }

        setAdminUser({
          id: session.user.id,
          uid: session.user.uid,
          email: session.user.email || '',
          name: userName,
          role: session.role,
          active: true,
        });
      } else {
        setAdminUser(null);
      }
    } catch (err) {
      console.warn('Erro ao restaurar sessão de administrador:', err);
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, pass: string): Promise<AdminAuthResult> => {
    setIsLoading(true);
    try {
      const result = await AuthService.signInAdmin(email, pass);

      const sessionObj = {
        uid: result.user.uid,
        email: result.user.email || email.trim(),
        role: result.role,
        loginTime: new Date().toISOString(),
        name: email.split('@')[0],
      };

      sessionStorage.setItem('arena_voice_admin_token', JSON.stringify(sessionObj));
      localStorage.setItem('arena_voice_admin_token', JSON.stringify(sessionObj));

      setAdminUser({
        id: result.user.id,
        uid: result.user.uid,
        email: result.user.email || email.trim(),
        name: sessionObj.name,
        role: result.role,
        active: true,
      });

      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AuthService.signOut();
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    await AuthService.resetPassword(email);
  };

  const role = adminUser?.role || null;
  const isSuperadmin = role === 'superadmin';
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isOperator = role === 'operator';

  const canManageUsers = isSuperadmin;
  const canManageProjects = isSuperadmin || role === 'admin';
  const canControlRounds = isSuperadmin || role === 'admin';

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        role,
        isAuthenticated: !!adminUser,
        isLoading,
        isSuperadmin,
        isAdmin,
        isOperator,
        canManageUsers,
        canManageProjects,
        canControlRounds,
        login,
        logout,
        sendPasswordReset,
        refreshSession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth deve ser utilizado dentro de um AdminAuthProvider.');
  }
  return context;
};

