import React from 'react';
import { Menu, ExternalLink, Trophy, ShieldCheck, Shield, UserCheck } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export interface AdminHeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleSidebar,
  title = 'Arena Voice — Gestão em Tempo Real',
}) => {
  const { adminUser, role } = useAdminAuth();

  return (
    <header className="h-16 border-b border-arena-border bg-arena-card/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Toggle Menu button on small screens */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-2">
            <span>{title}</span>
            <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-arena-blue/15 text-arena-blue border border-arena-blue/30">
              Voto Popular
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Telão Shortcut */}
        <a
          href="/resultados/telao"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-arena-gold/15 text-arena-gold border border-arena-gold/40 hover:bg-arena-gold/25 transition-all shadow-yellow-glow"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exibir Telão</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* Dynamic Admin Profile Badge */}
        {role && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-arena-black border border-arena-border text-xs text-gray-300">
            {role === 'superadmin' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-arena-gold" />
                <span className="font-semibold text-arena-gold">Superadmin</span>
              </>
            ) : role === 'admin' ? (
              <>
                <Shield className="w-3.5 h-3.5 text-arena-blue" />
                <span className="font-semibold text-arena-blue">Admin</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-gray-300">Operador</span>
              </>
            )}
            {adminUser?.name && (
              <span className="text-[11px] text-gray-400 pl-1 border-l border-gray-700">
                {adminUser.name}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default AdminHeader;
