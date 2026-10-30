import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import { Check } from 'lucide-react';

export const ConfirmationPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-6 text-center">
      {/* Header - Logo Completa */}
      <div className="w-full flex flex-col items-center pt-2">
        <ArenaLogo variant="complete" width={260} />
        <span className="text-xs font-bold uppercase tracking-widest text-arena-red mt-2">
          VOTO POPULAR
        </span>
      </div>

      {/* Confirmation Icon and Message */}
      <div className="my-auto flex flex-col items-center space-y-5">
        <div className="w-24 h-24 rounded-full border-2 border-arena-green/50 bg-arena-green/10 flex items-center justify-center shadow-green-glow">
          <Check className="w-12 h-12 text-arena-green stroke-[3]" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">
            Projeto 01 avaliado,<br />aguarde o próximo participante.
          </h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Obrigado por participar! Sua opinião impulsiona grandes ideias.
          </p>
        </div>

        {/* Stepper Dots */}
        <div className="flex items-center gap-2 pt-2">
          <span className="w-2.5 h-2.5 rounded-full bg-arena-green" />
          <span className="w-3 h-3 rounded-full bg-arena-red ring-4 ring-arena-red/30 animate-pulse" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
        </div>
      </div>

      {/* Bottom Link for testing */}
      <div className="w-full pb-4">
        <button
          onClick={() => navigate('/aguardando')}
          className="text-xs text-gray-400 hover:text-white underline underline-offset-4"
        >
          [Voltar à tela de espera]
        </button>
      </div>
    </div>
  );
};

export default ConfirmationPage;

