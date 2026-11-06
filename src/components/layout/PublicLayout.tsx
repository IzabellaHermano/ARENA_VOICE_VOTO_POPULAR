import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoting } from '@/hooks/useVoting';
import { WifiOff, RadioTower } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const { connectionStatus } = useVoting();

  return (
    <div className="min-h-screen bg-arena-black text-white flex flex-col items-center justify-between relative overflow-x-hidden select-none">
      {/* Background Stage Atmosphere & Spotlights */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Red spotlight from upper-left */}
        <div className="absolute -top-32 -left-28 w-96 h-96 rounded-full bg-arena-red/20 blur-[100px]" />
        
        {/* Navy/Blue spotlight from upper-right */}
        <div className="absolute -top-32 -right-28 w-96 h-96 rounded-full bg-arena-blue/15 blur-[100px]" />
        
        {/* Stage floor ambiance glow */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#04060c] via-arena-navy/20 to-transparent opacity-90" />

        {/* Subtle grid pattern for stage tech feel */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Main Responsive Mobile Viewport */}
      <main className="w-full max-w-[440px] min-h-screen mx-auto flex flex-col justify-between px-4 sm:px-5 py-3 sm:py-5 relative z-10">
        {/* Barra de Conectividade em Tempo Real (Offline / Reconectando) */}
        {connectionStatus === 'offline' && (
          <div className="mb-2 p-2 rounded-xl bg-arena-red/20 border border-arena-red/40 text-arena-red text-[11px] font-bold text-center flex items-center justify-center gap-1.5 shadow-neon-glow animate-pulse">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Sem conexão com a internet • Reconectando...</span>
          </div>
        )}

        {connectionStatus === 'reconnecting' && (
          <div className="mb-2 p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 animate-pulse">
            <RadioTower className="w-3.5 h-3.5 shrink-0" />
            <span>Reconectando aos servidores da Arena Voice...</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 flex flex-col"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PublicLayout;
