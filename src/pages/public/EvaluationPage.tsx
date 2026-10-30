import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArenaLogo } from '@/components/branding';
import { ProjectBanner } from '@/components/ui';
import { RatingSelector, VotingButton } from '@/components/voting';
import { useVoting } from '@/hooks/useVoting';
import { Lightbulb, TrendingUp, Rocket, Send, AlertCircle } from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  const { currentProject, isSubmitting, errorMessage, submitCurrentVote, clearError } = useVoting();

  // Estados dos três critérios oficiais (1 a 5, inicialmente nulos)
  const [inovacao, setInovacao] = useState<number | null>(null);
  const [impacto, setImpacto] = useState<number | null>(null);
  const [salto, setSalto] = useState<number | null>(null);

  // O botão AVALIAR só é habilitado quando os 3 critérios estiverem preenchidos
  const isFormComplete = inovacao !== null && impacto !== null && salto !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete || isSubmitting) return;

    clearError();

    await submitCurrentVote({
      innovation: inovacao,
      impact: impacto,
      development: salto,
    });
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

      {/* Alerta de Erro do Servidor */}
      {errorMessage && (
        <div className="mb-2 p-3 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Formulário de Avaliação em Tempo Real */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-3 sm:space-y-4 my-2">
        {/* Banner do Projeto Ativo no Palco */}
        <ProjectBanner
          title={currentProject?.name || 'Projeto em Avaliação'}
          category={currentProject?.description || 'Plataforma de Inovação e Eficiência'}
          bannerUrl={currentProject?.bannerUrl}
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

        {/* 3. Botão AVALIAR */}
        <div className="pt-2 pb-2 space-y-1.5">
          <VotingButton
            type="submit"
            disabled={!isFormComplete || isSubmitting}
            isLoading={isSubmitting}
            variant="primary"
            icon={<Send className="w-4 h-4 fill-current" />}
            className="shadow-red-glow text-sm sm:text-base py-3.5"
          >
            {isSubmitting ? 'REGISTRANDO NO SERVIDOR...' : 'AVALIAR'}
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
