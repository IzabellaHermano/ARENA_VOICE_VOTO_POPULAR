import React, { useMemo } from 'react';
import { ApprovalStats } from '@/utils/approvalCalculator';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  Sparkles,
  RadioTower,
  Lock,
} from 'lucide-react';

export interface ApprovalGaugeProps {
  stats: ApprovalStats;
  projectName?: string;
  projectCategory?: string;
  roundStatus?: 'aguardando' | 'aberta' | 'encerrada';
  className?: string;
}

// Configuração dos 5 segmentos do semicírculo (baseado na referência visual CPTM/Arena)
const SEGMENTS = [
  {
    startDeg: 180,
    endDeg: 144,
    color: '#EF4444', // Vermelho (Rejeição / Negativo)
    glow: 'rgba(239, 68, 68, 0.4)',
    label: 'Negativo',
  },
  {
    startDeg: 144,
    endDeg: 108,
    color: '#F97316', // Laranja (Levemente Negativo)
    glow: 'rgba(249, 115, 22, 0.4)',
    label: 'Abaixo da Média',
  },
  {
    startDeg: 108,
    endDeg: 72,
    color: '#FACC15', // Amarelo/Dourado (Neutro / Equilíbrio)
    glow: 'rgba(250, 204, 21, 0.4)',
    label: 'Neutro (Nota 3)',
  },
  {
    startDeg: 72,
    endDeg: 36,
    color: '#84CC16', // Verde Claro (Levemente Positivo)
    glow: 'rgba(132, 204, 22, 0.4)',
    label: 'Favorável',
  },
  {
    startDeg: 36,
    endDeg: 0,
    color: '#22C55E', // Verde Esmeralda (Forte Aprovação)
    glow: 'rgba(34, 197, 94, 0.4)',
    label: 'Excelente',
  },
];

// Helper para converter graus em coordenadas cartesianas SVG
function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy - radius * Math.sin(angleInRadians),
  };
}

// Gera o path SVG para cada fatia do donut semicircular com pequeno espaçamento
function describeDonutSlice(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
  gapAngle = 1.0
) {
  const adjStart = startAngle - gapAngle / 2;
  const adjEnd = endAngle + gapAngle / 2;

  const p1 = polarToCartesian(cx, cy, outerRadius, adjStart);
  const p2 = polarToCartesian(cx, cy, outerRadius, adjEnd);
  const p3 = polarToCartesian(cx, cy, innerRadius, adjEnd);
  const p4 = polarToCartesian(cx, cy, innerRadius, adjStart);

  return `M ${p1.x} ${p1.y} A ${outerRadius} ${outerRadius} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerRadius} ${innerRadius} 0 0 0 ${p4.x} ${p4.y} Z`;
}

