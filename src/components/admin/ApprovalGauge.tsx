import React, { useMemo } from 'react';
import { ApprovalStats } from '@/utils/approvalCalculator';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  Sparkles,
  Lock,
} from 'lucide-react';

export interface ApprovalGaugeProps {
  stats: ApprovalStats;
  projectName?: string;
  projectCategory?: string;
  roundStatus?: 'aguardando' | 'aberta' | 'encerrada';
  className?: string;
  compact?: boolean;
}

export const ApprovalGauge: React.FC<ApprovalGaugeProps> = ({
  stats,
  projectName,
  projectCategory,
  roundStatus = 'aberta',
  className = '',
  compact = false,
}) => {
  const {
    totalVotes,
    positiveVotes,
    neutralVotes,
    negativeVotes,
    averageGeneral,
    scalePercent,
    indicator, // 0 a 100%
    tendencyLabel,
    tendencyColor,
  } = stats;

  const isClosed = roundStatus === 'encerrada';
  const isOpen = roundStatus === 'aberta';
  const hasVotes = totalVotes > 0;

  // Formatação com vírgula padrão brasileiro e sinal explícito
  const formattedAverage = hasVotes ? averageGeneral.toFixed(2).replace('.', ',') : '—';
  const formattedScale = useMemo(() => {
    if (!hasVotes) return '0%';
    const rounded = Math.round(scalePercent * 10) / 10;
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}%`.replace('.', ',');
  }, [hasVotes, scalePercent]);

  // Percentuais de cada categoria
  const posPct = hasVotes ? Math.round((positiveVotes / totalVotes) * 100) : 0;
  const neuPct = hasVotes ? Math.round((neutralVotes / totalVotes) * 100) : 0;
  const negPct = hasVotes ? Math.round((negativeVotes / totalVotes) * 100) : 0;

  return (
    <div
      className={`bg-gradient-to-b from-[#11131F] via-[#0B0C14] to-[#07080D] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Iluminação Ambiente Sofisticada Arena Voice */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-36 bg-arena-red/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-arena-blue/5 rounded-full blur-[100px] pointer-events-none" />

      {/* 1. Header do Indicador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4 z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-arena-gold mb-1">
            <Sparkles className="w-3 h-3 text-arena-gold" />
            <span>Indicador Horizontal de Aprovação ao Vivo</span>
          </div>

          <h3 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
            <span>{projectName || 'Projeto em Votação'}</span>
            {projectCategory && (
              <span className="text-xs font-bold text-gray-400 hidden sm:inline">
                • {projectCategory}
              </span>
            )}
          </h3>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {isOpen ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs font-black uppercase tracking-wider shadow-neon-glow">
              <span className="w-2 h-2 rounded-full bg-arena-red animate-ping" />
              <span>Votação em Tempo Real</span>
            </div>
          ) : isClosed ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/5 border border-white/15 text-gray-300 text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-arena-gold" />
              <span>Resultado Consolidado</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">
              <span>Aguardando Liberação</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Telemetria Digital: Média e Tendência */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 my-2 z-10">
        <div className="space-y-0.5">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 block">
            Média Geral das Avaliações
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
              {formattedAverage}
            </span>
            <span className="text-sm font-bold text-gray-400 uppercase">/ 5,00</span>
          </div>
        </div>

        {/* Badge de Escala e Tendência */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border text-xs sm:text-sm font-black uppercase tracking-wider shadow-md ${
              tendencyColor === 'green'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : tendencyColor === 'red'
                ? 'bg-rose-950/70 text-rose-300 border-rose-500/40 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                tendencyColor === 'green'
                  ? 'bg-emerald-400 animate-pulse'
                  : tendencyColor === 'red'
                  ? 'bg-rose-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span>
              {hasVotes ? `${formattedScale} — ${tendencyLabel}` : 'AGUARDANDO PRIMEIROS VOTOS'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Linha Horizontal Tecnológica com Marcador Deslizante Cromado */}
      <div className="relative py-6 my-2 z-10 select-none">
        {/* Trilho Metálico Principal */}
        <div className="relative w-full h-4 bg-[#141824] rounded-full border border-slate-700/80 shadow-inner overflow-visible">
          {/* Sub-trilho Esquerdo: Rubi Arena Voice (-100% a 0%) */}
          <div
            className="absolute top-0 bottom-0 left-0 w-1/2 rounded-l-full bg-gradient-to-r from-[#7F1D1D] to-[#991B1B] opacity-75"
          />

          {/* Sub-trilho Direito: Esmeralda Tecnológico (0% a +100%) */}
          <div
            className="absolute top-0 bottom-0 left-1/2 w-1/2 rounded-r-full bg-gradient-to-r from-[#065F46] to-[#059669] opacity-75"
          />

          {/* Divisor Central de Platina e Ouro (0% / Equilíbrio) */}
          <div className="absolute top-[-4px] bottom-[-4px] left-1/2 -translate-x-1/2 w-[3px] bg-gradient-to-b from-[#FEF08A] via-[#F59E0B] to-[#FEF08A] shadow-[0_0_8px_rgba(245,158,11,0.8)] z-10" />

          {/* MARCADOR METÁLICO ILUMINADO DESLIZANTE */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
            style={{
              left: `${indicator}%`,
              transition: 'left 1.2s cubic-bezier(0.34, 1.35, 0.64, 1)',
            }}
          >
            {/* Haste Vertical de Precisão */}
            <div className="relative flex flex-col items-center">
              {/* Cabeça do Cursor: Anel Cromado com Centro em Rubi/Ouro */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white via-slate-300 to-slate-600 border-2 border-white shadow-[0_0_16px_rgba(255,255,255,0.7)] flex items-center justify-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    tendencyColor === 'green'
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                      : tendencyColor === 'red'
                      ? 'bg-arena-red shadow-[0_0_8px_rgba(227,6,19,0.9)]'
                      : 'bg-arena-gold shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                  }`}
                />
              </div>

              {/* Indicador Triangular Apontando para o Trilho */}
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white -mt-0.5" />
            </div>
          </div>
        </div>

        {/* Graduações e Rótulos Abaixo do Trilho */}
        <div className="relative w-full flex items-center justify-between text-[10px] font-mono mt-3 text-gray-400">
          {/* -100% REJEIÇÃO */}
          <div className="flex flex-col items-start text-left">
            <span className="font-black text-rose-400">-100%</span>
            <span className="text-[9px] font-bold text-rose-500/80 tracking-wider uppercase">Rejeição</span>
          </div>

          {/* -50% */}
          <div className="hidden sm:flex flex-col items-center -ml-6">
            <span className="font-bold text-gray-400">-50%</span>
            <span className="w-1 h-1 rounded-full bg-gray-600 mt-0.5" />
          </div>

          {/* 0% EQUILÍBRIO */}
          <div className="flex flex-col items-center text-center">
            <span className="font-black text-arena-gold font-mono">0%</span>
            <span className="text-[9px] font-black text-arena-gold tracking-widest uppercase">Equilíbrio</span>
          </div>

          {/* +50% */}
          <div className="hidden sm:flex flex-col items-center -mr-6">
            <span className="font-bold text-gray-400">+50%</span>
            <span className="w-1 h-1 rounded-full bg-gray-600 mt-0.5" />
          </div>

          {/* +100% APROVAÇÃO */}
          <div className="flex flex-col items-end text-right">
            <span className="font-black text-emerald-400">+100%</span>
            <span className="text-[9px] font-bold text-emerald-400/80 tracking-wider uppercase">Aprovação</span>
          </div>
        </div>
      </div>

      {/* 4. Grid de Cartões de Sentimento Auditados */}
      {!compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-3 pt-4 border-t border-white/10 z-10">
          {/* Card Total de Votos */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Válido
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              {totalVotes}
            </div>
            <span className="text-[10px] text-gray-500 font-medium">100% auditado</span>
          </div>

          {/* Card Votos Positivos */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Positivos (&gt;3)
              </span>
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300 mt-1">
              {positiveVotes}
            </div>
            <span className="text-[10px] text-emerald-400/80 font-bold font-mono">
              {posPct}% do total
            </span>
          </div>

          {/* Card Votos Neutros */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Neutros (=3)
              </span>
              <Minus className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-200 mt-1">
              {neutralVotes}
            </div>
            <span className="text-[10px] text-amber-300/80 font-bold font-mono">
              {neuPct}% do total
            </span>
          </div>

          {/* Card Votos Negativos */}
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Negativos (&lt;3)
              </span>
              <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-300 mt-1">
              {negativeVotes}
            </div>
            <span className="text-[10px] text-rose-400/80 font-bold font-mono">
              {negPct}% do total
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalGauge;
