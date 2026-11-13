import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArenaLogo } from '@/components/branding';
import { ProjectBanner } from '@/components/ui';
import { RatingSelector, VotingButton } from '@/components/voting';
import { useVoting } from '@/hooks/useVoting';
import { Lightbulb, TrendingUp, Rocket, Star, Send, AlertCircle, HelpCircle } from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  const { currentProject, currentQuestions, isSubmitting, errorMessage, submitCurrentVote, clearError } =
    useVoting();

  // Perguntas ativas ordenadas por posição
  const activeQuestions = useMemo(() => {
    if (!currentQuestions || currentQuestions.length === 0) {
      // Fallback padrão se ainda não tiver carregado
      return [
        {
          id: 'q_default_inno',
          title: 'Nível de Inovação',
          description: 'Avalia a originalidade e a inovação da solução.',
          position: 1,
          active: true,
          required: true,
          minScore: 1,
          maxScore: 5,
        },
        {
          id: 'q_default_impact',
          title: 'Impacto do Projeto na CPTM',
          description: 'Avalia a contribuição do projeto para a companhia.',
          position: 2,
          active: true,
          required: true,
          minScore: 1,
          maxScore: 5,
        },
        {
          id: 'q_default_dev',
          title: 'Salto de Desenvolvimento do Projeto',
          description: 'Avalia a evolução apresentada pelo projeto.',
          position: 3,
          active: true,
          required: true,
          minScore: 1,
          maxScore: 5,
        },
      ];
    }
    return [...currentQuestions].filter((q) => q.active).sort((a, b) => a.position - b.position);
  }, [currentQuestions]);

  // Respostas individuais mapeadas por id da pergunta
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // O formulário só está completo quando todas as perguntas ativas/obrigatórias tiverem nota de 1 a 5
  const isFormComplete = useMemo(() => {
    if (activeQuestions.length === 0) return false;
    return activeQuestions.every((q) => {
      const val = answers[q.id];
      return typeof val === 'number' && val >= 1 && val <= 5;
    });
  }, [activeQuestions, answers]);

  // Ícones rotativos para critérios
  const getCriterionIcon = (index: number) => {
    const icons = [
      <Lightbulb key="inno" className="w-4 h-4 text-arena-gold" />,
      <TrendingUp key="impact" className="w-4 h-4 text-arena-blue" />,
      <Rocket key="dev" className="w-4 h-4 text-arena-red" />,
      <Star key="star" className="w-4 h-4 text-amber-400" />,
      <HelpCircle key="help" className="w-4 h-4 text-purple-400" />,
    ];
    return icons[index % icons.length];
  };

  const handleScoreChange = (questionId: string, val: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete || isSubmitting) return;

    clearError();

    // Mapeia para o envio oficial com suporte dual (dinâmico e compatibilidade legada)
    await submitCurrentVote({
      answers,
      innovation: answers['q_default_inno'] || Object.values(answers)[0] || 3,
      impact: answers['q_default_impact'] || Object.values(answers)[1] || 3,
      development: answers['q_default_dev'] || Object.values(answers)[2] || 3,
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1 sm:py-2">
      {/* 1. Header: Logo Oficial adaptada */}
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

      {/* 2. Formulário Dinâmico de Avaliação */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-3 sm:space-y-4 my-2">
        {/* Banner do Projeto Ativo no Palco */}
        <ProjectBanner
          title={currentProject?.name || 'Projeto em Avaliação'}
          category={currentProject?.category}
          description={currentProject?.description}
          bannerUrl={currentProject?.bannerUrl}
        />

        {/* Lista Dinâmica de Critérios de Avaliação do Evento */}
        <div className="space-y-3">
          {activeQuestions.map((q, index) => (
            <RatingSelector
              key={q.id}
              id={q.id}
              title={q.title}
              description={q.description || 'Selecione uma nota de 1 a 5 para este critério.'}
              icon={getCriterionIcon(index)}
              value={answers[q.id] ?? null}
              onChange={(val) => handleScoreChange(q.id, val)}
            />
          ))}
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
              Selecione uma nota de 1 a 5 em todos os {activeQuestions.length} critérios para enviar seu voto.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default EvaluationPage;
