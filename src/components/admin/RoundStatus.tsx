import React from 'react';
import { RoundStatus as RoundStatusType } from '@/types';
import { Clock, Radio, CheckCircle } from 'lucide-react';

export interface RoundStatusProps {
  status: RoundStatusType;
  className?: string;
}

export const RoundStatus: React.FC<RoundStatusProps> = ({ status, className = '' }) => {
  const config = {
    aguardando: {
      label: 'Aguardando liberação',
      bgColor: 'bg-arena-gold/15 text-arena-gold border-arena-gold/40 shadow-yellow-glow',
      dotColor: 'bg-arena-gold',
      icon: <Clock className="w-3.5 h-3.5" />,
      pulsing: false,
    },
    aberta: {
      label: 'Votação aberta',
      bgColor: 'bg-arena-green/15 text-arena-green border-arena-green/50 shadow-green-glow',
      dotColor: 'bg-arena-green',
      icon: <Radio className="w-3.5 h-3.5 animate-pulse" />,
      pulsing: true,
    },
    encerrada: {
      label: 'Votação encerrada',
      bgColor: 'bg-arena-red/15 text-arena-red border-arena-red/40',
      dotColor: 'bg-arena-red',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      pulsing: false,
    },
  }[status];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${config.bgColor} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulsing && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
      </span>
      <span>{config.label}</span>
    </div>
  );
};

export default RoundStatus;

