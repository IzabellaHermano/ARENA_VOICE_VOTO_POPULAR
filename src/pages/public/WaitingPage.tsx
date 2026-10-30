import React from 'react';
import { motion } from 'framer-motion';
import { ArenaLogo } from '@/components/branding';
import { WaitingAnimation, ProgressIndicator, StatusMessage } from '@/components/ui';
import { useVoting } from '@/hooks/useVoting';
import { RadioTower, AlertCircle } from 'lucide-react';

export const WaitingPage: React.FC = () => {
  const { currentProject, connectionStatus, errorMessage } = useVoting();

  const currentOrder = currentProject?.order || 1;

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
            {currentProject?.name ? (
              <span>
                Próximo participante: <strong className="text-white">{currentProject.name}</strong>
              </span>
            ) : (
              'A votação será liberada automaticamente pelo apresentador.'
            )}
          </p>
        </div>

        {/* Indicador de Progresso (4 rodadas) */}
        <div className="pt-2">
          <ProgressIndicator currentStep={currentOrder} totalSteps={4} />
        </div>
      </div>

      {/* 3. Card Informativo Inferior & Status de Sincronização */}
      <div className="w-full pb-3 sm:pb-5 space-y-3">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <StatusMessage
          variant="neutral"
          message="Em instantes um novo projeto será apresentado."
          submessage="Mantenha esta tela aberta no seu celular. A página atualiza automaticamente."
        />

        {/* Indicador de Conexão em Tempo Real */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium">
          <RadioTower className={`w-3.5 h-3.5 ${connectionStatus === 'connected' ? 'text-arena-green animate-pulse' : 'text-gray-500'}`} />
          <span>
            {connectionStatus === 'connected' ? 'Sincronizado em tempo real com o palco' : 'Conectando ao servidor...'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WaitingPage;
