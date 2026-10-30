import React from 'react';
import { Info, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export interface StatusMessageProps {
  message: string;
  submessage?: string;
  variant?: 'info' | 'success' | 'warning' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  message,
  submessage,
  variant = 'neutral',
  icon,
  className = '',
}) => {
  const variantStyles = {
    neutral: 'bg-arena-card/80 border-arena-border text-gray-300',
    info: 'bg-arena-blue/10 border-arena-blue/30 text-arena-blue',
    success: 'bg-arena-green/10 border-arena-green/30 text-arena-green',
    warning: 'bg-arena-gold/10 border-arena-gold/30 text-arena-gold',
  };

  const defaultIcon = {
    neutral: <Clock className="w-4 h-4 text-gray-400" />,
    info: <Info className="w-4 h-4 text-arena-blue" />,
    success: <CheckCircle2 className="w-4 h-4 text-arena-green" />,
    warning: <AlertCircle className="w-4 h-4 text-arena-gold" />,
  }[variant];

  return (
    <div
      className={`w-full rounded-xl border p-3 flex items-center justify-center gap-2.5 text-center transition-all ${variantStyles[variant]} ${className}`}
    >
      <span className="shrink-0">{icon || defaultIcon}</span>
      <div className="text-left">
        <p className="text-xs font-semibold leading-snug">{message}</p>
        {submessage && (
          <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{submessage}</p>
        )}
      </div>
    </div>
  );
};

export default StatusMessage;

