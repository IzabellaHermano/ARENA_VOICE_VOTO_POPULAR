import React from 'react';
import { Timer, ClockAlert } from 'lucide-react';
import { formatCountdown, formatStopwatch } from '@/utils/approvalCalculator';

export interface RoundTimerProps {
  seconds: number;
  countdownSeconds?: number;
  isCountdown?: boolean;
  className?: string;
  isActive?: boolean;
}

export const RoundTimer: React.FC<RoundTimerProps> = ({
  seconds,
  countdownSeconds,
  isCountdown = true,
  className = '',
  isActive = true,
}) => {
  const displayValue = isCountdown
    ? formatCountdown(countdownSeconds ?? seconds)
    : formatStopwatch(seconds);

  const effectiveRemaining = countdownSeconds ?? seconds;
  const isUrgent = isCountdown && isActive && effectiveRemaining <= 10 && effectiveRemaining > 0;

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition-all border shadow-md ${
        isUrgent
          ? 'bg-red-950/40 border-arena-red/80 shadow-[0_0_20px_rgba(227,6,19,0.35)] animate-pulse'
          : 'bg-arena-card border-arena-border hover:border-arena-borderLight'
      } ${className}`}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          isUrgent
            ? 'bg-red-600/30 border border-red-500 text-red-300 animate-bounce'
            : 'bg-arena-gold/15 border border-arena-gold/30 text-arena-gold shadow-yellow-glow'
        }`}
      >
        {isUrgent ? (
          <ClockAlert className="w-6 h-6" />
        ) : (
          <Timer className={`w-6 h-6 ${isActive ? 'animate-pulse' : ''}`} />
        )}
      </div>

      <div>
        <div
          className={`text-xs font-semibold uppercase tracking-wider ${
            isUrgent ? 'text-red-300 font-bold' : 'text-gray-400'
          }`}
        >
          {isCountdown ? (isUrgent ? 'Tempo Esgotando!' : 'Tempo Restante') : 'Tempo da Rodada'}
        </div>
        <div
          className={`text-2xl sm:text-3xl font-black font-mono tracking-wider ${
            isUrgent ? 'text-red-400' : 'text-white'
          }`}
        >
          {displayValue}
        </div>
        <div className="text-[11px] text-gray-400 font-medium">
          {isCountdown ? 'cronômetro regressivo oficial' : 'cronômetro oficial sincronizado'}
        </div>
      </div>
    </div>
  );
};

export default RoundTimer;
