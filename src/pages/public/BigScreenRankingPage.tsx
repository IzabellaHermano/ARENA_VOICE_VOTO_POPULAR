import React from 'react';
import { ArenaLogo, ArenaMascot } from '@/components/branding';
import { Trophy, Award } from 'lucide-react';

export const BigScreenRankingPage: React.FC = () => {
  const rankingData = [
    { place: 1, name: 'Projeto 03', score: '4,6', color: 'from-amber-500 to-yellow-600', height: 'h-64', border: 'border-amber-400' },
    { place: 2, name: 'Projeto 01', score: '4,3', color: 'from-slate-400 to-slate-600', height: 'h-52', border: 'border-slate-300' },
    { place: 3, name: 'Projeto 02', score: '3,9', color: 'from-amber-700 to-amber-900', height: 'h-44', border: 'border-amber-600' },
    { place: 4, name: 'Projeto 04', score: '3,7', color: 'from-gray-700 to-gray-800', height: 'h-36', border: 'border-gray-600' },
  ];

  return (
    <div className="min-h-screen bg-arena-dark text-white p-6 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative Mascot in background corner */}
      <div className="absolute -bottom-16 -right-10 opacity-10 pointer-events-none select-none">
        <ArenaMascot variant="transparent" width={480} />
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-arena-border/60 pb-4 relative z-10">
        <ArenaLogo variant="complete" width={320} />
        <div className="text-center md:text-right">
          <div className="inline-block bg-arena-red/20 border border-arena-red/40 px-3 py-1 rounded-full text-arena-red text-xs font-bold uppercase tracking-wider mb-1">
            Resultado Final da Avaliação do Público
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            VOTO <span className="text-arena-red">POPULAR</span>
          </h1>
          <p className="text-xs italic text-gray-400 font-serif">
            Grandes ideias também nascem do público.
          </p>
        </div>
      </header>

      {/* Podium Visualization */}
      <main className="flex-1 flex items-end justify-center gap-4 md:gap-8 py-10 relative z-10">
        {/* 2º Lugar */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-slate-300 text-black font-extrabold flex items-center justify-center text-sm shadow-md mb-2">
            2º
          </div>
          <div className="text-center mb-2">
            <h4 className="font-bold text-sm md:text-base text-gray-200">{rankingData[1].name}</h4>
            <span className="text-xl md:text-2xl font-black text-white">{rankingData[1].score}</span>
            <div className="text-[10px] text-gray-400 uppercase font-semibold">Média Geral</div>
          </div>
          <div className={`w-28 md:w-44 ${rankingData[1].height} bg-gradient-to-t ${rankingData[1].color} rounded-t-2xl border-t-2 ${rankingData[1].border} shadow-lg flex items-center justify-center`}>
            <Award className="w-8 h-8 text-slate-200 opacity-60" />
          </div>
        </div>

        {/* 1º Lugar */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-arena-gold text-black font-extrabold flex items-center justify-center text-lg shadow-gold-glow mb-2 animate-bounce">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="text-center mb-2">
            <h4 className="font-bold text-base md:text-lg text-arena-goldLight">{rankingData[0].name}</h4>
            <span className="text-2xl md:text-4xl font-black text-arena-gold">{rankingData[0].score}</span>
            <div className="text-[11px] text-gray-300 uppercase font-bold tracking-wider">Média Geral</div>
          </div>
          <div className={`w-32 md:w-52 ${rankingData[0].height} bg-gradient-to-t ${rankingData[0].color} rounded-t-2xl border-t-4 ${rankingData[0].border} shadow-gold-glow flex items-center justify-center`}>
            <Trophy className="w-12 h-12 text-yellow-100 opacity-70" />
          </div>
        </div>

        {/* 3º Lugar */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md mb-2">
            3º
          </div>
          <div className="text-center mb-2">
            <h4 className="font-bold text-sm md:text-base text-gray-200">{rankingData[2].name}</h4>
            <span className="text-xl md:text-2xl font-black text-white">{rankingData[2].score}</span>
            <div className="text-[10px] text-gray-400 uppercase font-semibold">Média Geral</div>
          </div>
          <div className={`w-28 md:w-44 ${rankingData[2].height} bg-gradient-to-t ${rankingData[2].color} rounded-t-2xl border-t-2 ${rankingData[2].border} shadow-lg flex items-center justify-center`}>
            <Award className="w-8 h-8 text-amber-200 opacity-60" />
          </div>
        </div>

        {/* 4º Lugar */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 font-extrabold flex items-center justify-center text-xs shadow-md mb-2">
            4º
          </div>
          <div className="text-center mb-2">
            <h4 className="font-bold text-xs md:text-sm text-gray-400">{rankingData[3].name}</h4>
            <span className="text-lg md:text-xl font-bold text-gray-300">{rankingData[3].score}</span>
            <div className="text-[9px] text-gray-400 uppercase">Média Geral</div>
          </div>
          <div className={`w-24 md:w-36 ${rankingData[3].height} bg-gradient-to-t ${rankingData[3].color} rounded-t-2xl border-t-2 ${rankingData[3].border} shadow-md flex items-center justify-center`}>
            <span className="text-xs text-gray-500 font-bold">Arena Voice</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-xs text-gray-500 border-t border-arena-border/40 relative z-10">
        Arena Voice — Voto Popular • Exibição em Telão ao Vivo
      </footer>
    </div>
  );
};

export default BigScreenRankingPage;

