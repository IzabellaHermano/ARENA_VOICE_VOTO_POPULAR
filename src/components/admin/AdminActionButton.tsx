import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type AdminActionButtonVariant = 'danger' | 'primary' | 'gold' | 'secondary' | 'outline';

export interface AdminActionButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: AdminActionButtonVariant;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const AdminActionButton: React.FC<AdminActionButtonProps> = ({
  children,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  isLoading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all select-none shadow-md';

  const variantClasses: Record<AdminActionButtonVariant, string> = {
    // Vermelho - Encerrar Avaliação
    danger:
      'bg-arena-red hover:bg-arena-redHover text-white shadow-red-glow border border-red-500/50 active:scale-95',
    // Azul - Próximo Projeto
    primary:
      'bg-arena-blue hover:bg-arena-blueHover text-white shadow-blue-glow border border-sky-400/50 active:scale-95',
    // Amarelo / Dourado - Liberar Votação
    gold:
      'bg-arena-gold hover:bg-arena-goldLight text-black shadow-yellow-glow border border-yellow-300 font-black active:scale-95',
    // Secundário - Gerar Dashboard
    secondary:
      'bg-arena-card hover:bg-arena-cardHover text-gray-200 border border-arena-border hover:border-gray-500 active:scale-95',
    // Outline
    outline:
      'bg-transparent hover:bg-white/5 text-gray-300 border border-arena-border hover:text-white active:scale-95',
  };

  const disabledClasses =
    disabled || isLoading
      ? 'opacity-40 cursor-not-allowed shadow-none filter grayscale-[30%] active:scale-100'
      : 'cursor-pointer';

  return (
    <motion.button
      whileTap={!disabled && !isLoading ? { scale: 0.96 } : undefined}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

export default AdminActionButton;

