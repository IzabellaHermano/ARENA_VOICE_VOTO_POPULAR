import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Radio, QrCode } from 'lucide-react';
import { ArenaLogo } from '@/components/branding';
import { QRCodeSVG } from 'qrcode.react';
import { getPublicVotingUrl } from '@/utils/url';

export interface BigScreenWelcomeViewProps {
  className?: string;
  onOpenQRCode?: () => void;
}

export const BigScreenWelcomeView: React.FC<BigScreenWelcomeViewProps> = ({
  className = '',
  onOpenQRCode,
}) => {
  const votingUrl = getPublicVotingUrl();

  return (
    <div
      className={`flex-1 flex flex-col justify-center items-center text-center px-4 sm:px-8 py-6 z-10 max-w-6xl mx-auto w-full relative overflow-hidden select-none ${className}`}
    >
      {/* Luzes Volumétricas de Palco (Iluminação de Fundo Cinematográfica) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-arena-red/15 via-arena-gold/10 to-arena-blue/15 blur-[160px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6 sm:space-y-8 flex flex-col items-center max-w-4xl"
      >
        {/* Logo Oficial com Animação Fluida */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-arena-red/20 via-arena-gold/20 to-transparent blur-2xl rounded-full opacity-60" />
          <ArenaLogo
            variant="complete"
            width={380}
            className="relative z-10 max-w-[280px] sm:max-w-[380px] drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)]"
          />
        </div>

        {/* Badge Slogan de Abertura */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/15 backdrop-blur-md text-xs sm:text-sm font-black tracking-widest uppercase text-gray-200 shadow-lg"
        >
          <Sparkles className="w-4 h-4 text-arena-gold animate-pulse" />
          <span>IDEIAS QUE VIRAM FUTURO</span>
        </motion.div>

        {/* Título de Boas-Vindas */}
        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
          >
            SEJAM{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-arena-gold via-yellow-200 to-arena-goldLight drop-shadow-[0_0_35px_rgba(255,196,0,0.5)]">
              BEM-VINDOS!
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-base sm:text-xl lg:text-2xl text-gray-200 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Prepare-se para conhecer projetos que podem transformar o futuro.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-xs sm:text-sm text-gray-400 font-normal max-w-xl mx-auto leading-relaxed pt-1"
          >
            A inovação começa com uma ideia. A transformação acontece quando todos participam.
          </motion.p>
        </div>

        {/* Badge de Aguardando Início & Mini Card de Conexão Rápida */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.7 }}
          className="flex flex-col sm:flex-row items-center gap-4 pt-2"
        >
          {/* Status Pulsante */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs sm:text-sm font-bold uppercase tracking-wider shadow-neon-glow">
            <Radio className="w-4 h-4 text-arena-red animate-pulse" />
            <span>Aguardando Início das Apresentações no Palco</span>
          </div>

          {/* Mini Chamada para Conectar no Celular */}
          <div
            onClick={onOpenQRCode}
            className="cursor-pointer group flex items-center gap-3 px-4 py-2 rounded-2xl bg-gradient-to-r from-white/5 to-white/10 border border-white/15 hover:border-arena-gold/50 transition-all shadow-md"
            title="Acessar QR Code da Votação"
          >
            <div className="p-1 bg-white rounded-lg group-hover:scale-105 transition-transform">
              <QRCodeSVG
                value={votingUrl}
                size={32}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#050810"
              />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-white block group-hover:text-arena-gold transition-colors flex items-center gap-1">
                <QrCode className="w-3 h-3 text-arena-gold" />
                <span>Prepare seu celular</span>
              </span>
              <span className="text-[10px] text-gray-400">Escaneie para entrar na arena</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default BigScreenWelcomeView;

