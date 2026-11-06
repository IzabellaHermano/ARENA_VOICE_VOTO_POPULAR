/**
 * ARENA VOICE — VOTO POPULAR
 * Teste Automatizado de Integridade e Validação da Migração Supabase
 *
 * Valida:
 * 1. Estrutura do schema SQL (tabelas, constraints, RPCs, RLS, Realtime)
 * 2. Regra de unicidade: UNIQUE(event_id, project_id, voter_id)
 * 3. Identificação segura do votante via auth.uid() no SQL (não confia no frontend)
 * 4. Status inicial corrigido para 'aguardando' (evita pular direto para /avaliar)
 * 5. Não exposição de service_role key no frontend
 * 6. Arquivos de configuração e exportações de serviço
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [✅ PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [❌ FAIL] ${testName} ${details ? '- ' + details : ''}`);
  }
}

console.log('===========================================================================');
console.log('ARENA VOICE — VOTO POPULAR: TESTES DE INTEGRAÇÃO SUPABASE');
console.log('===========================================================================');

// 1. Validação do schema.sql
console.log('\n--- 1. SCHEMA SQL E ESTRUTURA DO BANCO ---');
const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
assert(fs.existsSync(schemaPath), 'Arquivo supabase/schema.sql existe');

const schemaSql = fs.readFileSync(schemaPath, 'utf8');
const lowerSchemaSql = schemaSql.toLowerCase();

// Tabelas principais
assert(lowerSchemaSql.includes('create table if not exists public.events'), 'Tabela public.events definida');
assert(lowerSchemaSql.includes('create table if not exists public.projects'), 'Tabela public.projects definida');
assert(lowerSchemaSql.includes('create table if not exists public.rounds'), 'Tabela public.rounds definida');
assert(lowerSchemaSql.includes('create table if not exists public.votes'), 'Tabela public.votes definida');
assert(lowerSchemaSql.includes('create table if not exists public.results'), 'Tabela public.results definida');
assert(lowerSchemaSql.includes('create table if not exists public.admin_profiles'), 'Tabela public.admin_profiles definida');

// Regra de unicidade revisada (Etapa 1: UNIQUE(event_id, project_id, voter_id))
assert(
  lowerSchemaSql.includes('constraint uq_votes_event_project_voter unique (event_id, project_id, voter_id)'),
  'Restrição de unicidade UNIQUE(event_id, project_id, voter_id) configurada'
);

// Validação de notas 1..5
assert(
  lowerSchemaSql.includes('check (innovation_score between 1 and 5)') &&
  lowerSchemaSql.includes('check (cptm_impact_score between 1 and 5)') &&
  lowerSchemaSql.includes('check (development_score between 1 and 5)'),
  'Restrição CHECK para notas entre 1 e 5 em todas as dimensões'
);

// 2. Funções PL/pgSQL Atômicas e Segurança
console.log('\n--- 2. FUNÇÕES ATÔMICAS E SEGURANÇA PL/PGSQL ---');
assert(lowerSchemaSql.includes('create or replace function public.submit_vote'), 'Função atômica submit_vote definida');
assert(lowerSchemaSql.includes('create or replace function public.open_round'), 'Função atômica open_round definida');
assert(lowerSchemaSql.includes('create or replace function public.close_round'), 'Função atômica close_round definida');
assert(lowerSchemaSql.includes('create or replace function public.prepare_next_round'), 'Função atômica prepare_next_round definida');
assert(lowerSchemaSql.includes('create or replace function public.get_admin_results'), 'Função atômica get_admin_results definida');

// Garantia de auth.uid() no servidor para submit_vote
assert(
  lowerSchemaSql.includes('v_voter_id := auth.uid();') &&
  lowerSchemaSql.includes('if v_voter_id is null then') &&
  lowerSchemaSql.includes('security definer') &&
  lowerSchemaSql.includes('set search_path = public, pg_temp'),
  'submit_vote usa auth.uid() obrigatório, SECURITY DEFINER e search_path restrito'
);

// RLS e Realtime
console.log('\n--- 3. RLS E PUBLICAÇÃO REALTIME ---');
assert(lowerSchemaSql.includes('alter table public.votes enable row level security;'), 'RLS habilitado para public.votes');
assert(lowerSchemaSql.includes('alter table public.results enable row level security;'), 'RLS habilitado para public.results');
assert(lowerSchemaSql.includes('alter table public.rounds enable row level security;'), 'RLS habilitado para public.rounds');

// Votos NÃO devem estar no Realtime (evitar vazamento de votos individuais/UIDs)
const realtimeIdx = lowerSchemaSql.indexOf('supabase_realtime');
const realtimeBlock = lowerSchemaSql.slice(realtimeIdx);
assert(
  realtimeBlock.includes('add table public.events') &&
  realtimeBlock.includes('add table public.rounds') &&
  realtimeBlock.includes('add table public.projects') &&
  realtimeBlock.includes('add table public.results') &&
  !realtimeBlock.includes('add table public.votes'),
  'Realtime publica events, rounds, projects e results; votes omitido por privacidade'
);

// 4. Correção do Status Inicial (Bug de abrir direto em /avaliar)
console.log('\n--- 4. STATUS INICIAL E FLUXO DE ENTRADA ---');
const adminMockPath = path.join(rootDir, 'src', 'services', 'adminMockService.ts');
const adminMockContent = fs.readFileSync(adminMockPath, 'utf8');
assert(
  adminMockContent.includes("status: 'aguardando'") && !adminMockContent.includes("status: 'aberta'"),
  'adminMockService inicializa rodada como "aguardando" (não abre direto a avaliação)'
);

const adminRoundPath = path.join(rootDir, 'src', 'pages', 'admin', 'AdminRoundPage.tsx');
const adminRoundContent = fs.readFileSync(adminRoundPath, 'utf8');
assert(
  adminRoundContent.includes("useState<RoundStatusType>('aguardando')"),
  'AdminRoundPage inicia estado local em "aguardando"'
);

// 5. Configuração e Serviços Supabase Frontend
console.log('\n--- 5. INTEGRAÇÃO FRONTEND SUPABASE ---');
const clientPath = path.join(rootDir, 'src', 'supabase', 'client.ts');
assert(fs.existsSync(clientPath), 'src/supabase/client.ts existe');
const clientContent = fs.readFileSync(clientPath, 'utf8');
assert(clientContent.includes('VITE_SUPABASE_URL') && clientContent.includes('VITE_SUPABASE_ANON_KEY'), 'Client utiliza VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
assert(!clientContent.includes('service_role'), 'Chave service_role NUNCA mencionada no client');

const authServicePath = path.join(rootDir, 'src', 'services', 'authService.ts');
const authServiceContent = fs.readFileSync(authServicePath, 'utf8');
assert(authServiceContent.includes('signInAnonymously'), 'authService possui signInAnonymously do Supabase');
assert(authServiceContent.includes('signInWithPassword'), 'authService possui signInWithPassword do Supabase');
assert(authServiceContent.includes('admin_profiles'), 'authService valida perfil na tabela admin_profiles');

const eventServicePath = path.join(rootDir, 'src', 'services', 'eventService.ts');
const eventServiceContent = fs.readFileSync(eventServicePath, 'utf8');
assert(eventServiceContent.includes(".rpc('submit_vote'"), 'eventService invoca submit_vote via RPC');
assert(eventServiceContent.includes(".rpc('open_round'"), 'eventService invoca open_round via RPC');
assert(eventServiceContent.includes(".rpc('close_round'"), 'eventService invoca close_round via RPC');
assert(eventServiceContent.includes('.channel('), 'eventService assina canais Realtime do Supabase');

// 6. Scripts de Migração
console.log('\n--- 6. SCRIPTS DE MIGRAÇÃO E DADOS ---');
const migrationSqlPath = path.join(rootDir, 'supabase', 'seed_migration.sql');
assert(fs.existsSync(migrationSqlPath), 'supabase/seed_migration.sql gerado com sucesso');
const migrationJsonPath = path.join(rootDir, 'supabase', 'migration_data.json');
assert(fs.existsSync(migrationJsonPath), 'supabase/migration_data.json gerado com sucesso');

// Resumo
console.log('\n===========================================================================');
console.log(`TOTAL DE TESTES: ${totalTests}`);
console.log(`SUCESSO: ${passedTests}`);
console.log(`FALHAS: ${failedTests}`);
console.log('===========================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('[🚀] Todos os testes de validação da migração Supabase passaram com sucesso!');
  process.exit(0);
}
