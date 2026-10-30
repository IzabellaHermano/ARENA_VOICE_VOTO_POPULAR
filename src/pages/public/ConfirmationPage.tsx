import React from 'react';
import { motion } from 'framer-motion';
import { ArenaLogo } from '@/components/branding';
import { ProgressIndicator, StatusMessage } from '@/components/ui';
import { useVoting } from '@/contexts/VotingContext';
import { Check, ShieldCheck } from 'lucide-react';

export const ConfirmationPage: React.FC = () => {
  const { currentProject } = useVoting();

  const projectName = currentProject?.name || 'Projeto 01';
  const order = currentProject?.order || 1;

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

      {/* 2. Central Section: Ícone Verde de Confirmação & Mensagem */}
      <div className="my-auto py-6 flex flex-col items-center space-y-5 w-full">
        {/* Glowing Green Check Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="relative flex items-center justify-center"
        >
          {/* Green outer pulse ring */}
          <div className="absolute w-32 h-32 rounded-full bg-arena-green/20 blur-xl animate-pulse-slow" />

          <div className="relative z-10 w-24 h-24 rounded-full border-2 border-arena-green bg-gradient-to-b from-[#082216] to-[#04140c] flex items-center justify-center shadow-green-glow">
            <Check className="w-12 h-12 text-arena-green stroke-[3]" />
          </div>
        </motion.div>

        {/* Mensagem Principal */}
        <div className="space-y-1.5 px-2">
          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {projectName} avaliado,<br />aguarde o próximo participante.
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Sua avaliação foi registrada de forma segura no servidor.
          </p>
        </div>

        {/* Indicador de Progresso (Passo atual marcado como concluído) */}
        <div className="pt-2">
          <ProgressIndicator currentStep={order + 1} totalSteps={4} />
        </div>
      </div>

      {/* 3. Mensagem de Agradecimento e Status */}
      <div className="w-full pb-3 sm:pb-5 space-y-3">
        <StatusMessage
          variant="success"
          message="Obrigado por participar!"
          submessage="Sua opinião impulsiona grandes ideias. Aguarde o apresentador anunciar o próximo projeto."
        />

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-arena-green" />
          <span>Voto único validado e sincronizado com o palco</span>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
