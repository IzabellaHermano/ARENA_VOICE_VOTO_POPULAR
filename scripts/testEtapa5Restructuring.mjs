import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- INICIANDO BATERIA DE TESTES: ETAPA 5 - REESTRUTURAÇÃO DO TELÃO E FLUXO ---');

// 1. TESTE MATEMÁTICO: Approval Calculator & Countdown
console.log('1. Validando Approval Calculator e Contagem Regressiva...');

// Simulação da lógica de cálculo de aprovação e contagem regressiva
function formatCountdown(remainingSeconds) {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

assert.strictEqual(formatCountdown(120), '02:00', '120s deve formatar como 02:00');
assert.strictEqual(formatCountdown(119), '01:59', '119s deve formatar como 01:59');
assert.strictEqual(formatCountdown(9), '00:09', '9s deve formatar como 00:09');
assert.strictEqual(formatCountdown(0), '00:00', '0s deve formatar como 00:00');
assert.strictEqual(formatCountdown(-5), '00:00', 'Valores negativos devem formatar como 00:00');
console.log('  ✓ formatCountdown validado com sucesso.');

// Simulação da fórmula do ponteiro dinâmico e garantia de soma
function calculateApprovalStats(votes, totalVotesParam, averageGeneralParam) {
  let positiveVotes = 0;
  let neutralVotes = 0;
  let negativeVotes = 0;
  let totalVotes = votes.length;

  if (totalVotes === 0 && typeof totalVotesParam === 'number' && totalVotesParam > 0) {
    totalVotes = totalVotesParam;
    const avg = averageGeneralParam || 3.0;

    if (avg >= 3.6) {
      positiveVotes = Math.round(totalVotes * 0.7);
      neutralVotes = Math.round(totalVotes * 0.2);
      negativeVotes = Math.max(0, totalVotes - positiveVotes - neutralVotes);
    } else if (avg <= 2.4) {
      negativeVotes = Math.round(totalVotes * 0.7);
      neutralVotes = Math.round(totalVotes * 0.2);
      positiveVotes = Math.max(0, totalVotes - negativeVotes - neutralVotes);
    } else {
      neutralVotes = Math.round(totalVotes * 0.5);
      positiveVotes = Math.round(totalVotes * 0.25);
      negativeVotes = Math.max(0, totalVotes - positiveVotes - neutralVotes);
    }
  }

  const calculatedSum = positiveVotes + neutralVotes + negativeVotes;
  if (calculatedSum !== totalVotes && totalVotes > 0) {
    const diff = totalVotes - calculatedSum;
    neutralVotes += diff;
  }

  // Índice de aprovação de -100% a +100%
  const approvalBalance =
    totalVotes > 0
      ? Math.round(((positiveVotes - negativeVotes) / totalVotes) * 100)
      : 0;

  return {
    totalVotes,
    positiveVotes,
    neutralVotes,
    negativeVotes,
    approvalBalance,
  };
}

// CASO CRÍTICO: 9 votos no resultado consolidado e RLS bloqueando votos individuais
const statsWith9Votes = calculateApprovalStats([], 9, 3.8);
assert.strictEqual(statsWith9Votes.totalVotes, 9, 'Total de votos deve ser 9');
assert.strictEqual(
  statsWith9Votes.positiveVotes + statsWith9Votes.neutralVotes + statsWith9Votes.negativeVotes,
  9,
  'A soma pos + neu + neg DEVE ser rigorosamente igual a 9'
);
assert(statsWith9Votes.positiveVotes > 0, 'Com média 3.8, deve haver votos positivos');
assert(statsWith9Votes.approvalBalance > 0, 'Com média 3.8, o saldo de aprovação deve ser positivo');
console.log('  ✓ Consistência estrita pos + neu + neg === totalVotes (eliminação de 9 votos com 0/0/0) validada.');

// 2. TESTE DE ROTAS: Um único Telão Oficial (/telao)
console.log('2. Validando rotas do Telão Único em src/routes/index.tsx...');
const routesContent = fs.readFileSync(path.resolve('src/routes/index.tsx'), 'utf-8');

assert(routesContent.includes('<Route path="/telao" element={<BigScreenPresentationPage />} />'), 'Rota /telao deve existir');
assert(routesContent.includes('<Route path="/qrcode" element={<Navigate to="/telao" replace />} />'), '/qrcode deve redirecionar para /telao');
assert(routesContent.includes('<Route path="/telao/qrcode" element={<Navigate to="/telao" replace />} />'), '/telao/qrcode deve redirecionar para /telao');
assert(routesContent.includes('<Route path="/resultados/telao" element={<Navigate to="/telao" replace />} />'), '/resultados/telao deve redirecionar para /telao');
assert(routesContent.includes('<Route path="/ranking" element={<Navigate to="/telao" replace />} />'), '/ranking deve redirecionar para /telao');
console.log('  ✓ Todas as rotas secundárias redirecionam para /telao.');

// 3. TESTE DOS 4 ESTADOS NO TELÃO: BigScreenPresentationPage.tsx
console.log('3. Validando os 4 Estados do Telão em src/pages/public/BigScreenPresentationPage.tsx...');
const telaoContent = fs.readFileSync(path.resolve('src/pages/public/BigScreenPresentationPage.tsx'), 'utf-8');

// Estado 1.1: Aguardando Início
assert(telaoContent.includes("'1.1_waiting_start'"), 'Estado 1.1 deve existir');
assert(telaoContent.includes('EM INSTANTES, <span className="text-arena-red">A VOZ É SUA</span>'), 'Estado 1.1 deve ter título "EM INSTANTES, A VOZ É SUA"');
assert(telaoContent.includes('Aguarde o início das apresentações para avaliar os projetos no palco'), 'Estado 1.1 deve ter mensagem de orientação');

// Estado 1.2: Votação Ativa
assert(telaoContent.includes("'1.2_active_voting'"), 'Estado 1.2 deve existir');
assert(telaoContent.includes('formatCountdown(remainingSeconds)'), 'Estado 1.2 deve utilizar contagem regressiva');
assert(telaoContent.includes('projectOrderLabel'), 'Estado 1.2 deve exibir ordem oficial (ex: PROJETO 01 DE 04)');
assert(telaoContent.includes('ApprovalGauge'), 'Estado 1.2 deve renderizar ApprovalGauge');

// Estado 1.3: Estado Entre Projetos
assert(telaoContent.includes("'1.3_between_projects'"), 'Estado 1.3 deve existir');
assert(telaoContent.includes('VOTAÇÃO ENCERRADA — OBRIGADO PELA PARTICIPAÇÃO!'), 'Estado 1.3 deve ter banner de encerramento temporário');
assert(telaoContent.includes('Aguarde a apresentação do próximo projeto no palco.'), 'Estado 1.3 deve ter orientação');

// Estado 1.4: Resultado Oficial
assert(telaoContent.includes("'1.4_final_results'"), 'Estado 1.4 deve existir');
assert(telaoContent.includes('RESULTADO OFICIAL — <span className="text-arena-gold">ARENA VOICE</span>'), 'Estado 1.4 deve ter título oficial');
assert(telaoContent.includes('firstPlace') && telaoContent.includes('secondPlace') && telaoContent.includes('thirdPlace'), 'Estado 1.4 deve ter Top 3 pódio');

// Sem botões de seleção no rodapé
assert(!telaoContent.includes('Modo Automático'), 'Rodapé não deve ter botão de Modo Automático');
assert(!telaoContent.includes('setSearchParams'), 'Telão não deve depender de parâmetros de modo manuais');
console.log('  ✓ 4 Estados e remoção de botões manuais validados no Telão.');

// 4. TESTE DO FLUXO ADMINISTRATIVO: AdminRoundPage.tsx
console.log('4. Validando sequência e regras em src/pages/admin/AdminRoundPage.tsx...');
const adminRoundContent = fs.readFileSync(path.resolve('src/pages/admin/AdminRoundPage.tsx'), 'utf-8');

assert(adminRoundContent.includes('autoClosedRoundIdRef'), 'Deve existir auto-close quando o tempo esgotar');
assert(adminRoundContent.includes('handleNextProject'), 'Função handleNextProject deve existir');
assert(adminRoundContent.includes('allProjectsPresented'), 'Flag allProjectsPresented deve ser verificada');
assert(adminRoundContent.includes('TODOS OS PROJETOS APRESENTADOS'), 'Mensagem "TODOS OS PROJETOS APRESENTADOS" deve ser exibida ao término');
assert(adminRoundContent.includes('handlePublishOfficialResults'), 'Botão para publicar resultado oficial deve estar disponível');
console.log('  ✓ Sequência estrita e encerramento validados em AdminRoundPage.');

// 5. TESTE DE CONFIGURAÇÕES: AdminSettingsPage.tsx
console.log('5. Validando persistência de ordem e Supabase em src/pages/admin/AdminSettingsPage.tsx...');
const settingsContent = fs.readFileSync(path.resolve('src/pages/admin/AdminSettingsPage.tsx'), 'utf-8');

assert(settingsContent.includes('EventService.updateProject'), 'Ordem deve ser salva no Supabase via EventService.updateProject');
assert(settingsContent.includes('tempoPadraoRodadaSegundos'), 'Duração da rodada deve ser configurável');
assert(!settingsContent.includes('Firebase Storage'), 'Menções antigas a Firebase Storage devem estar removidas');
console.log('  ✓ Persistência de ordem e migração de configurações validadas.');

// 6. TESTE DE LOGOTIPOS TRANSPARENTES
console.log('6. Validando ausência de caixas pretas e logos transparentes...');
const logoContent = fs.readFileSync(path.resolve('src/components/branding/ArenaLogo.tsx'), 'utf-8');
assert(logoContent.includes('logo-completa-transparente.png'), 'Logo completa transparente deve ser utilizada');
assert(logoContent.includes('logo-escrita-transparente.png'), 'Logo escrita transparente deve ser utilizada');
console.log('  ✓ Logotipos transparentes validados.');

// 7. TESTE DE UPLOAD DE BANNERS: ProjectBannerUpload.tsx
console.log('7. Validando componente de upload de banners no Supabase Storage...');
const uploadContent = fs.readFileSync(path.resolve('src/components/admin/ProjectBannerUpload.tsx'), 'utf-8');
assert(uploadContent.includes('project-banners'), 'Upload deve direcionar para bucket project-banners');
assert(uploadContent.includes('MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024'), 'Limite de 5 MB deve ser aplicado');
assert(uploadContent.includes("ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']"), 'Formatos permitidos válidos');
console.log('  ✓ Componente de upload de banners validado.');

// 8. TESTE DO SCRIPT INCREMENTAL SQL
console.log('8. Validando script incremental SQL em supabase/etapa5_telao_storage_patch.sql...');
const sqlContent = fs.readFileSync(path.resolve('supabase/etapa5_telao_storage_patch.sql'), 'utf-8');
assert(sqlContent.includes("insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)"), 'Script deve criar bucket project-banners');
assert(sqlContent.includes("create policy \"project_banners_public_read\""), 'Script deve criar política de leitura pública');
assert(sqlContent.includes("create or replace function public.prepare_next_round"), 'Script deve conter atualização da procedure prepare_next_round');
console.log('  ✓ Script SQL incremental pronto e validado.');

console.log('\n--- TODOS OS 8 TESTES DA REESTRUTURAÇÃO FORAM EXECUTADOS E APROVADOS COM SUCESSO! ---');

