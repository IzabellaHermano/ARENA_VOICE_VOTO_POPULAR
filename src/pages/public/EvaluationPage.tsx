import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import { Send, Lightbulb, TrendingUp, Rocket } from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  const navigate = useNavigate();

  const [inovacao, setInovacao] = useState<number>(4);
  const [impacto, setImpacto] = useState<number>(5);
  const [salto, setSalto] = useState<number>(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/confirmacao');
  };

  const renderRatingButtons = (
    value: number,
    onChange: (val: number) => void
  ) => (
    <div className="flex justify-between items-center gap-1.5 mt-2">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            value === num
              ? 'bg-arena-red text-white shadow-red-glow scale-105'
              : 'bg-arena-card border border-arena-border text-gray-300 hover:bg-white/10'
          }`}
        >
          {num}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-4">
      {/* Header - Logo completa em versão compacta */}
      <div className="w-full flex justify-center py-2">
        <ArenaLogo variant="complete" width={190} />
      </div>

      <form onSubmit={handleSubmit} className="w-full flex-1 flex flex-col justify-between max-w-sm">
        {/* Project Card */}
        <div className="bg-arena-card border border-arena-border rounded-xl overflow-hidden mb-4">
          <div className="h-24 bg-gradient-to-r from-gray-800 to-gray-700 flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-300">
            Banner do Projeto
          </div>
          <div className="p-3 text-center">
            <h3 className="text-base font-bold text-white">Projeto 01</h3>
          </div>
        </div>

        {/* Criteria Sliders / Buttons */}
        <div className="space-y-4 mb-4">
          {/* Critério 1: Inovação */}
          <div className="bg-arena-card/80 border border-arena-border/80 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
              <Lightbulb className="w-4 h-4 text-arena-gold" />
              <span>Nível de Inovação</span>
            </div>
            {renderRatingButtons(inovacao, setInovacao)}
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
              <span>1 - Baixo</span>
              <span>5 - Muito bom</span>
            </div>
          </div>

          {/* Critério 2: Impacto na CPTM */}
          <div className="bg-arena-card/80 border border-arena-border/80 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
              <TrendingUp className="w-4 h-4 text-arena-blue" />
              <span>Impacto do Projeto na CPTM</span>
            </div>
            {renderRatingButtons(impacto, setImpacto)}
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
              <span>1 - Baixo</span>
              <span>5 - Muito bom</span>
            </div>
          </div>

          {/* Critério 3: Salto de Desenvolvimento */}
          <div className="bg-arena-card/80 border border-arena-border/80 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
              <Rocket className="w-4 h-4 text-arena-red" />
              <span>Salto de Desenvolvimento do Projeto</span>
            </div>
            {renderRatingButtons(salto, setSalto)}
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
              <span>1 - Baixo</span>
              <span>5 - Muito bom</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-arena-red hover:bg-arena-redHover text-white font-bold py-3 px-6 rounded-xl shadow-red-glow flex items-center justify-center gap-2 transition-all"
        >
          <Send className="w-4 h-4 fill-current" />
          <span>AVALIAR</span>
        </button>
      </form>
    </div>
  );
};

export default EvaluationPage;

