import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArenaLogo } from '@/components/branding';
import { WaitingAnimation, ProgressIndicator, StatusMessage } from '@/components/ui';
import { Play } from 'lucide-react';

export const WaitingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col justify-between items-center text-center py-2 sm:py-4">
      {/* 1. Header: Logo Oficial Completa & VOTO POPULAR */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex flex-col items-center pt-2"
      >
        <ArenaLogo
          variant="complete"
          width={250}
          className="max-w-[230px] sm:max-w-[260px]"
          alt="Arena Voice"
        />
        <h2 className="text-xs sm:text-sm font-black tracking-widest text-arena-red uppercase mt-1 drop-shadow-[0_0_12px_rgba(242,5,36,0.6)]">
          VOTO POPULAR
        </h2>
      </motion.div>

      {/* 2. Central Section: Ampulheta com Brilho Vermelho & Mensagem */}
      <div className="my-auto py-6 flex flex-col items-center space-y-5 w-full">
        <WaitingAnimation />

        <div className="space-y-1.5 px-2">
          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
            Aguardando liberação<br />do próximo projeto.
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            A votação será liberada automaticamente pelo apresentador.
          </p>
        </div>

        {/* Indicador de Progresso (4 rodadas) */}
        <div className="pt-2">
          <ProgressIndicator currentStep={1} totalSteps={4} />
        </div>
      </div>

      {/* 3. Card Informativo Inferior & Ação de Demonstração */}
      <div className="w-full pb-3 sm:pb-5 space-y-3">
        <StatusMessage
          variant="neutral"
          message="Em instantes um novo projeto será apresentado."
          submessage="Mantenha esta tela aberta no seu celular."
        />

        {/* Demonstração para testes da Etapa 2 */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => navigate('/avaliar')}
            className="w-full text-xs text-gray-400 hover:text-white py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Play className="w-3 h-3 text-arena-red fill-current" />
            <span>[Simular Liberação de Projeto — Demonstração Etapa 2]</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitingPage;
