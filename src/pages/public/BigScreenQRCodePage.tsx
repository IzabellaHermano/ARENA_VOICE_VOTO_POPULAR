import React, { useState } from 'react';
import { ArenaLogo, ArenaMascot } from '@/components/branding';
import { QRCodeDisplay } from '@/components/qrcode';
import { Maximize2, Minimize2, Sparkles, ShieldCheck, RadioTower } from 'lucide-react';

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
    <div className="min-h-screen bg-arena-black text-white p-6 sm:p-10 flex flex-col justify-between items-center relative overflow-hidden select-none">
      {/* Luzes de Palco da Arena (Iluminação de fundo) */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-arena-red/20 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-arena-blue/15 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-16 -right-12 opacity-10 pointer-events-none">
        <ArenaMascot variant="transparent" width={520} />
      </div>

      {/* Header com Logo Completa Oficial */}
      <header className="w-full flex items-center justify-between border-b border-arena-border/50 pb-5 z-10 max-w-6xl mx-auto">
        <ArenaLogo variant="complete" width={320} />

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/30 text-xs font-bold uppercase tracking-wider">
            <RadioTower className="w-3.5 h-3.5 animate-pulse" />
            <span>Transmissão ao Vivo</span>
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

      {/* Conteúdo Central: Título Oficial e QR Code */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8 z-10 max-w-3xl mx-auto text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-arena-gold/15 text-arena-gold border border-arena-gold/30 text-xs font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Votação Popular</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            VOTO <span className="text-arena-red">POPULAR</span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-300 max-w-xl mx-auto font-medium">
            Aponte a câmera do seu celular para escanear o QR Code e participe da avaliação em tempo real.
          </p>
        </div>

        {/* QR Code de Alto Contraste (sem sobreposição) */}
        <div className="p-2 bg-gradient-to-b from-arena-gold/30 via-transparent to-arena-red/30 rounded-[36px] shadow-gold-glow">
          <QRCodeDisplay size={260} showActions={true} />
        </div>

        {/* 3 Passos Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left pt-2">
          <div className="p-3.5 rounded-2xl bg-arena-card/80 border border-arena-border/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-arena-red/20 text-arena-red flex items-center justify-center shrink-0 font-black text-sm">
              1
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Escaneie o Código</h4>
              <p className="text-[11px] text-gray-400">Acesse instantaneamente sem cadastro ou login.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-arena-card/80 border border-arena-border/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-arena-blue/20 text-arena-blue flex items-center justify-center shrink-0 font-black text-sm">
              2
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Mantenha Aberto</h4>
              <p className="text-[11px] text-gray-400">O celular atualizará sozinho a cada nova rodada.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-arena-card/80 border border-arena-border/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-sm">
              3
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Avalie ao Vivo</h4>
              <p className="text-[11px] text-gray-400">Atribua notas de 1 a 5 para os 3 critérios oficiais.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-3 text-xs text-gray-500 border-t border-arena-border/40 z-10 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Arena Voice 2026 • Sistema de Votação Popular ao Vivo</span>
        <span className="flex items-center gap-1.5 text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Acesso único garantido por participante
        </span>
      </footer>
    </div>
  );
};

export default BigScreenQRCodePage;
