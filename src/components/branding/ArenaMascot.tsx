import React from 'react';

export type ArenaMascotVariant = 'transparent' | 'black';

export interface ArenaMascotProps {
  /**
   * Identifica a variação do mascote a ser exibida:
   * - `transparent`: Mão metálica cromada em sinal de V segurando microfone (fundo transparente)
   * - `black`: Mão metálica isolada com iluminação vermelha (fundo preto)
   */
  variant?: ArenaMascotVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  alt?: string;
}

const MASCOT_SRC_MAP: Record<ArenaMascotVariant, string> = {
  transparent: '/assets/branding/mascote-transparente.png',
  black: '/assets/branding/mascote-preto.png',
};

const MASCOT_ALT_MAP: Record<ArenaMascotVariant, string> = {
  transparent: 'Mascote Arena Voice — Mão metálica com microfone',
  black: 'Mascote Arena Voice — Fundo preto',
};

export const ArenaMascot: React.FC<ArenaMascotProps> = ({
  variant = 'transparent',
  width,
  height,
  className = '',
  alt,
}) => {
  const src = MASCOT_SRC_MAP[variant] || MASCOT_SRC_MAP.transparent;
  const resolvedAlt = alt || MASCOT_ALT_MAP[variant] || 'Mascote Arena Voice';

  return (
    <img
      src={src}
      alt={resolvedAlt}
      width={width}
      height={height}
      className={`object-contain select-none transition-opacity duration-200 ${className}`}
      loading="eager"
      decoding="async"
      style={{
        maxWidth: '100%',
        height: height ?? 'auto',
        width: width ?? 'auto',
      }}
    />
  );
};

export default ArenaMascot;

