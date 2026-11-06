/**
 * ARENA VOICE — VOTO POPULAR
 * Utilitário de Resolução de URLs Oficiais (Etapa 7)
 *
 * Garante que o QR Code sempre aponte para a URL pública real acessível pelo público:
 * 1. Utiliza VITE_PUBLIC_APP_URL se configurada (domínio de produção/staging no Firebase Hosting).
 * 2. Utiliza window.location.origin dinamicamente (IP de rede local ou domínio atual).
 * 3. Nunca utiliza domínio fictício ou estático que quebre o escaneamento na arena.
 */

export function getPublicVotingUrl(): string {
  // 1. Variável de ambiente configurada no deploy
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL) {
    const base = String(import.meta.env.VITE_PUBLIC_APP_URL).replace(/\/$/, '');
    return `${base}/votar`;
  }

  // 2. Origem dinâmica do navegador onde o sistema está rodando
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/votar`;
  }

  // 3. Fallback padrão
  return '/votar';
}

export function getPublicAppOrigin(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL) {
    return String(import.meta.env.VITE_PUBLIC_APP_URL).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

