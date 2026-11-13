/**
 * ARENA VOICE — VOTO POPULAR
 * Utilitário de Resolução de URLs Oficiais
 *
 * O QR Code oficial direciona os participantes para a Home Page pública
 * hospedada no domínio de produção oficial, permitindo escaneamento direto
 * por celulares via 4G/5G ou Wi-Fi sem depender de endereços locais ou temporários.
 */

export const OFFICIAL_PRODUCTION_URL = 'https://arena-voice-voto-popular.web.app';

export function getPublicAppOrigin(): string {
  // 1. Variável de ambiente configurada no .env / .env.production
  const envUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_PUBLIC_APP_URL || '').trim() : '';
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // 2. Se executado diretamente no domínio de produção (não localhost / não IP privado)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isPrivateIP =
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    if (!isLocalhost && !isPrivateIP) {
      return window.location.origin;
    }
  }

  // 3. Destino padrão oficial de produção
  return OFFICIAL_PRODUCTION_URL;
}

export function getPublicVotingUrl(): string {
  const origin = getPublicAppOrigin();
  return `${origin}/votar`;
}
