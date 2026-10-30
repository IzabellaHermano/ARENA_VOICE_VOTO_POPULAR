import React from 'react';
import { motion } from 'framer-motion';
import { Hourglass } from 'lucide-react';

export interface WaitingAnimationProps {
  className?: string;
}

export const WaitingAnimation: React.FC<WaitingAnimationProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer ambient glow */}
      <div className="absolute w-36 h-36 rounded-full bg-arena-red/15 blur-2xl animate-pulse-slow" />

      {/* Rotating outer ring accent */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        className="absolute w-28 h-28 rounded-full border border-dashed border-arena-red/30"
      />

      {/* Central circular badge with red glow */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 w-24 h-24 rounded-full border-2 border-arena-red/70 bg-gradient-to-b from-arena-navy/90 to-arena-card/95 flex items-center justify-center shadow-red-glow"
      >
        {/* Animated Hourglass */}
        <motion.div
          animate={{
            rotate: [0, 0, 180, 180, 360],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            times: [0, 0.4, 0.5, 0.9, 1],
            ease: 'easeInOut',
          }}
        >
          <Hourglass className="w-10 h-10 text-arena-red stroke-[2.2]" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default WaitingAnimation;

