import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RadioTower, Hourglass } from 'lucide-react';
import { ArenaLogo } from '@/components/branding';

export interface BigScreenWaitingNextViewProps {
  className?: string;
}

export const BigScreenWaitingNextView: React.FC<BigScreenWaitingNextViewProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`flex-1 flex flex-col justify-center items-center text-center px-4 sm:px-8 py-6 z-10 max-w-5xl mx-auto w-full relative overflow-hidden select-none ${className}`}
    >
      {/* Luzes Volumétricas de Fundo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-gradient-to-r from-arena-red/15 via-arena-gold/15 to-transparent blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="space-y-7 flex flex-col items-center max-w-3xl"
      >
        {/* Logo Oficial Reduzida */}
        <ArenaLogo
          variant="complete"
          width={300}
          className="max-w-[240px] sm:max-w-[300px] drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)]"
        />

        {/* Animação Tecnológica Futurista de Carregamento */}
        <div className="relative flex items-center justify-center my-2">
          {/* Anel Externo Giratório Dourado */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 border-dashed border-arena-gold/40"
          />

          {/* Anel Intermediário Pulsante Vermelho */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-arena-red/50 shadow-neon-glow"
          />

          {/* Núcleo Central de Pulsação de Energia */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-arena-red/30 via-[#101322] to-arena-gold/30 border border-white/20 flex items-center justify-center shadow-lg"
          >
            <Hourglass className="w-8 h-8 text-arena-gold animate-pulse" />
          </motion.div>
        </div>

        {/* Mensagem Central de Impacto */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-arena-gold/15 text-arena-gold border border-arena-gold/30 text-xs font-black uppercase tracking-widest shadow-gold-glow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TRANSIÇÃO OFICIAL</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-tight">
            AGUARDE O <span className="text-arena-red drop-shadow-[0_0_25px_rgba(242,5,36,0.6)]">PRÓXIMO PROJETO</span>
          </h1>

          <p className="text-base sm:text-xl text-gray-300 font-medium max-w-xl mx-auto leading-relaxed">
            A próxima ideia está prestes a entrar em cena.
          </p>

          <div className="pt-2">
            <span className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-arena-red/20 via-white/5 to-arena-gold/20 border border-white/15 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-xl">
              PREPARE-SE PARA CONHECER O PRÓXIMO PROJETO.
            </span>
          </div>
        </div>

        {/* Indicador de Sincronização em Tempo Real */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/50 border border-white/10 text-xs text-gray-400 font-medium">
          <RadioTower className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Sincronizado com a coordenação • O telão atualizará assim que a rodada for aberta</span>
        </div>
      </motion.div>
    </div>
  );
};

export default BigScreenWaitingNextView;