export const ApprovalGauge: React.FC<ApprovalGaugeProps> = ({
  stats,
  projectName = 'Projeto em Votação',
  projectCategory,
  roundStatus = 'aberta',
  className = '',
}) => {
  const {
    totalVotes,
    positiveVotes,
    neutralVotes,
    negativeVotes,
    approvalBalance,
    indicator,
    needleAngle,
    tendencyLabel,
    tendencyColor,
  } = stats;

  const isClosed = roundStatus === 'encerrada';
  const isOpen = roundStatus === 'aberta';

  // Dimensões do SVG do Medidor
  const cx = 170;
  const cy = 160;
  const outerR = 135;
  const innerR = 85;

  // Paths pré-calculados das 5 faixas coloridas
  const segmentPaths = useMemo(() => {
    return SEGMENTS.map((seg) => ({
      ...seg,
      path: describeDonutSlice(cx, cy, outerR, innerR, seg.startDeg, seg.endDeg, 1.2),
    }));
  }, [cx, cy, outerR, innerR]);

  // Formatação do Saldo de Aprovação com sinal (+ ou -)
  const formattedBalance = useMemo(() => {
    if (totalVotes === 0) return '0%';
    const pct = Math.round(approvalBalance * 100);
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  }, [approvalBalance, totalVotes]);

  return (
    <div
      className={`bg-arena-card border border-arena-border rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Luz ambiente de fundo no topo do medidor */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-36 bg-gradient-to-b from-arena-gold/15 via-arena-blue/10 to-transparent blur-3xl pointer-events-none" />

      {/* 1. Header do Medidor: Identificação do Projeto e Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-arena-border/60 pb-4 mb-4 z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-arena-gold mb-1">
            <Sparkles className="w-3 h-3 text-arena-gold" />
            <span>Ponteiro Dinâmico de Aprovação</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <span>{projectName}</span>
            {projectCategory && (
              <span className="text-xs font-semibold text-arena-blue hidden sm:inline">
                • {projectCategory}
              </span>
            )}
          </h3>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {isOpen ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arena-green/15 border border-arena-green/40 text-arena-green text-xs font-bold shadow-green-glow">
              <span className="w-2 h-2 rounded-full bg-arena-green animate-ping" />
              <span>Votação em Tempo Real</span>
            </div>
          ) : isClosed ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800/80 border border-gray-600 text-gray-300 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-arena-gold" />
              <span>Votação Encerrada (Resultado Final)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">
              <RadioTower className="w-3.5 h-3.5 text-gray-400" />
              <span>Aguardando Liberação da Rodada</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Medidor Semicircular com Ponteiro Analógico Moderno */}
      <div className="relative flex flex-col items-center justify-center my-1 z-10 select-none">
        <svg
          viewBox="0 0 340 190"
          className="w-full max-w-[340px] h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
        >
          <defs>
            {/* Gradiente Dourado Metálico do Ponteiro */}
            <linearGradient id="needleGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>

            {/* Gradiente Prata Metálico do Hub Central */}
            <radialGradient id="hubMetallicGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#1E293B" />
            </radialGradient>

            {/* Filtro de Sombra Suave para o Ponteiro */}
            <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Arco Escuro de Fundo (Trilho) */}
          <path
            d={describeDonutSlice(cx, cy, outerR + 2, innerR - 2, 180, 0, 0)}
            fill="#0B111E"
            stroke="#1E293B"
            strokeWidth="1.5"
          />

          {/* 5 Fatias Coloridas do Semicírculo */}
          {segmentPaths.map((seg, idx) => (
            <path
              key={idx}
              d={seg.path}
              fill={seg.color}
              stroke="#070C16"
              strokeWidth="2"
              className="transition-opacity duration-300 hover:opacity-90"
            />
          ))}

          {/* Marcadores de Escala (Ticks) */}
          {/* -100% (Esquerda extrema) */}
          <line x1="32" y1="160" x2="20" y2="160" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="14" y="174" fill="#EF4444" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="monospace">
            -100%
          </text>

          {/* 0% (Centro vertical) */}
          <line x1="170" y1="23" x2="170" y2="12" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" />
          <text x="170" y="8" fill="#FACC15" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="monospace">
            EQUILÍBRIO
          </text>

          {/* +100% (Direita extrema) */}
          <line x1="308" y1="160" x2="320" y2="160" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
          <text x="326" y="174" fill="#22C55E" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="monospace">
            +100%
          </text>

          {/* Ponteiro / Agulha Indicadora com Rotação em Torno do Pivot (cx, cy) */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'transform 0.7s cubic-bezier(0.34, 1.4, 0.64, 1)',
            }}
            filter="url(#needleShadow)"
          >
            {/* Lâmina da Agulha (Tapered Pointer) */}
            <polygon
              points={`
                ${cx - 5},${cy - 12}
                ${cx - 1.5},${cy - 128}
                ${cx},${cy - 132}
                ${cx + 1.5},${cy - 128}
                ${cx + 5},${cy - 12}
              `}
              fill="url(#needleGoldGradient)"
              stroke="#0A0F1D"
              strokeWidth="1.2"
            />

            {/* Linha Central de Destaque da Agulha */}
            <line x1={cx} y1={cy - 128} x2={cx} y2={cy - 15} stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />

            {/* Base Circular do Ponteiro */}
            <circle cx={cx} cy={cy} r="16" fill="url(#needleGoldGradient)" stroke="#050811" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="10" fill="url(#hubMetallicGradient)" stroke="#0F172A" strokeWidth="1" />
            <circle cx={cx} cy={cy} r="4" fill="#FFFFFF" />
          </g>
        </svg>

        {/* Display Central do Indicador Numérico */}
        <div className="mt-[-8px] flex flex-col items-center text-center space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight drop-shadow-md">
              {totalVotes === 0 ? '--' : `${indicator.toFixed(0)}%`}
            </span>
            {totalVotes > 0 && (
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                  approvalBalance > 0
                    ? 'bg-arena-green/20 text-arena-green border-arena-green/40 shadow-green-glow'
                    : approvalBalance === 0
                    ? 'bg-arena-gold/20 text-arena-gold border-arena-gold/40'
                    : 'bg-arena-red/20 text-arena-red border-arena-red/40 shadow-red-glow'
                }`}
              >
                Saldo {formattedBalance}
              </span>
            )}
          </div>

          <div
            className={`text-xs font-extrabold uppercase tracking-wider ${
              tendencyColor === 'green'
                ? 'text-arena-green'
                : tendencyColor === 'red'
                ? 'text-arena-red'
                : tendencyColor === 'gold'
                ? 'text-arena-gold'
                : 'text-gray-400'
            }`}
          >
            {tendencyLabel}
          </div>
        </div>
      </div>

      {/* 3. Métricas Complementares (Total, Positivos, Neutros, Negativos e Saldo) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-3 border-t border-arena-border/60 z-10">
        {/* Card 1: Total de Votos */}
        <div className="bg-arena-black/60 border border-arena-border/70 rounded-2xl p-2.5 sm:p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">
            Total de Votos
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-white">
            {totalVotes}
          </div>
        </div>

        {/* Card 2: Votos Positivos (Média > 3) */}
        <div className="bg-arena-green/10 border border-arena-green/30 rounded-2xl p-2.5 sm:p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-arena-green font-bold flex items-center justify-center gap-1 mb-0.5">
            <ThumbsUp className="w-3 h-3" />
            <span>Positivos (&gt;3)</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-arena-green">
            {positiveVotes}
          </div>
        </div>

        {/* Card 3: Votos Neutros (Média == 3) */}
        <div className="bg-arena-gold/10 border border-arena-gold/30 rounded-2xl p-2.5 sm:p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-arena-gold font-bold flex items-center justify-center gap-1 mb-0.5">
            <Minus className="w-3 h-3" />
            <span>Neutros (=3)</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-arena-gold">
            {neutralVotes}
          </div>
        </div>

        {/* Card 4: Votos Negativos (Média < 3) */}
        <div className="bg-arena-red/10 border border-arena-red/30 rounded-2xl p-2.5 sm:p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-arena-red font-bold flex items-center justify-center gap-1 mb-0.5">
            <ThumbsDown className="w-3 h-3" />
            <span>Negativos (&lt;3)</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-arena-red">
            {negativeVotes}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalGauge;
