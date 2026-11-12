import React from 'react';
import { Clock } from 'lucide-react';
import { formatStopwatch } from '@/utils/approvalCalculator';

export interface RoundTimerProps {
  seconds: number;
  className?: string;
  isActive?: boolean;
}

export const RoundTimer: React.FC<RoundTimerProps> = ({
  seconds,
  className = '',
  isActive = true,
}) => {
  return (
    <div
      className={`bg-arena-card border border-arena-border rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition-all hover:border-arena-borderLight shadow-md ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-arena-gold/15 border border-arena-gold/30 flex items-center justify-center text-arena-gold shadow-yellow-glow shrink-0">
        <Clock className={`w-6 h-6 ${isActive ? 'animate-pulse' : ''}`} />
      </div>

      <div>
        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
          Tempo da rodada
        </div>
        <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-wider">
          {formatStopwatch(seconds)}
        </div>
        <div className="text-[11px] text-gray-400 font-medium">cronômetro oficial sincronizado</div>
      </div>
    </div>
  );
};

export default RoundTimer;

