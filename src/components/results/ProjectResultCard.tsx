import React from 'react';
import { ProjectScoringResult } from '@/utils/scoring';
import { Trophy, Award, Medal, Users, Lightbulb, TrendingUp, Rocket, AlertCircle } from 'lucide-react';

interface ProjectResultCardProps {
  project: ProjectScoringResult;
}

export const ProjectResultCard: React.FC<ProjectResultCardProps> = ({ project }) => {
  const getRankBadge = () => {
    if (project.rank === null) {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 text-xs font-semibold border border-gray-700">
          Sem Classificação
        </span>
      );
    }

    if (project.rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-yellow-500/30 to-amber-600/30 text-arena-gold font-extrabold text-xs border border-arena-gold/50 shadow-gold-glow">
          <Trophy className="w-3.5 h-3.5" />
          1º Lugar {project.tie && '(Empate)'}
        </span>
      );
    }
    if (project.rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-400/20 text-slate-200 font-extrabold text-xs border border-slate-400/40">
          <Award className="w-3.5 h-3.5" />
          2º Lugar {project.tie && '(Empate)'}
        </span>
      );
    }
    if (project.rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-700/20 text-amber-300 font-extrabold text-xs border border-amber-700/40">
          <Medal className="w-3.5 h-3.5" />
          3º Lugar {project.tie && '(Empate)'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 font-bold text-xs border border-white/10">
        {project.rank}º Lugar
      </span>
    );
  };

  return (
    <div
      className={`relative bg-arena-card rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
        project.rank === 1
          ? 'border-arena-gold/50 shadow-lg shadow-arena-gold/10'
          : project.rank === 2
          ? 'border-slate-400/40'
          : project.rank === 3
          ? 'border-amber-700/40'
          : 'border-arena-border hover:border-arena-blue/40'
      }`}
    >
      {/* Top Banner & Image */}
      <div className="relative h-32 sm:h-36 bg-gradient-to-b from-arena-surface to-arena-card overflow-hidden">
        {project.bannerUrl ? (
          <img
            src={project.bannerUrl}
            alt={project.name}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-arena-blue/10 via-arena-black to-arena-card">
            <span className="text-[10px] uppercase font-bold tracking-widest text-arena-blueLight opacity-70 mb-1">
              Arena Voice • Projeto #{project.order}
            </span>
            <span className="text-sm font-black text-white/90 line-clamp-1">
              {project.name}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-arena-card via-arena-card/30 to-transparent" />

        {/* Badges superiores sobrepostos */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {getRankBadge()}
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-gray-300 text-xs font-semibold border border-white/10">
          <Users className="w-3.5 h-3.5 text-arena-blue" />
          <span>{project.totalVotes} {project.totalVotes === 1 ? 'voto' : 'votos'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-base sm:text-lg font-black text-white line-clamp-1">
              {project.name}
            </h4>
          </div>
          {project.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mt-1">
              {project.description}
            </p>
          )}
        </div>

        {/* Pontuação Oficial em Destaque */}
        {project.hasEvaluations ? (
          <div className="space-y-3.5 pt-2 border-t border-arena-border/50">
            {/* Indicadores Principais em Cards Compactos */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="block text-[10px] text-gray-400 font-semibold uppercase">Média Geral</span>
                <span className="text-base sm:text-lg font-black text-white">{project.formattedGeneral}</span>
                <span className="block text-[9px] text-gray-500">escala 1-5</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="block text-[10px] text-gray-400 font-semibold uppercase">Percentual</span>
                <span className="text-base sm:text-lg font-black text-arena-blueLight">{project.formattedPercentage}</span>
                <span className="block text-[9px] text-gray-500">dos 20%</span>
              </div>
              <div className="p-2 rounded-xl bg-gradient-to-b from-arena-gold/15 to-transparent border border-arena-gold/30">
                <span className="block text-[10px] text-arena-gold font-bold uppercase">Nota Voto Pop.</span>
                <span className="text-base sm:text-lg font-black text-arena-gold">{project.formattedPoints}</span>
                <span className="block text-[9px] text-arena-gold/70">máx 20 pts</span>
              </div>
            </div>

            {/* Barras Horizontais dos Critérios (Dinâmicos ou Legados) */}
            <div className="space-y-2 pt-1 text-xs">
              {project.criteriaScores && project.criteriaScores.length > 0 ? (
                project.criteriaScores.map((c, idx) => {
                  const colors = ['bg-arena-red', 'bg-arena-blue', 'bg-emerald-400', 'bg-purple-500', 'bg-amber-400'];
                  const color = colors[idx % colors.length];
                  return (
                    <div key={c.id || c.title}>
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="flex items-center gap-1.5 text-gray-300 font-medium truncate">
                          <span className={`w-2 h-2 rounded-full ${color}`} />
                          {c.title}
                        </span>
                        <span className="font-bold text-white shrink-0">{c.formatted}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-500`}
                          style={{ width: `${((c.average || 0) / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  {/* Inovação */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                        <Lightbulb className="w-3 h-3 text-arena-red" />
                        Inovação
                      </span>
                      <span className="font-bold text-white">{project.formattedInnovation}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-arena-red transition-all duration-500"
                        style={{ width: `${((project.rawInnovation || 0) / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Impacto */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                        <TrendingUp className="w-3 h-3 text-arena-blue" />
                        Impacto CPTM
                      </span>
                      <span className="font-bold text-white">{project.formattedImpact}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-arena-blue transition-all duration-500"
                        style={{ width: `${((project.rawImpact || 0) / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Salto de Desenvolvimento */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                        <Rocket className="w-3 h-3 text-emerald-400" />
                        Salto Tecnológico
                      </span>
                      <span className="font-bold text-white">{project.formattedDevelopment}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${((project.rawDevelopment || 0) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/5 border border-dashed border-arena-border text-center space-y-1">
            <AlertCircle className="w-5 h-5 text-gray-500 mx-auto" />
            <p className="text-xs font-bold text-gray-300">Sem avaliações registradas</p>
            <p className="text-[11px] text-gray-500">
              Aguardando abertura de rodada para apuração pública.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
