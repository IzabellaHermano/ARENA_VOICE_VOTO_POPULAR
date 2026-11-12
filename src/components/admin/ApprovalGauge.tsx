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
  compact?: boolean;
}

// Converte graus polares para coordenadas cartesianas (0° no topo, 90° à direita, -90° à esquerda)
function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  // Ajuste: 0° na escala do ponteiro é o topo vertical (90° padrão trigonométrico)
  const trigAngle = (90 - angleInDegrees) * (Math.PI / 180.0);
  return {
    x: cx + radius * Math.cos(trigAngle),
    y: cy - radius * Math.sin(trigAngle),
  };
}

// Cria arco SVG suave entre dois ângulos de -90° a +90°
function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? '1' : '0';
  const sweepFlag = endAngle > startAngle ? '1' : '0';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
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
    needleAngle,
    tendencyLabel,
    tendencyColor,
  } = stats;

  const isClosed = roundStatus === 'encerrada';
  const isOpen = roundStatus === 'aberta';
  const hasVotes = totalVotes > 0;

  // Dimensões do SVG do Medidor Tecnológico
  const cx = 200;
  const cy = 175;
  const rTrack = 130;
  const rTicks = 142;

  // Formatação do Saldo / Escala Percentual com sinal explícito (+ ou -)
  const formattedScale = useMemo(() => {
    if (!hasVotes) return '0%';
    const rounded = Math.round(scalePercent * 10) / 10;
    return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
  }, [hasVotes, scalePercent]);

  // Percentuais de cada categoria de sentimento
  const posPct = hasVotes ? Math.round((positiveVotes / totalVotes) * 100) : 0;
  const neuPct = hasVotes ? Math.round((neutralVotes / totalVotes) * 100) : 0;
  const negPct = hasVotes ? Math.round((negativeVotes / totalVotes) * 100) : 0;

  return (
    <div
      className={`bg-gradient-to-b from-[#11131F] via-[#0B0C14] to-[#07080D] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Iluminação Ambiente Sofisticada Arena Voice */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-arena-red/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-arena-blue/5 rounded-full blur-[100px] pointer-events-none" />

      {/* 1. Header do Medidor (quando projectName for informado) */}
      {projectName && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-3 z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-arena-gold mb-1">
              <Sparkles className="w-3 h-3 text-arena-gold" />
              <span>Ponteiro Dinâmico de Avaliação</span>
            </div>

            <h3 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
              <span>{projectName}</span>
              {projectCategory && (
                <span className="text-xs font-bold text-gray-400 hidden sm:inline">
                  • {projectCategory}
                </span>
              )}
            </h3>
          </div>

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
                <RadioTower className="w-3.5 h-3.5 text-gray-400" />
                <span>Aguardando Liberação</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Mostrador Tecnológico Semicircular */}
      <div className="relative flex flex-col items-center justify-center my-2 z-10 select-none">
        <svg
          viewBox="0 0 400 230"
          className="w-full max-w-[420px] h-auto drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
        >
          <defs>
            {/* Gradiente Metálico Cromado da Moldura */}
            <linearGradient id="chromeBezel" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Gradiente da Faixa Negativa (Rubi / Arena Red discreto) */}
            <linearGradient id="negTrackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7F1D1D" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#E30613" stopOpacity="0.7" />
            </linearGradient>

            {/* Gradiente da Faixa Positiva (Esmeralda Tecnológico) */}
            <linearGradient id="posTrackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.85" />
            </linearGradient>

            {/* Gradiente Dourado Tecnológico para o Ponteiro */}
            <linearGradient id="needleLaserGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#FEF08A" />
              <stop offset="70%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            {/* Hub Central Cromado Metálico */}
            <radialGradient id="hubMetallicRing" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#CBD5E1" />
              <stop offset="75%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            {/* Núcleo de Joia Arena Red do Centro */}
            <radialGradient id="hubJewelCore" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FF4D4D" />
              <stop offset="60%" stopColor="#E30613" />
              <stop offset="100%" stopColor="#7F1D1D" />
            </radialGradient>

            <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Arco de Fundo: Trilho Metálico Escuro */}
          <path
            d={describeArc(cx, cy, rTrack, -90, 90)}
            fill="none"
            stroke="#1E2235"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Faixa Negativa (-100% a 0° / -90° a 0°) */}
          <path
            d={describeArc(cx, cy, rTrack, -90, -1)}
            fill="none"
            stroke="url(#negTrackGradient)"
            strokeWidth="10"
            strokeLinecap="butt"
          />

          {/* Faixa Positiva (0° a +100% / 0° a +90°) */}
          <path
            d={describeArc(cx, cy, rTrack, 1, 90)}
            fill="none"
            stroke="url(#posTrackGradient)"
            strokeWidth="10"
            strokeLinecap="butt"
          />

          {/* Marcador Central de Equilíbrio (0% / Média 3.0) */}
          <line
            x1={cx}
            y1={cy - rTrack - 8}
            x2={cx}
            y2={cy - rTrack + 8}
            stroke="#FEF08A"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Graduações da Escala Tecnológica (-100%, -50%, 0%, +50%, +100%) */}
          {[-90, -45, 0, 45, 90].map((deg) => {
            const inner = polarToCartesian(cx, cy, rTicks - 3, deg);
            const outer = polarToCartesian(cx, cy, rTicks + 5, deg);
            const isCenter = deg === 0;
            return (
              <line
                key={deg}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={isCenter ? '#F59E0B' : '#94A3B8'}
                strokeWidth={isCenter ? 3 : 1.5}
                strokeLinecap="round"
              />
            );
          })}

          {/* Rótulos da Escala */}
          {/* -100% */}
          <text
            x="48"
            y="180"
            textAnchor="middle"
            fill="#EF4444"
            fontSize="11"
            fontWeight="900"
            fontFamily="monospace"
          >
            -100%
          </text>
          <text
            x="48"
            y="194"
            textAnchor="middle"
            fill="#7F1D1D"
            fontSize="8"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            REJEIÇÃO
          </text>

          {/* -50% */}
          <text
            x="96"
            y="94"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="10"
            fontWeight="700"
            fontFamily="monospace"
          >
            -50%
          </text>

          {/* 0% (EQUILÍBRIO) */}
          <text
            x={cx}
            y="32"
            textAnchor="middle"
            fill="#FEF08A"
            fontSize="11"
            fontWeight="900"
            fontFamily="monospace"
          >
            0%
          </text>
          <text
            x={cx}
            y="44"
            textAnchor="middle"
            fill="#D97706"
            fontSize="8"
            fontWeight="800"
            letterSpacing="0.1em"
          >
            EQUILÍBRIO
          </text>

          {/* +50% */}
          <text
            x="304"
            y="94"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="10"
            fontWeight="700"
            fontFamily="monospace"
          >
            +50%
          </text>

          {/* +100% */}
          <text
            x="352"
            y="180"
            textAnchor="middle"
            fill="#10B981"
            fontSize="11"
            fontWeight="900"
            fontFamily="monospace"
          >
            +100%
          </text>
          <text
            x="352"
            y="194"
            textAnchor="middle"
            fill="#065F46"
            fontSize="8"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            APROVAÇÃO
          </text>

          {/* PONTEIRO ANALÓGICO COM FÍSICA MECÂNICA SUAVE */}
          <g
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${needleAngle}deg)`,
              transition: 'transform 1.2s cubic-bezier(0.34, 1.35, 0.64, 1)',
            }}
            filter="url(#needleGlow)"
          >
            {/* Sombra da Agulha */}
            <polygon
              points={`${cx - 3.5},${cy + 12} ${cx + 3.5},${cy + 12} ${cx + 1},${cy - 128} ${cx - 1},${cy - 128}`}
              fill="rgba(0,0,0,0.6)"
              transform="translate(2, 4)"
            />

            {/* Corpo da Agulha Metálica Afilada */}
            <polygon
              points={`${cx - 4},${cy + 10} ${cx + 4},${cy + 10} ${cx + 1.2},${cy - 130} ${cx - 1.2},${cy - 130}`}
              fill="url(#needleLaserGradient)"
              stroke="#B45309"
              strokeWidth="0.6"
            />

            {/* Friso Central Cromado Refletivo da Agulha */}
            <line
              x1={cx}
              y1={cy + 6}
              x2={cx}
              y2={cy - 128}
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.95"
            />

            {/* Ponteira Iluminada */}
            <circle cx={cx} cy={cy - 130} r="2.2" fill="#FFFFFF" />
          </g>

          {/* HUB CENTRAL MECÂNICO COM RELEVO E JOIA ARENA */}
          {/* Anel Externo de Sombra */}
          <circle cx={cx} cy={cy} r="18" fill="#0A0B10" opacity="0.8" />
          {/* Anel Metálico Cromado */}
          <circle cx={cx} cy={cy} r="15" fill="url(#hubMetallicRing)" stroke="#1E293B" strokeWidth="1" />
          {/* Núcleo Rubi Arena Voice */}
          <circle cx={cx} cy={cy} r="9" fill="url(#hubJewelCore)" />
          {/* Ponto Central Iluminado */}
          <circle cx={cx - 2} cy={cy - 2} r="2.5" fill="#FFFFFF" opacity="0.85" />
        </svg>

        {/* Leitura Digital Centralizada */}
        <div className="flex flex-col items-center -mt-6 z-20 space-y-1">
          {/* Indicador de Tendência / Status */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
              tendencyColor === 'green'
                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : tendencyColor === 'red'
                ? 'bg-rose-950/70 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                tendencyColor === 'green'
                  ? 'bg-emerald-400 animate-pulse'
                  : tendencyColor === 'red'
                  ? 'bg-rose-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span>{hasVotes ? tendencyLabel : 'AGUARDANDO PRIMEIROS VOTOS'}</span>
          </div>

          {/* Média Consolidada e Escala (-100% a +100%) */}
          <div className="flex items-baseline gap-3 pt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                {hasVotes ? averageGeneral.toFixed(2) : '—'}
              </span>
              <span className="text-xs font-bold text-gray-400 uppercase">/ 5.0</span>
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 font-mono text-xs sm:text-sm font-black text-arena-gold">
              <span>Escala:</span>
              <span>{formattedScale}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grid de Cartões de Métricas Detalhadas */}
      {!compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-white/10 z-10">
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
