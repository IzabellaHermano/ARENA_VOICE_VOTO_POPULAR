import React from 'react';

export type ArenaLogoVariant = 'complete' | 'text' | 'textWithSlogan' | 'transparentText';

export interface ArenaLogoProps {
  /**
   * Identifica a variação do logotipo a ser exibida:
   * - `complete`: Mão metálica, escrita ARENA VOICE e slogan (fundo preto)
   * - `text`: Apenas ARENA VOICE (fundo preto)
   * - `textWithSlogan`: Escrita ARENA VOICE com slogan (fundo preto)
   * - `transparentText`: ARENA VOICE com fundo transparente
   */
  variant?: ArenaLogoVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  alt?: string;
}

const LOGO_SRC_MAP: Record<ArenaLogoVariant, string> = {
  complete: '/assets/branding/logo-completa.png',
  text: '/assets/branding/logo-escrita.png',
  textWithSlogan: '/assets/branding/logo-escrita-slogan.png',
  transparentText: '/assets/branding/logo-escrita-transparente.png',
};

const LOGO_ALT_MAP: Record<ArenaLogoVariant, string> = {
  complete: 'Arena Voice — Ideias que viram futuro (Logo Oficial)',
  text: 'Arena Voice',
  textWithSlogan: 'Arena Voice — Ideias que viram futuro',
  transparentText: 'Arena Voice',
};

export const ArenaLogo: React.FC<ArenaLogoProps> = ({
  variant = 'complete',
  width,
  height,
  className = '',
  alt,
}) => {
  const src = LOGO_SRC_MAP[variant] || LOGO_SRC_MAP.complete;
  const resolvedAlt = alt || LOGO_ALT_MAP[variant] || 'Arena Voice';

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

export default ArenaLogo;

