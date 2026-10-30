import React from 'react';
import { motion } from 'framer-motion';

export interface RatingSelectorProps {
  id: string;
  title: string;
  description: string;
  value: number | null;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
}

export const RATING_LABELS: Record<number, string> = {
  1: 'Muito baixo',
  2: 'Baixo',
  3: 'Regular',
  4: 'Bom',
  5: 'Muito bom',
};

export const RatingSelector: React.FC<RatingSelectorProps> = ({
  id,
  title,
  description,
  value,
  onChange,
  icon,
}) => {
  return (
    <div className="w-full bg-arena-card/90 border border-arena-border rounded-2xl p-4 sm:p-4.5 shadow-md transition-all hover:border-arena-borderLight">
      {/* Title & Description */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          {icon && <span className="shrink-0 text-arena-gold">{icon}</span>}
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">
              {title}
            </h4>
            <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {/* Selected badge */}
        {value !== null && (
          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-arena-red/20 text-arena-red border border-arena-red/40 animate-fade-in">
            {RATING_LABELS[value]}
          </span>
        )}
      </div>

      {/* 5 Rating Buttons */}
      <div
        role="radiogroup"
        aria-labelledby={`rating-${id}`}
        className="grid grid-cols-5 gap-2 my-2.5"
      >
        {[1, 2, 3, 4, 5].map((score) => {
          const isSelected = value === score;
          return (
            <motion.button
              key={score}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${score} — ${RATING_LABELS[score]}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(score)}
              className={`h-11 sm:h-12 rounded-xl font-black text-base transition-colors flex items-center justify-center select-none ${
                isSelected
                  ? 'bg-arena-red text-white shadow-red-glow border-2 border-white/60'
                  : 'bg-arena-navy/80 hover:bg-arena-cardHover text-gray-200 border border-arena-border'
              }`}
            >
              {score}
            </motion.button>
          );
        })}
      </div>

      {/* Footnotes: 1 — Muito baixo / 5 — Muito bom */}
      <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium px-1">
        <span>1 — Muito baixo</span>
        <span>5 — Muito bom</span>
      </div>
    </div>
  );
};

export default RatingSelector;

