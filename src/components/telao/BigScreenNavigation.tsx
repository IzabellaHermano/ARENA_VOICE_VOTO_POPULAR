import React from 'react';
import { Layers, QrCode, Radio } from 'lucide-react';

export type BigScreenMode = 'auto' | 'qrcode' | 'live';

export interface BigScreenNavigationProps {
  currentMode: BigScreenMode;
  onModeChange: (mode: BigScreenMode) => void;
  autoSubStateLabel?: string;
  className?: string;
}

export const BigScreenNavigation: React.FC<BigScreenNavigationProps> = ({
  currentMode,
  onModeChange,
  autoSubStateLabel,
  className = '',
}) => {
  return (
    <nav
      aria-label="Controle de visualização do telão"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all ${className}`}
    >
      <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-black/85 backdrop-blur-lg border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
        {/* Opção 1: Modo Automático */}
        <button
          type="button"
          onClick={() => onModeChange('auto')}
          className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold transition-all ${
            currentMode === 'auto'
              ? 'bg-gradient-to-r from-arena-red via-red-600 to-arena-red text-white shadow-neon-glow'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="Apresenta automaticamente as telas conforme o estado do evento"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Modo Automático</span>
          {currentMode === 'auto' && autoSubStateLabel && (
            <span className="hidden md:inline-block text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-mono text-arena-gold">
              {autoSubStateLabel}
            </span>
          )}
        </button>

        {/* Opção 2: QR Code */}
        <button
          type="button"
          onClick={() => onModeChange('qrcode')}
          className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold transition-all ${
            currentMode === 'qrcode'
              ? 'bg-gradient-to-r from-arena-gold via-yellow-400 to-amber-500 text-black shadow-gold-glow font-black'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="Exibe a tela de acesso com o QR Code estilizado"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR Code</span>
        </button>

        {/* Opção 3: Rodada ao Vivo */}
        <button
          type="button"
          onClick={() => onModeChange('live')}
          className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold transition-all ${
            currentMode === 'live'
              ? 'bg-gradient-to-r from-arena-blue via-cyan-400 to-blue-500 text-black font-black shadow-blue-glow'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="Exibe a apresentação do projeto atual e estado da votação"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Rodada ao Vivo</span>
        </button>
      </div>
    </nav>
  );
};

export default BigScreenNavigation;
