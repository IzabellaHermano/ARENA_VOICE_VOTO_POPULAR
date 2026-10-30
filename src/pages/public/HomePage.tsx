import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import { Play, Users, Award, TrendingUp } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-6 text-center">
      {/* Top Brand - Logo Completa */}
      <div className="w-full flex justify-center pt-4">
        <ArenaLogo variant="complete" width={320} className="drop-shadow-lg" />
      </div>

      {/* Main Callout */}
      <div className="my-8 space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          VOTO <span className="text-arena-red">POPULAR</span>
        </h1>
        <p className="text-gray-300 text-sm sm:text-base max-w-xs mx-auto">
          O público avalia os projetos ao vivo.
        </p>
        <p className="text-xs italic text-gray-400 font-serif">
          &ldquo;Mais que um voto. É uma virada de futuro.&rdquo;
        </p>

        {/* Feature Pills */}
        <div className="grid grid-cols-3 gap-2 pt-4">
          <div className="bg-arena-card/80 border border-arena-border rounded-lg p-2.5 flex flex-col items-center">
            <Users className="w-5 h-5 text-arena-red mb-1" />
            <span className="text-[10px] uppercase font-bold text-gray-300">Sua Opinião</span>
            <span className="text-[9px] text-gray-400">Faz a diferença</span>
          </div>
          <div className="bg-arena-card/80 border border-arena-border rounded-lg p-2.5 flex flex-col items-center">
            <Award className="w-5 h-5 text-arena-gold mb-1" />
            <span className="text-[10px] uppercase font-bold text-gray-300">Projetos</span>
            <span className="text-[9px] text-gray-400">Reais ao vivo</span>
          </div>
          <div className="bg-arena-card/80 border border-arena-border rounded-lg p-2.5 flex flex-col items-center">
            <TrendingUp className="w-5 h-5 text-arena-blue mb-1" />
            <span className="text-[10px] uppercase font-bold text-gray-300">Inovação</span>
            <span className="text-[9px] text-gray-400">Em movimento</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="w-full pb-6 space-y-3">
        <button
          onClick={() => navigate('/votar')}
          className="w-full bg-arena-red hover:bg-arena-redHover text-white font-bold py-3.5 px-6 rounded-xl shadow-red-glow flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>ENTRAR PARA VOTAR</span>
        </button>

        <p className="text-[11px] text-gray-400">
          Acesso rápido sem cadastro • Avaliação em tempo real
        </p>
      </div>
    </div>
  );
};

export default HomePage;

