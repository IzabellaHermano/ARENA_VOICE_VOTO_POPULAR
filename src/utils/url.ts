/**
 * ARENA VOICE — VOTO POPULAR
 * Utilitário de Resolução de URLs Oficiais
 *
 * Estratégia inteligente de resolução de URL para o QR Code:
 * 1. Se estiver no navegador e a URL de acesso for um IP de rede local (ex: 10.x.x.x, 192.168.x.x, 172.x.x.x),
 *    o QR Code gerado na tela utilizará automaticamente esse IP local (window.location.origin), garantindo que
 *    qualquer celular na mesma rede Wi-Fi acerte exatamente o servidor de teste.
 * 2. Se o desenvolvedor configurou VITE_PUBLIC_APP_URL no .env (seja o IP local ou a URL de produção),
 *    ela é utilizada como base.
 * 3. Se window.location.origin estiver disponível, utiliza-o dinamicamente.
 * 4. Fallback padrão: /votar
 */

export function getPublicAppOrigin(): string {
  // 1. Variável de ambiente configurada no .env
  const envUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_PUBLIC_APP_URL || '').trim() : '';

  // 2. Resolução dinâmica no navegador
  if (typeof window !== 'undefined' && window.location?.origin) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isPrivateIP =
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    // Se o operador está navegando diretamente pelo IP de rede local (ex: http://10.148.156.93:3000),
    // o QR Code reflete essa mesma origem para que os celulares na mesma rede abram perfeitamente:
    if (isPrivateIP) {
      return window.location.origin;
    }

    // Se estiver em localhost e houver envUrl configurada no .env (ex: http://10.148.156.93:3000),
    // usa a envUrl para que o QR Code exibido no monitor do operador contenha o IP acessível pelo celular:
    if (isLocalhost && envUrl) {
      return envUrl.replace(/\/+$/, '');
    }

    // Se houver envUrl configurada para produção:
    if (envUrl && !isLocalhost) {
      return envUrl.replace(/\/+$/, '');
    }

    return window.location.origin;
  }

  return envUrl ? envUrl.replace(/\/+$/, '') : '';
}

export function getPublicVotingUrl(): string {
  const origin = getPublicAppOrigin();
  return origin ? `${origin}/votar` : '/votar';
}
