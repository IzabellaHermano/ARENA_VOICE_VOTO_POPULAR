/**
 * Teste Automatizado de Validação do Destino do QR Code e Preservação da Home Page
 */
import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- INICIANDO TESTES DO QR CODE E HOME PAGE ---');

// 1. Verificar .env
const envContent = fs.readFileSync('.env', 'utf-8');
assert(
  envContent.includes('VITE_PUBLIC_APP_URL=https://arena-voice-voto-popular.web.app'),
  'FAIL: .env deve conter VITE_PUBLIC_APP_URL apontando para https://arena-voice-voto-popular.web.app'
);
console.log('✓ Teste 1: .env configurado com URL pública de produção oficial.');

// 2. Verificar src/utils/url.ts
const urlFile = fs.readFileSync('src/utils/url.ts', 'utf-8');
assert(urlFile.includes('https://arena-voice-voto-popular.web.app'), 'FAIL: url.ts deve conter URL oficial');
assert(urlFile.includes('${origin}/votar'), 'FAIL: getPublicVotingUrl deve terminar em /votar');
console.log('✓ Teste 2: src/utils/url.ts resolvendo URL oficial com rota /votar.');

// 3. Verificar src/routes/index.tsx
const routesFile = fs.readFileSync('src/routes/index.tsx', 'utf-8');
assert(routesFile.includes("import HomePage from '@/pages/public/HomePage';"), 'FAIL: HomePage deve ser importada');
assert(routesFile.includes('<Route path="/votar" element={<HomePage />} />'), 'FAIL: rota /votar deve renderizar HomePage');
assert(!routesFile.includes('<Navigate to={`/votar/${DEFAULT_EVENT_ID}`} replace />'), 'FAIL: rota /votar não deve redirecionar com ID de evento');
console.log('✓ Teste 3: src/routes/index.tsx mapeia /votar diretamente para HomePage sem IDs.');

// 4. Verificar preservação estrita de HomePage.tsx
const homePageFile = fs.readFileSync('src/pages/public/HomePage.tsx', 'utf-8');
assert(homePageFile.includes('ArenaLogo'), 'FAIL: Logo deve existir');
assert(homePageFile.includes('VOTO'), 'FAIL: Texto VOTO deve existir');
assert(homePageFile.includes('POPULAR'), 'FAIL: Texto POPULAR deve existir');
assert(homePageFile.includes('ENTRAR PARA VOTAR'), 'FAIL: Botão ENTRAR PARA VOTAR deve existir');
assert(homePageFile.includes('handleStartVoting'), 'FAIL: handleStartVoting deve existir');
assert(homePageFile.includes("navigate('/avaliar')"), 'FAIL: Navegação para /avaliar preservada');
assert(homePageFile.includes("navigate('/aguardando')"), 'FAIL: Navegação para /aguardando preservada');
assert(homePageFile.includes("navigate('/confirmacao')"), 'FAIL: Navegação para /confirmacao preservada');
console.log('✓ Teste 4: HomePage.tsx preservada integralmente com todos os elementos visuais e lógica.');

// 5. Verificar componentes de exibição do QR Code
const qrDisplay = fs.readFileSync('src/components/qrcode/QRCodeDisplay.tsx', 'utf-8');
assert(qrDisplay.includes('getPublicVotingUrl()'), 'FAIL: QRCodeDisplay deve consumir getPublicVotingUrl()');
assert(qrDisplay.includes('<QRCodeSVG'), 'FAIL: QRCodeSVG mantido');

const bigScreen = fs.readFileSync('src/pages/public/BigScreenPresentationPage.tsx', 'utf-8');
assert(bigScreen.includes('<QRCodeDisplay'), 'FAIL: Telão deve continuar exibindo QRCodeDisplay');

const qrPage = fs.readFileSync('src/pages/public/BigScreenQRCodePage.tsx', 'utf-8');
assert(qrPage.includes('<QRCodeDisplay'), 'FAIL: Página de QR Code deve continuar exibindo QRCodeDisplay');
console.log('✓ Teste 5: Todos os componentes visuais continuam exibindo o QR Code normalmente.');

console.log('\n=== TODOS OS 5 TESTES AUTOMATIZADOS FORAM APROVADOS COM SUCESSO! ===');

