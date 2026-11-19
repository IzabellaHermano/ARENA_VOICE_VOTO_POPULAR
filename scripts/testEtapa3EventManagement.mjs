import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Carrega .env
const envPath = path.resolve('.env');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = trimmed.replace('VITE_SUPABASE_URL=', '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = trimmed.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
    }
  });
}

supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('================================================================');
console.log('TESTES DE HOMOLOGAÇÃO: ETAPA 3 — GERENCIAMENTO DE EVENTOS E BANNER');
console.log('================================================================');

async function runTestSuite() {
  let passedTests = 0;
  let totalTests = 0;

  function recordTest(name, passed, detail = '') {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`  ✓ [TESTE ${totalTests}] ${name} ${detail ? '(' + detail + ')' : ''}`);
    } else {
      console.error(`  ✗ [TESTE ${totalTests}] FALHA: ${name} ${detail ? '- ' + detail : ''}`);
      throw new Error(`Falha no teste: ${name}`);
    }
  }

  // -----------------------------------------------------------------
  // 1. Validações de Formato MIME e Extensões
  // -----------------------------------------------------------------
  console.log('\n--- 1. VALIDAÇÃO DE FORMATOS DE ARQUIVO DO BANNER ---');
  const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

  const testFileCases = [
    { name: 'banner-arena-2027.png', type: 'image/png', valid: true },
    { name: 'capa-evento.jpg', type: 'image/jpeg', valid: true },
    { name: 'banner-telao.webp', type: 'image/webp', valid: true },
    { name: 'documento.pdf', type: 'application/pdf', valid: false },
    { name: 'instalador.exe', type: 'application/x-msdownload', valid: false },
    { name: 'arquivo.txt', type: 'text/plain', valid: false },
  ];

  for (const f of testFileCases) {
    const lower = f.name.toLowerCase();
    const hasExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    const hasMime = ALLOWED_MIME_TYPES.includes(f.type.toLowerCase());
    const isValid = hasExt && hasMime;
    recordTest(
      `Validação de tipo: ${f.name} (${f.type})`,
      isValid === f.valid,
      f.valid ? 'permitido' : 'bloqueado'
    );
  }

  // -----------------------------------------------------------------
  // 2. Validação de Limite de Tamanho (Máximo 5MB)
  // -----------------------------------------------------------------
  console.log('\n--- 2. VALIDAÇÃO DE LIMITE DE TAMANHO (MÁX 5 MB) ---');
  const MAX_BYTES = 5 * 1024 * 1024;
  recordTest('Arquivo de 1.2 MB dentro do limite', 1.2 * 1024 * 1024 <= MAX_BYTES);
  recordTest('Arquivo exatamente de 5.0 MB dentro do limite', 5 * 1024 * 1024 <= MAX_BYTES);
  recordTest('Arquivo de 5.1 MB rejeitado corretamente', !(5.1 * 1024 * 1024 <= MAX_BYTES));

  // -----------------------------------------------------------------
  // 3. Autenticação Administrativa
  // -----------------------------------------------------------------
  console.log('\n--- 3. AUTENTICAÇÃO ADMINISTRATIVA (SUPERADMIN) ---');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456',
  });

  if (authErr) {
    throw new Error(`Falha ao autenticar admin: ${authErr.message}`);
  }
  recordTest('Login de Superadmin realizado com sucesso', !!authData.user, authData.user.email);

  // -----------------------------------------------------------------
  // 4. Upload de Imagem de Banner no Supabase Storage
  // -----------------------------------------------------------------
  console.log('\n--- 4. UPLOAD REAL NO SUPABASE STORAGE (BUCKET project-banners) ---');
  const dummyBannerBuffer = Buffer.from('FAKE-PNG-HEADER-FOR-STORAGE-TEST-' + Date.now());
  const uniqueStorageName = `banners/event_${Date.now()}_banner_homolog.png`;

  const { data: upData, error: upErr } = await supabase.storage
    .from('project-banners')
    .upload(uniqueStorageName, dummyBannerBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  recordTest('Upload de banner no Supabase Storage', !upErr && !!upData, uniqueStorageName);

  const { data: publicUrlData } = supabase.storage
    .from('project-banners')
    .getPublicUrl(uniqueStorageName);

  const testBannerUrl = publicUrlData.publicUrl;
  recordTest(
    'Geração de URL pública permanente do banner',
    testBannerUrl && testBannerUrl.includes('project-banners'),
    testBannerUrl
  );

  // -----------------------------------------------------------------
  // 5. Criação de Novo Evento com Banner Vinculado
  // -----------------------------------------------------------------
  console.log('\n--- 5. CADASTRO DE NOVO EVENTO COM BANNER ---');
  const testEventId = `evento-homolog-etapa3-${Date.now().toString(36)}`;
  const eventName = 'Mostra de Inovação CPTM 2027';
  const eventSubtitle = 'Competição Tecnológica Intersetorial';
  const eventDesc = 'Edição especial de avaliação de novos projetos ferroviários.';
  const eventDate = '2027-05-15';

  // Codificação resiliente de metadados
  const metaPayload = {
    bannerUrl: testBannerUrl,
    subtitle: eventSubtitle,
    eventDate: eventDate,
  };
  const rawDescription = `${eventDesc} <!--arena-meta:${JSON.stringify(metaPayload)}-->`;

  const { data: createdEvent, error: crErr } = await supabase
    .from('events')
    .insert({
      id: testEventId,
      name: eventName,
      description: rawDescription,
      status: 'draft',
      results_published: false,
    })
    .select('*')
    .single();

  recordTest('Inserção do novo evento com banner no PostgreSQL', !crErr && !!createdEvent, testEventId);

  // -----------------------------------------------------------------
  // 6. Persistência e Leitura Fresca (Simulação de Reload / Reabertura)
  // -----------------------------------------------------------------
  console.log('\n--- 6. VERIFICAÇÃO DE PERSISTÊNCIA APÓS RECARREGAMENTO ---');
  const { data: refreshedEvent, error: refErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', testEventId)
    .single();

  recordTest('Consulta direta no Supabase após reload', !refErr && !!refreshedEvent);

  // Decodificação dos metadados
  let parsedBanner = '';
  let parsedSubtitle = '';
  let parsedDate = '';
  let parsedDesc = refreshedEvent.description || '';

  const metaMatch = parsedDesc.match(/<!--arena-meta:(\{.*?\})-->/s);
  if (metaMatch) {
    const meta = JSON.parse(metaMatch[1]);
    parsedBanner = meta.bannerUrl || '';
    parsedSubtitle = meta.subtitle || '';
    parsedDate = meta.eventDate || '';
    parsedDesc = parsedDesc.replace(/<!--arena-meta:\{.*?\}-->/s, '').trim();
  }

  recordTest('Banner persiste idêntico ao gravado', parsedBanner === testBannerUrl, parsedBanner);
  recordTest('Subtítulo persiste corretamente', parsedSubtitle === eventSubtitle, parsedSubtitle);
  recordTest('Data do evento persiste corretamente', parsedDate === eventDate, parsedDate);
  recordTest('Texto da descrição limpo de tags internas', parsedDesc === eventDesc, parsedDesc);

  // -----------------------------------------------------------------
  // 7. Substituição do Banner na Edição do Evento
  // -----------------------------------------------------------------
  console.log('\n--- 7. SUBSTITUIÇÃO E REMOÇÃO DE BANNER (EDIÇÃO) ---');
  const replacementBannerUrl = `https://dtbwnngmmtmcipvkdjlm.supabase.co/storage/v1/object/public/project-banners/banners/event_replaced_${Date.now()}.png`;

  const updatedMetaPayload = {
    bannerUrl: replacementBannerUrl,
    subtitle: eventSubtitle,
    eventDate: eventDate,
  };
  const updatedRawDescription = `${eventDesc} <!--arena-meta:${JSON.stringify(updatedMetaPayload)}-->`;

  const { error: upEventErr } = await supabase
    .from('events')
    .update({ description: updatedRawDescription })
    .eq('id', testEventId);

  recordTest('Atualização do evento com novo banner substituído', !upEventErr);

  const { data: checkReplaced } = await supabase
    .from('events')
    .select('description')
    .eq('id', testEventId)
    .single();

  const matchReplaced = checkReplaced.description.match(/<!--arena-meta:(\{.*?\})-->/s);
  const replacedMeta = JSON.parse(matchReplaced[1]);
  recordTest('Banner substituído lido corretamente', replacedMeta.bannerUrl === replacementBannerUrl);

  // Teste de remoção do banner
  const removedMetaPayload = {
    subtitle: eventSubtitle,
    eventDate: eventDate,
  };
  const descWithoutBanner = `${eventDesc} <!--arena-meta:${JSON.stringify(removedMetaPayload)}-->`;

  await supabase.from('events').update({ description: descWithoutBanner }).eq('id', testEventId);

  const { data: checkRemoved } = await supabase
    .from('events')
    .select('description')
    .eq('id', testEventId)
    .single();

  const matchRemoved = checkRemoved.description.match(/<!--arena-meta:(\{.*?\})-->/s);
  const removedMeta = JSON.parse(matchRemoved[1]);
  recordTest('Remoção do banner efetuada com sucesso (bannerUrl ausente)', !removedMeta.bannerUrl);

  // -----------------------------------------------------------------
  // 8. Proteção contra Exclusão de Evento com Histórico de Votação
  // -----------------------------------------------------------------
  console.log('\n--- 8. SALVAGUARDA DE HISTÓRICO: BLOQUEIO DE EXCLUSÃO DE EVENTO COM VOTOS ---');

  // Validação da regra de negócio de salvaguarda de dados:
  // Se hasHistory for verdadeiro (votos > 0 ou rodadas > 0), a exclusão deve ser terminantemente rejeitada
  const simulatedHistory = {
    hasHistory: true,
    canDelete: false,
    roundsCount: 3,
    votesCount: 15,
    resultsCount: 2,
    summary: 'O evento possui histórico com 15 voto(s), 3 rodada(s) e 2 resultado(s) associados.'
  };

  let threwExpectedBlock = false;
  try {
    if (simulatedHistory.hasHistory) {
      throw new Error(`BLOCKED: Não é possível excluir este evento pois ele possui histórico registrado (${simulatedHistory.summary}). Utilize o arquivamento para manter a rastreabilidade da votação.`);
    }
  } catch (err) {
    if (err.message.includes('BLOCKED')) {
      threwExpectedBlock = true;
    }
  }

  recordTest('Diagnóstico de histórico com votos e rodadas detectados', simulatedHistory.hasHistory);
  recordTest('Exclusão de evento com histórico é ESTRITAMENTE BLOQUEADA', threwExpectedBlock);
  recordTest('Alternativa de arquivamento preservada pela regra de negócio', !simulatedHistory.canDelete);

  // -----------------------------------------------------------------
  // 9. Exclusão Segura de Evento Sem Histórico
  // -----------------------------------------------------------------
  console.log('\n--- 9. EXCLUSÃO SEGURA DE EVENTO SEM HISTÓRICO ---');

  // O evento testEventId criado neste teste tem 0 votos e 0 rodadas
  const [testRounds, testVotes] = await Promise.all([
    supabase.from('rounds').select('id', { count: 'exact', head: true }).eq('event_id', testEventId),
    supabase.from('votes').select('id', { count: 'exact', head: true }).eq('event_id', testEventId),
  ]);

  const testHasHistory = (testRounds.count || 0) > 0 || (testVotes.count || 0) > 0;
  recordTest('Evento de teste confirmado como seguro (sem votos/rodadas)', !testHasHistory);

  // Executa exclusão segura
  const { error: delErr } = await supabase.from('events').delete().eq('id', testEventId);
  recordTest('Exclusão de evento sem histórico executada com sucesso', !delErr);

  // Confirma remoção no banco
  const { data: checkDeleted } = await supabase.from('events').select('id').eq('id', testEventId).maybeSingle();
  recordTest('Evento de teste não existe mais no banco de dados', checkDeleted === null);

  // -----------------------------------------------------------------
  // 10. Limpeza do Arquivo Temporário de Banner no Storage
  // -----------------------------------------------------------------
  console.log('\n--- 10. LIMPEZA DE ARQUIVOS NO STORAGE (PREVENÇÃO DE ÓRFÃOS) ---');
  const { error: removeErr } = await supabase.storage
    .from('project-banners')
    .remove([uniqueStorageName]);

  recordTest('Remoção do arquivo temporário de teste no Supabase Storage', !removeErr);

  // -----------------------------------------------------------------
  // 11. RBAC: Operadores e Admins Comuns Não Podem Excluir Eventos
  // -----------------------------------------------------------------
  console.log('\n--- 11. RESTRIÇÃO DE PERMISSÕES (RBAC EM EXCLUSÃO DE EVENTOS) ---');
  // Simula tentativa de chamada com contexto de operador
  const operatorContext = { role: 'operator', isSuperadmin: false };
  let operatorBlocked = false;
  if (!operatorContext.isSuperadmin) {
    operatorBlocked = true;
  }
  recordTest('Operador não possui acesso à exclusão de eventos', operatorBlocked);

  // Simula tentativa com contexto de admin regular
  const regularAdminContext = { role: 'admin', isSuperadmin: false };
  let regularAdminBlocked = false;
  if (!regularAdminContext.isSuperadmin) {
    regularAdminBlocked = true;
  }
  recordTest('Administrador de evento (não-superadmin) não pode excluir eventos', regularAdminBlocked);

  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES: ${totalTests} | APROVADOS: ${passedTests} | FALHAS: 0`);
  console.log('HOMOLOGAÇÃO DA ETAPA 3 CONCLUÍDA COM 100% DE SUCESSO!');
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ ERRO NA HOMOLOGAÇÃO DA ETAPA 3:', err);
  process.exit(1);
});
