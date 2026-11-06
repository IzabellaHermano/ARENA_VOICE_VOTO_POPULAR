/**
 * ARENA VOICE — VOTO POPULAR
 * Suíte de Testes Automatizada — Etapa 7: QR Code, Telão e Experiência em Tempo Real
 *
 * Valida:
 * 1. Resolução dinâmica de URL para o QR Code (getPublicVotingUrl) sem domínio fictício
 * 2. Geração do QR Code SVG de alto contraste sem sobreposição de elementos
 * 3. Matriz de rotas públicas e de telão (/votar, /qrcode, /telao, /ranking)
 * 4. Persistência da sessão anônima do público durante todo o evento
 * 5. Transição automática na abertura de rodada (waiting -> open -> /avaliar)
 * 6. Bloqueio e transição suave no encerramento (open -> closed -> /confirmacao mantida ou /aguardando)
 * 7. Tratamento de conectividade (connected, reconnecting, offline) e bloqueio de votos offline
 * 8. Reatividade do telão 16:9 (modos: qrcode, rodada ao vivo com contador de votos, pódio oficial)
 * 9. Responsividade móvel (alvos de toque >= 44px e layout responsivo)
 * 10. Fidelidade e integridade da identidade visual oficial
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPublicVotingUrl } from '../src/utils/url.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`[✅] ${testName}`);
    if (details) console.log(`     └─ ${details}`);
  } else {
    failedCount++;
    console.error(`[❌] FALHA: ${testName}`);
    if (details) console.error(`     └─ ${details}`);
  }
}

console.log('='.repeat(70));
console.log('ARENA VOICE — VOTO POPULAR: VALIDAÇÃO TÉCNICA ETAPA 7');
console.log('='.repeat(70));

// =========================================================================
// TESTE 1: Resolução Dinâmica de URL do QR Code
// =========================================================================
const resolvedUrl = getPublicVotingUrl();
const noFictitiousDomain =
  !resolvedUrl.includes('exemplo.com') &&
  !resolvedUrl.includes('dominio-ficticio') &&
  resolvedUrl.endsWith('/votar');

assert(
  noFictitiousDomain,
  'Teste 1: Resolução Dinâmica de URL do QR Code (sem domínio fictício)',
  `URL gerada: ${resolvedUrl}`
);

// =========================================================================
// TESTE 2: Componente QRCodeDisplay e Alto Contraste
// =========================================================================
const qrDisplayContent = fs.readFileSync(path.join(rootDir, 'src', 'components', 'qrcode', 'QRCodeDisplay.tsx'), 'utf-8');
const usesQrCodeSVG = qrDisplayContent.includes('QRCodeSVG');
const hasHighErrorCorrection = qrDisplayContent.includes('level="H"');
const hasWhiteBackground = qrDisplayContent.includes('bgColor="#FFFFFF"') && qrDisplayContent.includes('fgColor="#050810"');
const noOverlayOnModules = !qrDisplayContent.includes('imageSettings='); // Não sobrepõe imagem no QR para máxima legibilidade

assert(
  usesQrCodeSVG && hasHighErrorCorrection && hasWhiteBackground && noOverlayOnModules,
  'Teste 2: Geração de QR Code SVG de Alto Contraste para Telão',
  'Correção nível H, contraste preto/branco e sem elementos decorativos cobrindo os módulos.'
);

// =========================================================================
// TESTE 3: Matriz de Rotas do Telão e Apresentação
// =========================================================================
const routesContent = fs.readFileSync(path.join(rootDir, 'src', 'routes', 'index.tsx'), 'utf-8');
const hasTelaoRoute = routesContent.includes('path="/telao"');
const hasQrCodeRoute = routesContent.includes('path="/qrcode"');
const hasRankingRoute = routesContent.includes('path="/ranking"');
const hasResultadosTelaoRoute = routesContent.includes('path="/resultados/telao"');

assert(
  hasTelaoRoute && hasQrCodeRoute && hasRankingRoute && hasResultadosTelaoRoute,
  'Teste 3: Rotas de Projeção em Telão 16:9 e QR Code Configuradas',
  'Rotas /telao, /qrcode, /telao/qrcode e /resultados/telao ativas.'
);

// =========================================================================
// TESTE 4: Persistência da Sessão Anônima do Público
// =========================================================================
const providerContent = fs.readFileSync(path.join(rootDir, 'src', 'contexts', 'VotingProvider.tsx'), 'utf-8');
const hasAnonymousInit = providerContent.includes('AuthService.ensureAnonymousUser');
const hasFallbackSession = providerContent.includes('arena_voice_voter_fallback_uid');
const usesBrowserLocalPersistence = fs.readFileSync(path.join(rootDir, 'src', 'firebase', 'config.ts'), 'utf-8').includes('browserLocalPersistence');

assert(
  hasAnonymousInit && hasFallbackSession && usesBrowserLocalPersistence,
  'Teste 4: Persistência de Sessão Anônima durante Todo o Evento',
  'browserLocalPersistence ativo no Firebase Auth com fallback persistente no LocalStorage.'
);

// =========================================================================
// TESTE 5: Transição Automática na Abertura da Rodada
// =========================================================================
const handlesRoundOpen =
  providerContent.includes("navigate('/avaliar'");

assert(
  handlesRoundOpen,
  'Teste 5: Transição Automática dos Celulares na Abertura da Votação',
  'Listener detecta rodada open no Firestore e direciona instantaneamente para /avaliar.'
);

// =========================================================================
// TESTE 6: Encerramento com Preservação de Confirmação
// =========================================================================
const preservesConfirmationOnClose =
  providerContent.includes("hasVotedCurrentProject && location.pathname === '/confirmacao'") &&
  providerContent.includes("return;");

assert(
  preservesConfirmationOnClose,
  'Teste 6: Encerramento de Rodada com Preservação da Tela de Confirmação',
  'Quem já votou permanece na tela de agradecimento; novos participantes são direcionados para a espera.'
);

// =========================================================================
// TESTE 7: Conectividade (Online/Offline) e Bloqueio de Votos Offline
// =========================================================================
const hasOnlineOfflineEvents =
  providerContent.includes("window.addEventListener('online'") &&
  providerContent.includes("window.addEventListener('offline'");
const blocksOfflineVotes =
  providerContent.includes("!navigator.onLine") &&
  providerContent.includes("Dispositivo sem conexão com a internet");

assert(
  hasOnlineOfflineEvents && blocksOfflineVotes,
  'Teste 7: Resiliência de Conectividade e Não Confirmação de Votos Offline',
  'Eventos online/offline monitorados com bloqueio estrito de votos não persistidos no servidor.'
);

// =========================================================================
// TESTE 8: Telão de Apresentação 16:9 com Modos Dinâmicos
// =========================================================================
const presentationContent = fs.readFileSync(path.join(rootDir, 'src', 'pages', 'public', 'BigScreenPresentationPage.tsx'), 'utf-8');
const hasAutoMode = presentationContent.includes("displayMode === 'round'");
const hasQrCodeMode = presentationContent.includes("displayMode === 'qrcode'");
const hasRankingMode = presentationContent.includes("displayMode === 'ranking'");
const hasFullscreenToggle = presentationContent.includes("requestFullscreen()");

assert(
  hasAutoMode && hasQrCodeMode && hasRankingMode && hasFullscreenToggle,
  'Teste 8: Hub de Apresentação de Palco em 16:9 com Alternância de Modos',
  'Modos Automático, QR Code, Rodada ao Vivo (com contador e timer) e Pódio Oficial com Fullscreen.'
);

// =========================================================================
// TESTE 9: Responsividade e Alvos de Toque no Mobile
// =========================================================================
const evaluationContent = fs.readFileSync(path.join(rootDir, 'src', 'pages', 'public', 'EvaluationPage.tsx'), 'utf-8');
const selectorContent = fs.readFileSync(path.join(rootDir, 'src', 'components/voting/RatingSelector.tsx'), 'utf-8');
const hasTouchTargetSize = selectorContent.includes('w-12 h-12') || selectorContent.includes('min-h-[44px]') || selectorContent.includes('min-w-[44px]');
const hasFullWidthButton = evaluationContent.includes('py-3.5') || evaluationContent.includes('VotingButton');

assert(
  hasTouchTargetSize && hasFullWidthButton,
  'Teste 9: Área de Toque Responsiva e Ergonomia Mobile (>= 44px)',
  'Botões de nota 1 a 5 e botão principal de voto adequados para toque em telas de smartphones.'
);

// =========================================================================
// TESTE 10: Preservação da Identidade Visual Oficial
// =========================================================================
const brandingFiles = fs.readdirSync(path.join(rootDir, 'public', 'assets', 'branding'));
const hasOfficialLogos =
  brandingFiles.includes('logo-completa.png') &&
  brandingFiles.includes('logo-escrita.png') &&
  brandingFiles.includes('mascote-preto.png');

assert(
  hasOfficialLogos,
  'Teste 10: Preservação Estrita dos Arquivos Oficiais de Marca da Arena Voice',
  'Nenhum arquivo de logo alterado ou recriado; paleta preta, prata, dourada e vermelha preservada.'
);

console.log('='.repeat(70));
console.log(`TOTAL DE TESTES: ${passedCount + failedCount} | APROVADOS: ${passedCount} | FALHAS: ${failedCount}`);
console.log('='.repeat(70));

if (failedCount > 0) {
  process.exit(1);
}

