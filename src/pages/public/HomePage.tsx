import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArenaLogo } from '@/components/branding';
import { VotingButton } from '@/components/voting';
import { useVoting } from '@/hooks/useVoting';
import { EventService } from '@/services/eventService';
import { EventDocument } from '@/types';
import { Users, Star, TrendingUp, Play, Loader2, Sparkles, X, ChevronRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRound, hasVotedCurrentProject, isLoading } = useVoting();
  const [activeEvents, setActiveEvents] = useState<EventDocument[]>([]);
  const [showEventSelector, setShowEventSelector] = useState(false);

  useEffect(() => {
    EventService.listEvents()
      .then((all) => {
        const active = all.filter((e) => e.status === 'active');
        setActiveEvents(active);
      })
      .catch(console.warn);
  }, []);

  const handleStartVoting = () => {
    if (activeEvents.length > 1) {
      setShowEventSelector(true);
      return;
    }
    if (activeEvents.length === 1) {
      navigate(`/votar/${activeEvents[0].id}`);
      return;
    }
    if (currentRound?.status === 'open') {
      if (hasVotedCurrentProject) {
        navigate('/confirmacao');
      } else {
        navigate('/avaliar');
      }
    } else {
      navigate('/aguardando');
    }
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
          isLoading={isLoading}
          icon={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
          className="shadow-red-glow-lg text-sm sm:text-base py-4"
        >
          ENTRAR PARA VOTAR
        </VotingButton>

        <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
          Acesso instantâneo • Voto anônimo pelo celular
        </p>
      </div>

      {/* Modal / Seletor de Eventos Ao Vivo */}
      <AnimatePresence>
        {showEventSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-arena-card border border-arena-border rounded-2xl p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-arena-gold" />
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    Selecione o Evento
                  </h3>
                </div>
                <button
                  onClick={() => setShowEventSelector(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-300">
                Há múltiplos eventos acontecendo ao mesmo tempo. Escolha a votação do evento que você está acompanhando:
              </p>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {activeEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => {
                      setShowEventSelector(false);
                      navigate(`/votar/${ev.id}`);
                    }}
                    className="w-full p-4 rounded-xl bg-black/50 hover:bg-arena-red/15 border border-white/10 hover:border-arena-red/40 transition-all flex items-center justify-between group text-left"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-arena-red transition-colors">
                        {ev.name}
                      </h4>
                      {ev.description && (
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                          {ev.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-arena-red transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
