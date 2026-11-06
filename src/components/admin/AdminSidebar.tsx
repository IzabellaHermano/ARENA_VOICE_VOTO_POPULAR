import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import {
  FolderKanban,
  Radio,
  BarChart3,
  Settings,
  LogOut,
  RadioTower,
  X,
  Users,
  ShieldCheck,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { adminUser, role, isSuperadmin, logout } = useAdminAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const navItems = [
    { name: 'Projetos', path: '/admin/projetos', icon: FolderKanban },
    { name: 'Votação', path: '/admin/votacao', icon: Radio },
    { name: 'Resultados', path: '/admin/resultados', icon: BarChart3 },
    {
      name: 'Administradores',
      path: '/admin/usuarios',
      icon: Users,
      badge: isSuperadmin ? 'Super' : undefined,
    },
    { name: 'Configurações', path: '/admin/configuracoes', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-arena-card border-r border-arena-border flex flex-col justify-between p-4 shrink-0 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Header - Escrita Transparente Oficial */}
          <div className="py-2 px-2 flex items-center justify-between border-b border-arena-border/50 pb-5">
            <div className="flex-1 flex justify-center">
              <ArenaLogo variant="transparentText" width={175} />
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 px-2 py-1 text-xs uppercase tracking-wider text-gray-400 font-extrabold">
            Painel de Controle
          </div>

          {/* Navigation Links */}
          <nav className="mt-2 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-arena-red text-white shadow-red-glow border border-red-500/50'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-arena-gold/20 text-arena-gold border border-arena-gold/40 font-black">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Area: Usuário logado, Conexão e Logout */}
        <div className="mt-6 pt-4 border-t border-arena-border/50 space-y-3">
          {/* Perfil do Administrador Logado */}
          {adminUser && (
            <div className="px-3 py-2.5 rounded-xl bg-arena-black/70 border border-arena-border flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-arena-red/20 border border-arena-red/30 flex items-center justify-center text-arena-red font-bold text-xs shrink-0">
                  {adminUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate">{adminUser.name}</div>
                  <div className="text-[10px] text-gray-400 capitalize flex items-center gap-1">
                    {role === 'superadmin' ? (
                      <ShieldCheck className="w-3 h-3 text-arena-gold" />
                    ) : role === 'admin' ? (
                      <Shield className="w-3 h-3 text-arena-blue" />
                    ) : (
                      <UserCheck className="w-3 h-3 text-gray-400" />
                    )}
                    <span>{role}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-arena-red rounded-lg hover:bg-white/5 transition-colors"
                title="Desconectar do painel"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Indicador de Conexão */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-arena-black border border-arena-border text-xs text-gray-300 shadow-inner">
            <span className="flex items-center gap-2 text-arena-green font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-arena-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-arena-green" />
              </span>
              <RadioTower className="w-3.5 h-3.5 text-arena-green" />
              Sistema Online
            </span>
            <span className="text-[10px] font-mono text-gray-400">Tempo Real</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
