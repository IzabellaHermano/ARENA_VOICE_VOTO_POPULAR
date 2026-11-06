import React from 'react';
import { Eye, EyeOff, RadioTower, Sparkles } from 'lucide-react';

interface PublishResultsBannerProps {
  isPublished: boolean;
  onTogglePublish: (newStatus: boolean) => Promise<void>;
  isUpdating?: boolean;
}

export const PublishResultsBanner: React.FC<PublishResultsBannerProps> = ({
  isPublished,
  onTogglePublish,
  isUpdating = false,
}) => {
  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border transition-all ${
        isPublished
          ? 'bg-gradient-to-r from-emerald-950/40 via-arena-card to-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
          : 'bg-gradient-to-r from-amber-950/40 via-arena-card to-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
      }`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isPublished
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {isPublished ? <Eye className="w-5 h-5 animate-pulse" /> : <EyeOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  isPublished
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}
              >
                <RadioTower className="w-3 h-3" />
                {isPublished ? 'Divulgação Pública Ativa' : 'Resultados Ocultos do Público'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mt-1">
              {isPublished
                ? 'Os resultados e o pódio estão visíveis no telão e na rota pública'
                : 'O pódio oficial está bloqueado para o público — visível apenas neste painel'}
            </h3>
            <p className="text-xs text-gray-400">
              {isPublished
                ? 'O público e a audiência do telão (/resultados/telao) têm acesso em tempo real ao ranking final.'
                : 'Liberar a divulgação somente após o término de todas as apresentações e homologação da coordenação.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onTogglePublish(!isPublished)}
          disabled={isUpdating}
          className={`shrink-0 w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isPublished
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              : 'bg-gradient-to-r from-arena-red to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-neon-glow'
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isUpdating ? (
            <span>Atualizando...</span>
          ) : isPublished ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Ocultar do Telão</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Publicar Resultados no Telão</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
