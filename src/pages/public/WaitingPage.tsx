import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import { Hourglass } from 'lucide-react';

export const WaitingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-6 text-center">
      {/* Header - Escrita com slogan ou completa */}
      <div className="w-full flex flex-col items-center pt-2">
        <ArenaLogo variant="textWithSlogan" width={260} />
        <span className="text-xs font-bold uppercase tracking-widest text-arena-red mt-2">
          VOTO POPULAR
        </span>
      </div>

      {/* Center Icon & Status */}
      <div className="my-auto flex flex-col items-center space-y-5">
        <div className="w-24 h-24 rounded-full border-2 border-arena-red/40 bg-arena-red/10 flex items-center justify-center shadow-red-glow">
          <Hourglass className="w-10 h-10 text-arena-red animate-pulse" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">
            Aguardando liberação<br />do próximo projeto.
          </h2>
          <p className="text-xs text-gray-400">
            Em instantes um novo projeto será apresentado.
          </p>
        </div>

        {/* Stepper dots visual indication */}
        <div className="flex items-center gap-2 pt-2">
          <span className="w-3 h-3 rounded-full bg-arena-red ring-4 ring-arena-red/30 animate-pulse" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
        </div>
      </div>

      {/* Navigation preview for test / development */}
      <div className="w-full pb-4">
        <button
          onClick={() => navigate('/avaliar')}
          className="text-xs text-gray-400 hover:text-white underline underline-offset-4"
        >
          [Etapa 1: Simular liberação de projeto]
        </button>
      </div>
    </div>
  );
};

export default WaitingPage;

