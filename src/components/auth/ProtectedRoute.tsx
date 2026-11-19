import React from 'react';
import { Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ArenaLogo } from '@/components/branding';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { AdminActionButton } from '@/components/admin';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: 'superadmin' | 'admin' | 'operator';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, isLoading, role } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Loading state institucional
  if (isLoading) {
    return (
      <div className="min-h-screen bg-arena-black text-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <ArenaLogo variant="complete" width={220} className="opacity-80 animate-pulse" />
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin text-arena-red" />
            <span>Validando permissões de acesso...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Não autenticado -> Redireciona para login na raiz (/)
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 3. Validação de Nível de Acesso (RBAC)
  if (requiredRole === 'superadmin' && role !== 'superadmin') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-arena-card border border-arena-border rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-arena-red/15 border border-arena-red/30 flex items-center justify-center text-arena-red mb-4 shadow-red-glow">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">
            Acesso Restrito ao Superadministrador
          </h2>

          <p className="text-xs sm:text-sm text-gray-400 mb-6 leading-relaxed">
            Seu perfil atual (<span className="text-white font-bold uppercase">{role}</span>) não possui permissão para acessar este módulo administrativo do sistema.
          </p>

          <AdminActionButton
            variant="secondary"
            onClick={() => navigate('/admin/eventos')}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="w-full py-3"
          >
            Voltar aos Meus Eventos
          </AdminActionButton>
        </div>
      </div>
    );
  }

  if (requiredRole === 'admin' && role !== 'superadmin' && role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-arena-card border border-arena-border rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-arena-red/15 border border-arena-red/30 flex items-center justify-center text-arena-red mb-4 shadow-red-glow">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">
            Acesso Restrito ao Administrador
          </h2>

          <p className="text-xs sm:text-sm text-gray-400 mb-6 leading-relaxed">
            Seu perfil atual (<span className="text-white font-bold uppercase">{role}</span>) possui nível operacional. A criação e alteração deste módulo são exclusivas de Administradores.
          </p>

          <AdminActionButton
            variant="secondary"
            onClick={() => navigate('/admin/votacao')}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="w-full py-3"
          >
            Ir para Controle de Votação
          </AdminActionButton>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;

