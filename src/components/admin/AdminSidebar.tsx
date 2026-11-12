import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import {
  FolderKanban,
  Radio,
  BarChart3,
  Settings,
  LogOut,
  X,
  Users,
  ShieldCheck,
  Shield,
  UserCheck,
  Trophy,
  ArrowLeftRight,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminEvent } from '@/contexts/AdminEventContext';

export interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { adminUser, role, isSuperadmin, logout } = useAdminAuth();
  const { currentEventId, currentEvent, clearSelectedEvent } = useAdminEvent();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const navItems = [
    { name: 'Meus Eventos', path: '/admin/eventos', icon: Trophy, requiresEvent: false },
    { name: 'Projetos', path: '/admin/projetos', icon: FolderKanban, requiresEvent: true },
    { name: 'Votação', path: '/admin/votacao', icon: Radio, requiresEvent: true },
    { name: 'Resultados', path: '/admin/resultados', icon: BarChart3, requiresEvent: true },
    {
      name: 'Administradores',
      path: '/admin/usuarios',
      icon: Users,
      badge: isSuperadmin ? 'Super' : undefined,
      requiresEvent: false,
    },
    { name: 'Configurações', path: '/admin/configuracoes', icon: Settings, requiresEvent: true },
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

          {/* Card do Evento Ativo (Quando selecionado) */}
          {currentEvent && (
            <div className="mt-3 p-3 rounded-2xl bg-white/[0.03] border border-arena-border/80">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <span>Evento Selecionado</span>
                <button
                  type="button"
                  onClick={() => {
                    clearSelectedEvent();
                    onClose();
                  }}
                  className="text-arena-gold hover:text-yellow-300 flex items-center gap-1 font-mono transition-colors"
                  title="Trocar de evento"
                >
                  <ArrowLeftRight className="w-2.5 h-2.5" />
                  <span>Trocar</span>
                </button>
              </div>
              <div className="text-xs font-black text-white mt-1 truncate" title={currentEvent.name}>
                {currentEvent.name}
              </div>
            </div>
          )}

          <div className="mt-4 px-2 py-1 text-xs uppercase tracking-wider text-gray-400 font-extrabold">
            Menu de Navegação
          </div>

          {/* Navigation Links */}
          <nav className="mt-2 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isLocked = item.requiresEvent && !currentEventId;

              if (isLocked) {
                return (
                  <div
                    key={item.path}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-gray-600 cursor-not-allowed select-none opacity-50"
                    title="Selecione um evento para acessar este módulo"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span>{item.name}</span>
                    </div>
                  </div>
                );
              }

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
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-full bg-arena-gold/20 text-arena-gold border border-arena-gold/30">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer: User Profile & Logout */}
        <div className="pt-4 border-t border-arena-border/50 space-y-3">
          <div className="px-2 flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {adminUser?.name || 'Administrador'}
              </div>
              <div className="text-[10px] text-gray-400 truncate font-mono">
                {adminUser?.email}
              </div>
            </div>

            <div className="shrink-0 pl-2">
              {role === 'superadmin' ? (
                <ShieldCheck className="w-4 h-4 text-arena-gold" />
              ) : role === 'admin' ? (
                <Shield className="w-4 h-4 text-arena-blue" />
              ) : (
                <UserCheck className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-arena-red hover:bg-arena-red/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
