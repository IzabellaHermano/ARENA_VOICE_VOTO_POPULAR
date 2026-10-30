import React from 'react';
import { motion } from 'framer-motion';

export interface ProgressIndicatorProps {
  currentStep: number; // 1-based (e.g. 1 to 4)
  totalSteps?: number;
  className?: string;
  labels?: string[];
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps = 4,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center gap-2 py-2 ${className}`}>
      <div className="relative flex items-center gap-3">
        {/* Connecting line */}
        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-arena-border z-0" />

        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={stepNumber} className="relative z-10 flex items-center justify-center">
              {isCurrent ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="relative flex items-center justify-center"
                >
                  <span className="absolute -inset-1 rounded-full bg-arena-red/40 animate-ping" />
                  <span className="w-3.5 h-3.5 rounded-full bg-arena-red ring-4 ring-arena-red/30 shadow-red-glow" />
                </motion.div>
              ) : isCompleted ? (
                <div className="w-2.5 h-2.5 rounded-full bg-arena-green shadow-green-glow" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-gray-600 border border-gray-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator;

