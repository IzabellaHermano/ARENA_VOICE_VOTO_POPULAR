import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArenaLogo } from '@/components/branding';
import { ProjectBanner } from '@/components/ui';
import { RatingSelector, VotingButton } from '@/components/voting';
import { Lightbulb, TrendingUp, Rocket, Send } from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  const navigate = useNavigate();

  // Estados dos três critérios oficiais (1 a 5, inicialmente nulos)
  const [inovacao, setInovacao] = useState<number | null>(null);
  const [impacto, setImpacto] = useState<number | null>(null);
  const [salto, setSalto] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // O botão AVALIAR só é habilitado quando os 3 critérios estiverem preenchidos
  const isFormComplete = inovacao !== null && impacto !== null && salto !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete) return;

    setIsSubmitting(true);

    // Na Etapa 2: transição com feedback imediato; na Etapa 5 conectará com Firestore
    setTimeout(() => {
      // Salva voto demonstrativo no sessionStorage para a tela de confirmação
      sessionStorage.setItem(
        'arena_voice_last_vote_demo',
        JSON.stringify({
          project: 'Projeto 01',
          inovacao,
          impacto,
          salto,
          timestamp: new Date().toISOString(),
        })
      );
      navigate('/confirmacao');
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1 sm:py-2">
      {/* 1. Header: Logo Oficial adaptada ao espaço */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex justify-center py-1 sm:py-2"
      >
        <ArenaLogo
          variant="complete"
          width={180}
          className="max-w-[170px] sm:max-w-[190px]"
          alt="Arena Voice"
        />
      </motion.div>

      {/* 2. Formulário de Avaliação */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-3 sm:space-y-4 my-2">
        {/* Banner do Projeto */}
        <ProjectBanner
          title="Projeto 01"
          category="Plataforma de Inovação e Eficiência"
        />

        {/* 3 Critérios Oficiais */}
        <div className="space-y-3">
          {/* Critério 1: Nível de Inovação */}
          <RatingSelector
            id="inovacao"
            title="Nível de Inovação"
            description="Avalia a originalidade e a inovação da solução."
            icon={<Lightbulb className="w-4 h-4 text-arena-gold" />}
            value={inovacao}
            onChange={(val) => setInovacao(val)}
          />

          {/* Critério 2: Impacto do Projeto na CPTM */}
          <RatingSelector
            id="impacto"
            title="Impacto do Projeto na CPTM"
            description="Avalia a contribuição do projeto para a companhia."
            icon={<TrendingUp className="w-4 h-4 text-arena-blue" />}
            value={impacto}
            onChange={(val) => setImpacto(val)}
          />

          {/* Critério 3: Salto de Desenvolvimento do Projeto */}
          <RatingSelector
            id="salto"
            title="Salto de Desenvolvimento do Projeto"
            description="Avalia a evolução apresentada pelo projeto."
            icon={<Rocket className="w-4 h-4 text-arena-red" />}
            value={salto}
            onChange={(val) => setSalto(val)}
          />
        </div>

        {/* 3. Botão AVALIAR (desabilitado até os 3 critérios estarem preenchidos) */}
        <div className="pt-2 pb-2 space-y-1.5">
          <VotingButton
            type="submit"
            disabled={!isFormComplete || isSubmitting}
            isLoading={isSubmitting}
            variant="primary"
            icon={<Send className="w-4 h-4 fill-current" />}
            className="shadow-red-glow text-sm sm:text-base py-3.5"
          >
            AVALIAR
          </VotingButton>

          {!isFormComplete && (
            <p className="text-center text-[10px] text-gray-400">
              Selecione uma nota de 1 a 5 nos 3 critérios para enviar seu voto.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default EvaluationPage;
