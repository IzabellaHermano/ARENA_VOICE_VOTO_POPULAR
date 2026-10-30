import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

export interface VoteCounterProps {
  count: number;
  className?: string;
}

export const VoteCounter: React.FC<VoteCounterProps> = ({ count, className = '' }) => {
  return (
    <div
      className={`bg-arena-card border border-arena-border rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition-all hover:border-arena-borderLight shadow-md ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-arena-blue/15 border border-arena-blue/30 flex items-center justify-center text-arena-blue shadow-blue-glow shrink-0">
        <Users className="w-6 h-6" />
      </div>

      <div>
        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
          Participação do público
        </div>
        <motion.div
          key={count}
          initial={{ scale: 1.15, color: '#00B8F5' }}
          animate={{ scale: 1, color: '#FFFFFF' }}
          transition={{ duration: 0.3 }}
          className="text-2xl sm:text-3xl font-black font-mono text-white tracking-wider"
        >
          {count}
        </motion.div>
        <div className="text-[11px] text-arena-green font-bold">votos recebidos</div>
      </div>
    </div>
  );
};

export default VoteCounter;

