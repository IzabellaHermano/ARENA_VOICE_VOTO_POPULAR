/**
 * ARENA VOICE — VOTO POPULAR
 * Validação Técnica Obrigatória da ETAPA 3:
 * Gerenciamento Real de Projetos no Supabase (CRUD, Integridade e Proteção de Histórico)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega .env sem bibliotecas externas
const envPath = resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  });
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EVENT_ID = 'arena-voice-2026';

console.log('===========================================================================');
console.log('ARENA VOICE — VOTO POPULAR: VALIDAÇÃO TÉCNICA DA ETAPA 3');
console.log('CADASTRO, EDIÇÃO, EXCLUSÃO E GERENCIAMENTO REAL DE PROJETOS NO SUPABASE');
console.log('===========================================================================');

const testResults = [];
function recordResult(code, description, passed, detail) {
  testResults.push({ code, description, passed, detail });
  console.log(`[${passed ? '✅ PASS' : '❌ FAIL'}] ${code}: ${description} -> ${detail}`);
}

async function runEtapa3Tests() {
  const adminClient = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 0. Autenticação Administrativa
    console.log('\n--- 0. AUTENTICAÇÃO DO ADMINISTRADOR NO SUPABASE ---');
    const { data: authData, error: authErr } = await adminClient.auth.signInWithPassword({
      email: 'admin@cptm.sp.gov.br',
      password: '123456',
    });

    if (authErr) throw new Error(`Falha no login admin: ${authErr.message}`);
    recordResult('AUTH', 'Login administrativo com credencial oficial', true, authData.user.email);

    // ----------------------------------------------------
    // TESTE A: CRIAÇÃO DE NOVO PROJETO NO SUPABASE
    // ----------------------------------------------------
    console.log('\n--- TESTE A: CRIAÇÃO DE NOVO PROJETO (INSERT REAL) ---');
    const testProjectId = `proj_etapa3_${Date.now()}`;
    const newProjectPayload = {
      id: testProjectId,
      event_id: EVENT_ID,
      name: 'Projeto Piloto Etapa 3 — Expansão Segura',
      category: 'Inovação Ferroviária e IA',
      description: 'Solução automatizada para auditoria de persistência sem fallbacks locais.',
      banner_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
      order: 10,
      active: true,
      status: 'active',
    };

    const { data: createdProject, error: createErr } = await adminClient
      .from('projects')
      .insert(newProjectPayload)
      .select('*')
      .single();

    const testACreated = !createErr && createdProject?.id === testProjectId;
    recordResult(
      'TESTE-A1',
      'Inserção de novo projeto no Supabase (public.projects)',
      testACreated,
      testACreated ? `ID: ${createdProject.id} | Nome: "${createdProject.name}"` : createErr?.message
    );

    // Validação da persistência consultando novamente via SELECT
    const { data: verifiedProject, error: verifyErr } = await adminClient
      .from('projects')
      .select('*')
      .eq('id', testProjectId)
      .maybeSingle();

    const testAPersisted = !verifyErr && verifiedProject?.name === newProjectPayload.name;
    recordResult(
      'TESTE-A2',
      'Confirmação da persistência no banco relacional',
      testAPersisted,
      testAPersisted ? `Order: ${verifiedProject.order} | Categoria: ${verifiedProject.category}` : verifyErr?.message
    );

    // ----------------------------------------------------
    // TESTE B: EDIÇÃO DE PROJETO EXISTENTE
    // ----------------------------------------------------
    console.log('\n--- TESTE B: EDIÇÃO DE PROJETO (UPDATE PRESERVANDO ID) ---');
    const updatePayload = {
      name: 'Projeto Piloto Etapa 3 — ATUALIZADO',
      category: 'Mobilidade Digital e Preditiva',
      description: 'Descrição devidamente atualizada via painel de administração.',
      order: 11,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProject, error: updateErr } = await adminClient
      .from('projects')
      .update(updatePayload)
      .eq('id', testProjectId)
      .select('*')
      .single();

    const testBUpdated =
      !updateErr &&
      updatedProject?.name === updatePayload.name &&
      updatedProject?.id === testProjectId; // Chave primária inalterada

    recordResult(
      'TESTE-B1',
      'Atualização de campos de projeto diretamente no Supabase',
      testBUpdated,
      testBUpdated
        ? `Nome atualizado: "${updatedProject.name}" | ID preservado: ${updatedProject.id}`
        : updateErr?.message
    );

    // ----------------------------------------------------
    // TESTE C: INTEGRIDADE DO SELETOR E LISTAGEM
    // ----------------------------------------------------
    console.log('\n--- TESTE C: INTEGRIDADE DA LISTA DE PROJETOS ---');
    const { data: allProjects, error: listErr } = await adminClient
      .from('projects')
      .select('id, name, order, active, status')
      .eq('event_id', EVENT_ID)
      .order('order', { ascending: true });

    const containsCreated = allProjects?.some((p) => p.id === testProjectId);
    const originalProjectsPresent =
      allProjects?.some((p) => p.id === 'projeto01') &&
      allProjects?.some((p) => p.id === 'projeto02') &&
      allProjects?.some((p) => p.id === 'projeto03') &&
      allProjects?.some((p) => p.id === 'projeto04');

    recordResult(
      'TESTE-C1',
      'Projeto recém-cadastrado aparece na listagem do evento',
      containsCreated,
      `Total de projetos no banco: ${allProjects?.length}`
    );

    recordResult(
      'TESTE-C2',
      'Projetos preexistentes da competição preservados integralmente',
      originalProjectsPresent,
      'projeto01, projeto02, projeto03, projeto04 presentes'
    );

    // ----------------------------------------------------
    // TESTE D: VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
    // ----------------------------------------------------
    console.log('\n--- TESTE D: VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ---');
    const { error: invalidInsertErr } = await adminClient.from('projects').insert({
      id: `proj_invalid_${Date.now()}`,
      event_id: EVENT_ID,
      name: null, // Campo NOT NULL
      order: 1,
    });

    const validationEnforced = !!invalidInsertErr;
    recordResult(
      'TESTE-D1',
      'Rejeição no banco de projeto sem nome (NOT NULL constraint)',
      validationEnforced,
      invalidInsertErr?.message || 'Permitiu nulo indevidamente!'
    );

    // ----------------------------------------------------
    // TESTE E: EXCLUSÃO SEGURA VS. PROTEÇÃO DE HISTÓRICO
    // ----------------------------------------------------
    console.log('\n--- TESTE E: EXCLUSÃO SEGURA E PROTEÇÃO DE HISTÓRICO ---');

    // E1: Projeto com histórico (projeto01)
    const [roundsCheck, votesCheck] = await Promise.all([
      adminClient.from('rounds').select('id', { count: 'exact', head: true }).eq('project_id', 'projeto01'),
      adminClient.from('votes').select('id', { count: 'exact', head: true }).eq('project_id', 'projeto01'),
    ]);

    const hasHistory = (roundsCheck.count || 0) > 0 || (votesCheck.count || 0) > 0;
    recordResult(
      'TESTE-E1',
      'Identificação de histórico vinculado em projeto ativo',
      hasHistory,
      `projeto01 possui ${roundsCheck.count || 0} rodadas e ${votesCheck.count || 0} votos associados`
    );

    // E2: Alternância de Ativação / Desativação (Soft Delete) no projeto com histórico
    const { data: deactivated, error: deactErr } = await adminClient
      .from('projects')
      .update({ active: false, status: 'inactive' })
      .eq('id', 'projeto01')
      .select('*')
      .single();

    const deactSuccess = !deactErr && deactivated?.active === false && deactivated?.status === 'inactive';
    recordResult(
      'TESTE-E2',
      'Desativação segura de projeto com histórico (active=false, status=inactive)',
      deactSuccess,
      `Status atual: ${deactivated?.status} | Ativo: ${deactivated?.active}`
    );

    // Restaura projeto01 para ativo
    await adminClient
      .from('projects')
      .update({ active: true, status: 'active' })
      .eq('id', 'projeto01');

    // E3: Exclusão física permitida apenas em projeto limpo (sem histórico)
    const [testRounds, testVotes] = await Promise.all([
      adminClient.from('rounds').select('id', { count: 'exact', head: true }).eq('project_id', testProjectId),
      adminClient.from('votes').select('id', { count: 'exact', head: true }).eq('project_id', testProjectId),
    ]);

    const testHasNoHistory = (testRounds.count || 0) === 0 && (testVotes.count || 0) === 0;
    recordResult(
      'TESTE-E3',
      'Verificação de ausência de histórico no projeto de teste',
      testHasNoHistory,
      `Rodadas: ${testRounds.count || 0} | Votos: ${testVotes.count || 0}`
    );

    // Executa a exclusão física do projeto de teste
    const { error: delErr } = await adminClient.from('projects').delete().eq('id', testProjectId);
    const deleteSuccess = !delErr;

    // Confirma que não existe mais no banco
    const { data: recheckDeleted } = await adminClient
      .from('projects')
      .select('id')
      .eq('id', testProjectId)
      .maybeSingle();

    const confirmedDeleted = deleteSuccess && recheckDeleted === null;
    recordResult(
      'TESTE-E4',
      'Exclusão física bem-sucedida de projeto limpo',
      confirmedDeleted,
      confirmedDeleted ? 'Registro removido permanentemente do Supabase' : 'Ainda localizado no banco'
    );
  } catch (err) {
    console.error('\nErro fatal durante a execução dos testes:', err);
    recordResult('FATAL', 'Execução dos testes da Etapa 3', false, err.message);
  }

  console.log('\n===========================================================================');
  const allPassed = testResults.every((t) => t.passed);
  console.log(`TOTAL DE TESTES: ${testResults.length} | APROVADOS: ${testResults.filter((t) => t.passed).length} | FALHAS: ${testResults.filter((t) => !t.passed).length}`);
  console.log(`STATUS GERAL DA ETAPA 3: ${allPassed ? '✅ APROVADO COM SUCESSO' : '❌ REPROVADO'}`);
  console.log('===========================================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runEtapa3Tests();

