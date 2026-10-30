import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import { FolderKanban, Radio, BarChart3, Settings, LogOut, RadioTower } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Placeholder de logout para etapas posteriores
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Projetos', path: '/admin/projetos', icon: FolderKanban },
    { name: 'Rodada', path: '/admin/rodada', icon: Radio },
    { name: 'Resultados', path: '/admin/resultados', icon: BarChart3 },
    { name: 'Configurações', path: '/admin/configuracoes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-arena-dark text-white flex flex-col md:flex-row">
      {/* Sidebar - Regra: Escrita Transparente */}
      <aside className="w-full md:w-64 bg-arena-card border-r border-arena-border flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="py-3 px-2 flex items-center justify-center border-b border-arena-border/50 pb-5">
            <ArenaLogo variant="transparentText" width={180} />
          </div>

          <div className="mt-4 px-2 py-1 text-xs uppercase tracking-wider text-gray-400 font-semibold">
            Painel de Controle
          </div>

          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-arena-red text-white shadow-red-glow'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 pt-4 border-t border-arena-border/50 space-y-3">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-arena-dark/60 text-xs text-gray-300 border border-arena-border/40">
            <span className="flex items-center gap-1.5 text-arena-green">
              <RadioTower className="w-3.5 h-3.5 animate-pulse" />
              Sistema Online
            </span>
            <span className="text-[10px] text-gray-400">Etapa 1</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-arena-red transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-arena-border bg-arena-card/50 backdrop-blur-sm px-6 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-300">
            Arena Voice — Gestão em Tempo Real
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/resultados/telao"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-arena-blue/20 text-arena-blue hover:bg-arena-blue/30 px-3 py-1.5 rounded-md font-medium border border-arena-blue/40 transition-colors"
            >
              Abrir Telão
            </a>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

