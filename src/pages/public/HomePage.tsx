import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArenaLogo } from '@/components/branding';
import { VotingButton } from '@/components/voting';
import { Users, Star, TrendingUp, Play } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleStartVoting = () => {
    navigate('/aguardando');
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center text-center py-2 sm:py-4">
      {/* 1. Header: Logo Oficial Completa */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full flex justify-center pt-2 sm:pt-4"
      >
        <ArenaLogo
          variant="complete"
          width={300}
          className="max-w-[280px] sm:max-w-[320px] drop-shadow-2xl"
          alt="Arena Voice — Ideias que viram futuro"
        />
      </motion.div>

      {/* 2. Main Hero Section */}
      <div className="my-auto py-4 sm:py-6 w-full flex flex-col items-center space-y-4">
        {/* Title: VOTO POPULAR */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
            VOTO <span className="text-arena-red drop-shadow-[0_0_20px_rgba(242,5,36,0.8)]">POPULAR</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-200 font-medium">
            O público avalia os projetos ao vivo.
          </p>
        </div>

        {/* Cursive handwritten phrase from reference */}
        <div className="pt-1 pb-2">
          <p className="font-handwriting text-xl sm:text-2xl text-gray-300 transform -rotate-1 select-none">
            &ldquo;Mais que um voto. É uma virada de futuro.&rdquo;
          </p>
        </div>

        {/* 3 Indicators */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full pt-1">
          {/* Indicador 1 */}
          <div className="bg-arena-card/90 border border-arena-border rounded-xl p-2.5 flex flex-col items-center justify-center shadow-md">
            <div className="w-8 h-8 rounded-lg bg-arena-red/15 flex items-center justify-center text-arena-red mb-1.5 shadow-red-glow">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-gray-200 leading-tight">
              Sua Opinião
            </span>
            <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">
              Faz a diferença
            </span>
          </div>

          {/* Indicador 2 */}
          <div className="bg-arena-card/90 border border-arena-border rounded-xl p-2.5 flex flex-col items-center justify-center shadow-md">
            <div className="w-8 h-8 rounded-lg bg-arena-gold/15 flex items-center justify-center text-arena-gold mb-1.5 shadow-yellow-glow">
              <Star className="w-4 h-4 fill-arena-gold" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-gray-200 leading-tight">
              Projetos
            </span>
            <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">
              Reais
            </span>
          </div>

          {/* Indicador 3 */}
          <div className="bg-arena-card/90 border border-arena-border rounded-xl p-2.5 flex flex-col items-center justify-center shadow-md">
            <div className="w-8 h-8 rounded-lg bg-arena-blue/15 flex items-center justify-center text-arena-blue mb-1.5 shadow-blue-glow">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-gray-200 leading-tight">
              Inovação
            </span>
            <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">
              Em movimento
            </span>
          </div>
        </div>
      </div>

      {/* 3. CTA Action Button */}
      <div className="w-full pb-3 sm:pb-5 space-y-2.5">
        <VotingButton
          variant="primary"
          onClick={handleStartVoting}
          icon={<Play className="w-5 h-5 fill-current" />}
          className="shadow-red-glow-lg text-sm sm:text-base py-4"
        >
          ENTRAR PARA VOTAR
        </VotingButton>

        <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
          Acesso instantâneo • Voto anônimo pelo celular
        </p>
      </div>
    </div>
  );
};

export default HomePage;
