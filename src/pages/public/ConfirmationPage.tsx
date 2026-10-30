import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArenaLogo } from '@/components/branding';
import { ProgressIndicator, StatusMessage } from '@/components/ui';
import { Check, RotateCcw } from 'lucide-react';

export const ConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const [evaluatedProject, setEvaluatedProject] = useState('Projeto 01');

  useEffect(() => {
    // Recupera dados do voto demonstrativo se disponível
    const saved = sessionStorage.getItem('arena_voice_last_vote_demo');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.project) setEvaluatedProject(parsed.project);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

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
            {evaluatedProject} avaliado,<br />aguarde o próximo participante.
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Sua avaliação foi registrada no fluxo desta rodada.
          </p>
        </div>

        {/* Indicador de Progresso (Passo 1 concluído, aguardando passo 2) */}
        <div className="pt-2">
          <ProgressIndicator currentStep={2} totalSteps={4} />
        </div>
      </div>

      {/* 3. Mensagem de Agradecimento e Ação Demonstrativa */}
      <div className="w-full pb-3 sm:pb-5 space-y-3">
        <StatusMessage
          variant="success"
          message="Obrigado por participar!"
          submessage="Sua opinião impulsiona grandes ideias."
        />

        {/* Ação de simulação/teste para a Etapa 2 */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => navigate('/aguardando')}
            className="w-full text-xs text-gray-400 hover:text-white py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-arena-blue" />
            <span>[Aguardar Próxima Rodada — Demonstração Etapa 2]</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
