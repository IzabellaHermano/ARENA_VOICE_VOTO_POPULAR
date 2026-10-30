import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface VotingButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'outline' | 'gold';
  isLoading?: boolean;
}

export const VotingButton: React.FC<VotingButtonProps> = ({
  children,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  disabled = false,
  isLoading = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'relative w-full py-3.5 px-6 rounded-2xl font-black text-sm tracking-wide uppercase flex items-center justify-center gap-2.5 transition-all select-none';

  const variantClasses = {
    primary:
      'bg-arena-red hover:bg-arena-redHover text-white shadow-red-glow border border-red-500/40 active:border-red-400',
    secondary:
      'bg-arena-navy hover:bg-arena-cardHover text-gray-200 border border-arena-border',
    outline:
      'bg-transparent hover:bg-white/5 text-gray-300 border border-arena-border hover:border-gray-400',
    gold:
      'bg-arena-gold hover:bg-arena-goldLight text-black shadow-yellow-glow border border-yellow-300',
  };

  const disabledClasses = disabled || isLoading
    ? 'opacity-40 cursor-not-allowed hover:bg-arena-red shadow-none filter grayscale-[30%]'
    : 'cursor-pointer active:scale-[0.98]';

  return (
    <motion.button
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : undefined}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </motion.button>
  );
};

export default VotingButton;

