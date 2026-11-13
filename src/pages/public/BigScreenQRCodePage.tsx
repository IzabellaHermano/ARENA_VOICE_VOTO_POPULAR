import React, { useState } from 'react';
import { ArenaLogo, ArenaMascot } from '@/components/branding';
import { BigScreenQRCodeView } from '@/components/telao';
import { Maximize2, Minimize2, RadioTower, ShieldCheck } from 'lucide-react';

export const BigScreenQRCodePage: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white p-4 sm:p-8 flex flex-col justify-between items-center relative overflow-hidden select-none">
      {/* Luzes Atmosféricas do Palco */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-arena-red/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-arena-gold/10 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-16 -right-12 opacity-10 pointer-events-none">
        <ArenaMascot variant="transparent" width={520} />
      </div>

      {/* Header Oficial */}
      <header className="w-full flex items-center justify-between border-b border-white/10 pb-4 z-10 max-w-6xl mx-auto">
        <ArenaLogo variant="complete" width={300} />

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/30 text-xs font-bold uppercase tracking-wider">
            <RadioTower className="w-3.5 h-3.5 animate-pulse" />
            <span>Transmissão Oficial</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
            title="Alternar Tela Cheia (16:9)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Conteúdo Central: Nova Visualização Escura e Elegante do QR Code */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 z-10 w-full">
        <BigScreenQRCodeView size={260} />
      </main>

      {/* Footer Minimalista */}
      <footer className="w-full text-center py-3 text-xs text-gray-500 border-t border-white/10 z-10 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Arena Voice • Sistema de Votação Popular ao Vivo</span>
        <span className="flex items-center gap-1.5 text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Acesso único garantido por participante
        </span>
      </footer>
    </div>
  );
};

export default BigScreenQRCodePage;
