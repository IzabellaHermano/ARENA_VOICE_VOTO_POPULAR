/**
 * ARENA VOICE — VOTO POPULAR
 * Teste Automatizado de Integração da ETAPA 3:
 * Nova Entrada do Sistema, Login e Gerenciamento de Administradores
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
console.log('ARENA VOICE — VOTO POPULAR: TESTES DA ETAPA 3 (LOGIN & ADMINS)');
console.log('===========================================================================');

// 1. Rota Principal e Tela de Login Administrativo (/)
console.log('\n--- 1. ROTA PRINCIPAL E LOGIN ADMINISTRATIVO (/) ---');
const routesPath = path.join(rootDir, 'src', 'routes', 'index.tsx');
assert(fs.existsSync(routesPath), 'src/routes/index.tsx existe');
const routesContent = fs.readFileSync(routesPath, 'utf8');

assert(
  routesContent.includes('<Route path="/" element={<AdminLoginPage />} />'),
  'A rota raiz "/" abre a tela de Login Administrativo (AdminLoginPage)'
);
assert(
  !routesContent.includes('<Route path="/" element={<HomePage />} />'),
  'A rota raiz "/" NÃO abre mais a tela de votação pública'
);

const loginPagePath = path.join(rootDir, 'src', 'pages', 'admin', 'AdminLoginPage.tsx');
assert(fs.existsSync(loginPagePath), 'src/pages/admin/AdminLoginPage.tsx existe');
const loginContent = fs.readFileSync(loginPagePath, 'utf8');

assert(loginContent.includes('ArenaLogo') && loginContent.includes('variant="complete"'), 'Login exibe a Logo Oficial completa');
assert(loginContent.includes('type="email"') || loginContent.includes('placeholder="admin@'), 'Login possui campo de e-mail institucional');
assert(loginContent.includes('password') && (loginContent.includes('Eye') && loginContent.includes('EyeOff')), 'Login possui campo de senha com alternância de visibilidade (Eye/EyeOff)');
assert(loginContent.includes('Entrar no Painel'), 'Login possui botão de submissão "Entrar no Painel"');
assert(loginContent.includes('sendPasswordReset') && loginContent.includes('Recuperação de Senha'), 'Login possui modal/mecanismo de recuperação de senha');
assert(loginContent.includes('errorMessage') && loginContent.includes('successMessage'), 'Login possui exibição de mensagens claras de erro e sucesso');

// 2. Organização das Rotas do Sistema
console.log('\n--- 2. ORGANIZAÇÃO DAS ROTAS DO SISTEMA ---');
assert(routesContent.includes('path="/admin"'), 'Rota base "/admin" configurada');
assert(routesContent.includes('path="usuarios"'), 'Rota "/admin/usuarios" configurada para gestão de administradores');
assert(routesContent.includes('path="projetos"'), 'Rota "/admin/projetos" configurada');
assert(routesContent.includes('path="votacao"'), 'Rota "/admin/votacao" configurada para controle de rodada');
assert(routesContent.includes('path="resultados"'), 'Rota "/admin/resultados" configurada');
assert(routesContent.includes('path="/votar/:eventId"'), 'Rota "/votar/:eventId" configurada como entrada pública de votação');
assert(routesContent.includes('path="/votar/:eventId/:projectId"'), 'Rota "/votar/:eventId/:projectId" configurada para avaliação do projeto');
assert(routesContent.includes('path="/admin/login" element={<Navigate to="/" replace />}'), 'Alias "/admin/login" redireciona para "/"');
assert(routesContent.includes('path="rodada" element={<Navigate to="/admin/votacao" replace />}'), 'Alias "/admin/rodada" redireciona para "/admin/votacao"');

// 3. Cadastro e Gerenciamento de Administradores
console.log('\n--- 3. TELA DE GERENCIAMENTO DE ADMINISTRADORES ---');
const adminUsersPath = path.join(rootDir, 'src', 'pages', 'admin', 'AdminUsersPage.tsx');
assert(fs.existsSync(adminUsersPath), 'src/pages/admin/AdminUsersPage.tsx existe');
const adminUsersContent = fs.readFileSync(adminUsersPath, 'utf8');

// Campos do formulário
assert(adminUsersContent.includes('createName') && adminUsersContent.includes('Nome Completo'), 'Campo de Nome Completo presente no formulário de cadastro');
assert(adminUsersContent.includes('createEmail') && adminUsersContent.includes('E-mail Institucional'), 'Campo de E-mail Institucional presente no formulário de cadastro');
assert(adminUsersContent.includes('createPassword') && adminUsersContent.includes('Senha Inicial de Acesso'), 'Campo de Senha Inicial presente no formulário de cadastro');
assert(
  adminUsersContent.includes('superadmin') &&
  adminUsersContent.includes('admin') &&
  adminUsersContent.includes('operator'),
  'Seleção de papéis de acesso: superadmin, admin e operator'
);
assert(adminUsersContent.includes('createActive') && adminUsersContent.includes('Situação da Conta'), 'Campo de Situação da Conta (Ativo / Inativo) presente');
assert(adminUsersContent.includes('handleToggleActive'), 'Ação para ativar/desativar conta de administrador');
assert(adminUsersContent.includes('handleDeleteAdmin'), 'Ação para excluir conta de administrador');
assert(adminUsersContent.includes('targetAdmin.id === adminUser?.uid'), 'Proteção ativa contra desativação ou exclusão da própria conta de superadmin');

// 4. Segurança do Servidor e Edge Function
console.log('\n--- 4. EDGE FUNCTION E SEGURANÇA SERVER-SIDE ---');
const edgeFunctionPath = path.join(rootDir, 'supabase', 'functions', 'manage-admin-user', 'index.ts');
assert(fs.existsSync(edgeFunctionPath), 'Edge Function supabase/functions/manage-admin-user/index.ts existe');
const edgeFunctionContent = fs.readFileSync(edgeFunctionPath, 'utf8');

assert(edgeFunctionContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Edge Function utiliza a chave segura service_role exclusivamente no ambiente do servidor');
assert(edgeFunctionContent.includes('callerProfile.role !== "superadmin"'), 'Edge Function verifica no servidor se o solicitante é superadmin ativo');
assert(edgeFunctionContent.includes('auth.admin.createUser'), 'Edge Function cria usuários via auth.admin');
assert(edgeFunctionContent.includes('auth.admin.deleteUser'), 'Edge Function remove usuários via auth.admin');
assert(edgeFunctionContent.includes('userId === callerUser.id'), 'Edge Function impede auto-exclusão do superadmin');

const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
assert(schemaContent.includes('create or replace function public.admin_manage_profile'), 'Procedure PL/pgSQL admin_manage_profile criada no schema');
assert(schemaContent.includes('public.is_superadmin()'), 'Procedure admin_manage_profile verifica is_superadmin() no servidor');
assert(schemaContent.includes('create policy "admin_profiles_all_superadmin"'), 'Política RLS protege tabela admin_profiles para superadmin');

// 5. Controle de Sessão e Rotas Protegidas (RBAC)
console.log('\n--- 5. CONTROLE DE SESSÃO E RBAC ---');
const authContextPath = path.join(rootDir, 'src', 'contexts', 'AdminAuthContext.tsx');
assert(fs.existsSync(authContextPath), 'src/contexts/AdminAuthContext.tsx existe');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');

assert(authContextContent.includes('isSuperadmin = role === \'superadmin\''), 'Validação do perfil isSuperadmin no contexto');
assert(authContextContent.includes('canManageUsers = isSuperadmin'), 'Regra: Apenas superadmin pode gerenciar usuários (canManageUsers)');
assert(authContextContent.includes('sessionStorage') && authContextContent.includes('localStorage'), 'Persistência de sessão de administrador no navegador');

const protectedRoutePath = path.join(rootDir, 'src', 'components', 'auth', 'ProtectedRoute.tsx');
assert(fs.existsSync(protectedRoutePath), 'src/components/auth/ProtectedRoute.tsx existe');
const protectedRouteContent = fs.readFileSync(protectedRoutePath, 'utf8');

assert(protectedRouteContent.includes('!isAuthenticated'), 'ProtectedRoute redireciona usuários não autenticados');
assert(protectedRouteContent.includes('requiredRole === \'superadmin\''), 'ProtectedRoute bloqueia usuários sem nível superadmin quando exigido');
assert(protectedRouteContent.includes('Acesso Restrito ao Superadministrador'), 'ProtectedRoute exibe tela clara de acesso negado');

// 6. Entrada Pública de Votação
console.log('\n--- 6. EXPERIÊNCIA PÚBLICA DE VOTAÇÃO ---');
const publicVotingPath = path.join(rootDir, 'src', 'pages', 'public', 'PublicVotingPage.tsx');
assert(fs.existsSync(publicVotingPath), 'src/pages/public/PublicVotingPage.tsx existe');
const publicVotingContent = fs.readFileSync(publicVotingPath, 'utf8');

assert(publicVotingContent.includes('useParams'), 'PublicVotingPage extrai eventId e projectId da rota');
assert(publicVotingContent.includes('WaitingPage'), 'PublicVotingPage exibe WaitingPage se a rodada não estiver liberada');
assert(publicVotingContent.includes('EvaluationPage'), 'PublicVotingPage exibe EvaluationPage se a rodada estiver aberta');
assert(publicVotingContent.includes('ConfirmationPage'), 'PublicVotingPage exibe ConfirmationPage se o usuário já votou');

// 7. Não Exposição de service_role no Frontend
console.log('\n--- 7. AUDITORIA DE SEGURANÇA DE CHAVES ---');
const clientPath = path.join(rootDir, 'src', 'supabase', 'client.ts');
const clientContent = fs.readFileSync(clientPath, 'utf8');
assert(!clientContent.includes('service_role'), 'Chave service_role NUNCA mencionada no client frontend');
const envExamplePath = path.join(rootDir, '.env.example');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
assert(
  envExampleContent.includes('VITE_SUPABASE_URL') &&
  envExampleContent.includes('VITE_SUPABASE_ANON_KEY') &&
  !envExampleContent.includes('VITE_SUPABASE_SERVICE_ROLE'),
  'Arquivo .env.example contém apenas URL e chave ANON pública'
);

// Resumo
console.log('\n===========================================================================');
console.log(`TOTAL DE TESTES DA ETAPA 3: ${totalTests}`);
console.log(`SUCESSO: ${passedTests}`);
console.log(`FALHAS: ${failedTests}`);
console.log('===========================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('[🚀] Todos os testes da Etapa 3 passaram com sucesso!');
  process.exit(0);
}

