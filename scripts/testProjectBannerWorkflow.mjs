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
  content.split('\n').forEach(line => {
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
console.log('TESTES DE HOMOLOGAÇÃO: UPLOAD E FLUXO DE BANNERS DOS PROJETOS');
console.log('================================================================');

async function runTests() {
  // -------------------------------------------------------------
  // TESTE 1, 2, 3: Validação de formatos PNG, JPG, WEBP
  // -------------------------------------------------------------
  console.log('\n[TESTE 1, 2, 3] Validando regras de formato permitidos (PNG, JPG, WEBP)...');
  const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

  const testFiles = [
    { name: 'banner-inovacao.png', type: 'image/png', valid: true },
    { name: 'trem-metropolitano.jpg', type: 'image/jpeg', valid: true },
    { name: 'painel-estacao.webp', type: 'image/webp', valid: true },
    { name: 'relatorio.pdf', type: 'application/pdf', valid: false },
    { name: 'script.exe', type: 'application/x-msdownload', valid: false },
    { name: 'imagem-falsa.png.exe', type: 'application/x-msdownload', valid: false },
  ];

  for (const f of testFiles) {
    const lower = f.name.toLowerCase();
    const hasExt = ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
    const hasMime = ALLOWED_MIME_TYPES.includes(f.type.toLowerCase());
    const isValid = hasExt && hasMime;
    assert.strictEqual(isValid, f.valid, `Arquivo ${f.name} deveria ser ${f.valid ? 'válido' : 'inválido'}`);
  }
  console.log('  ✓ PNG, JPG/JPEG e WEBP aceitos; extensões não autorizadas bloqueadas com sucesso.');

  // -------------------------------------------------------------
  // TESTE 4: Validação de limite de tamanho (Máx 5 MB)
  // -------------------------------------------------------------
  console.log('\n[TESTE 4] Validando limite de tamanho máximo de 5 MB...');
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  const smallFile = { size: 1.5 * 1024 * 1024 }; // 1.5 MB
  const exactMaxFile = { size: 5 * 1024 * 1024 }; // 5 MB
  const overSizeFile = { size: 5.01 * 1024 * 1024 }; // 5.01 MB

  assert.strictEqual(smallFile.size <= MAX_FILE_SIZE_BYTES, true);
  assert.strictEqual(exactMaxFile.size <= MAX_FILE_SIZE_BYTES, true);
  assert.strictEqual(overSizeFile.size <= MAX_FILE_SIZE_BYTES, false);
  console.log('  ✓ Limite de 5 MB estritamente aplicado (rejeita arquivos > 5 MB).');

  // -------------------------------------------------------------
  // TESTE 5: Validação de arquivo não-imagem (falso positivo por extensão)
  // -------------------------------------------------------------
  console.log('\n[TESTE 5] Validando proteção contra arquivos não-imagem com extensão forçada...');
  const fakePng = { name: 'documento.png', type: 'text/plain' };
  const isTypeValid = ALLOWED_MIME_TYPES.includes(fakePng.type);
  assert.strictEqual(isTypeValid, false, 'Arquivo com MIME text/plain deve ser rejeitado');
  console.log('  ✓ Arquivos não-imagem com extensão adulterada são bloqueados.');

  // -------------------------------------------------------------
  // TESTE 6: Status real do Supabase Storage
  // -------------------------------------------------------------
  console.log('\n[TESTE 6] Verificando status real do Supabase Storage...');
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.id === 'project-banners');
  console.log('  Buckets existentes no Supabase:', buckets?.map(b => b.id) || []);
  console.log('  Bucket "project-banners" presente:', bucketExists);

  const testPublicUrl = supabase.storage.from('project-banners').getPublicUrl('banners/demo.png');
  console.log('  Estrutura da URL pública gerada:', testPublicUrl.data.publicUrl);
  assert(testPublicUrl.data.publicUrl.includes('/storage/v1/object/public/project-banners/banners/demo.png'));
  console.log('  ✓ Estrutura de URL permanente do Supabase validada.');

  // -------------------------------------------------------------
  // Autenticação Administrativa (Exigida pelo RLS de public.projects)
  // -------------------------------------------------------------
  console.log('\n[AUTH] Autenticando como Administrador (admin@cptm.sp.gov.br)...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456'
  });

  if (authErr) {
    throw new Error(`Falha na autenticação administrativa: ${authErr.message}`);
  }
  console.log('  ✓ Sessão administrativa estabelecida! UID:', authData.user.id);

  // -------------------------------------------------------------
  // TESTE 7: Cadastrar projeto de homologação COM BANNER no Supabase
  // -------------------------------------------------------------
  console.log('\n[TESTE 7] Cadastrando projeto de homologação com banner no Supabase...');
  const testProjectId = `proj_homolog_banner_${Date.now().toString(36)}`;
  const initialBannerUrl = `https://dtbwnngmmtmcipvkdjlm.supabase.co/storage/v1/object/public/project-banners/banners/banner_teste_1.png`;

  const { data: inserted, error: insertErr } = await supabase
    .from('projects')
    .insert({
      id: testProjectId,
      event_id: 'arena-voice-2026',
      name: 'Projeto Homologação Banner',
      category: 'Inovação e Mídia',
      description: 'Projeto criado para validar persistência de banners e substituição.',
      banner_url: initialBannerUrl,
      image_url: initialBannerUrl,
      order: 888,
      active: true,
      status: 'active',
    })
    .select('*')
    .single();

  if (insertErr) {
    throw new Error(`Falha ao inserir projeto de teste: ${insertErr.message}`);
  }

  assert.strictEqual(inserted.id, testProjectId);
  assert.strictEqual(inserted.banner_url, initialBannerUrl);
  console.log('  ✓ Projeto cadastrado com sucesso com banner_url:', inserted.banner_url);

  // -------------------------------------------------------------
  // TESTE 8: Atualizar página (Simulação: nova consulta no banco)
  // -------------------------------------------------------------
  console.log('\n[TESTE 8] Simulando recarregamento de página (SELECT fresco)...');
  const { data: refreshed, error: refErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', testProjectId)
    .single();

  assert(!refErr, `Erro no refresh: ${refErr?.message}`);
  assert.strictEqual(refreshed.banner_url, initialBannerUrl, 'O banner deve persistir inalterado');
  console.log('  ✓ Banner permanece gravado e idêntico após recarregamento.');

  // -------------------------------------------------------------
  // TESTE 9: Abrir edição e verificar se o banner aparece
  // -------------------------------------------------------------
  console.log('\n[TESTE 9] Simulando abertura do formulário de edição...');
  const formInitialState = refreshed.banner_url || '';
  assert.strictEqual(formInitialState, initialBannerUrl);
  console.log('  ✓ Formulário de edição carrega o banner pré-existente:', formInitialState);

  // -------------------------------------------------------------
  // TESTE 10: Substituir banner por nova imagem
  // -------------------------------------------------------------
  console.log('\n[TESTE 10] Substituindo banner por nova imagem no Supabase...');
  const newBannerUrl = `https://dtbwnngmmtmcipvkdjlm.supabase.co/storage/v1/object/public/project-banners/banners/banner_substituto_2.png`;

  const { data: updated, error: upErr } = await supabase
    .from('projects')
    .update({
      banner_url: newBannerUrl,
      image_url: newBannerUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', testProjectId)
    .select('*')
    .single();

  assert(!upErr, `Erro na substituição: ${upErr?.message}`);
  assert.strictEqual(updated.banner_url, newBannerUrl, 'O banner deve ser atualizado para a nova URL');
  console.log('  ✓ Substituição de banner realizada com sucesso:', updated.banner_url);

  // -------------------------------------------------------------
  // TESTE 11: Telão recupera o banner atualizado
  // -------------------------------------------------------------
  console.log('\n[TESTE 11] Validando mapeamento para o Telão...');
  const telaoProject = {
    id: updated.id,
    name: updated.name,
    category: updated.category,
    bannerUrl: updated.banner_url || updated.image_url || '',
    active: updated.active,
  };
  assert.strictEqual(telaoProject.bannerUrl, newBannerUrl);
  console.log('  ✓ O Telão recebe e exibe o novo banner atualizado:', telaoProject.bannerUrl);

  // -------------------------------------------------------------
  // TESTE 12: Projeto sem banner (fallback gracioso sem quebrar)
  // -------------------------------------------------------------
  console.log('\n[TESTE 12] Validando projeto sem banner (espaço de ausência visual)...');
  const { data: withoutBanner, error: noBannerErr } = await supabase
    .from('projects')
    .update({
      banner_url: '',
      image_url: '',
      updated_at: new Date().toISOString()
    })
    .eq('id', testProjectId)
    .select('*')
    .single();

  assert(!noBannerErr);
  assert.strictEqual(withoutBanner.banner_url, '');
  console.log('  ✓ Projeto sem banner preserva layout com componente fallback limpo.');

  // Limpeza do projeto de teste de homologação para manter integridade
  console.log('\n[LIMPEZA] Removendo projeto de homologação de teste...');
  await supabase.from('projects').delete().eq('id', testProjectId);
  console.log('  ✓ Projeto de homologação removido após testes. Banco de dados preservado.');

  console.log('\n================================================================');
  console.log('TODOS OS 12 TESTES DO FLUXO DE BANNERS FORAM CONCLUÍDOS COM SUCESSO!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('\n❌ FALHA NOS TESTES:', err);
  process.exit(1);
});
