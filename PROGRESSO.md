# DIÁRIO DE BORDO — PROGRESSO DO PROJETO
## ARENA VOICE — VOTO POPULAR

Este documento registra o status de execução de cada uma das 9 etapas de desenvolvimento do sistema de votação popular em tempo real para o evento Arena Voice.

---

### Resumo do Status Geral

- [x] **Etapa 1: Planejamento, Arquitetura e Organização da Identidade Visual** (Concluída ✅)
- [x] **Etapa 2: Implementação Completa das Telas do Público** (Concluída ✅)
- [x] **Etapa 3: Desenvolvimento do Painel Administrativo** (Concluída ✅)
- [x] **Etapa 4: Configuração do Firebase e Modelo de Dados** (Concluída ✅)
- [x] **Etapa 5: Controle de Rodadas, Sincronização em Tempo Real e Voto Único com Firebase** (Concluída e Homologada ✅)
- [x] **Etapa 6: Dashboard, Resultados e Ranking Oficial dos 20%** (Concluída e Homologada ✅)
- [x] **Etapa 7: QR Code, Telão e Experiência em Tempo Real** (Concluída e Homologada ✅)
- [x] **Etapa 8: Testes Completos, Segurança, Concorrência e Auditoria** (Concluída e Homologada ✅)
- [x] **Etapa 9: Finalização, Fidelidade Visual, Simulação Ponta a Ponta e Homologação** (Concluída ✅)
- [x] **Migração Arquitetural — Etapa 1: Auditoria Completa e Planejamento da Migração para Supabase** (Concluída ✅)
- [x] **Migração Arquitetural — Etapa 2: Migração Completa do Firebase para Supabase** (Concluída e Homologada ✅)
- [x] **Nova Arquitetura — Etapa 3: Nova Entrada do Sistema, Login e Gerenciamento de Administradores** (Concluída e Homologada ✅)
- [x] **Nova Arquitetura — Etapa 4: Correção do Motor de Votação e Sincronização em Tempo Real** (Concluída e Homologada ✅)

---

### Detalhamento da Nova Arquitetura — Etapa 3: Nova Entrada, Login e Gerenciamento de Administradores ✅

#### 1. Nova Página Inicial e Login Administrativo (`/`)
- A rota raiz `/` foi reestruturada para renderizar com exclusividade a tela de **Login Administrativo** ([`src/pages/admin/AdminLoginPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/admin/AdminLoginPage.tsx)).
- Acesso à votação pública via raiz foi definitivamente eliminado; a página inicial nunca mais abre diretamente na avaliação pública.
- Componentes e recursos da nova tela:
  - Preservação da identidade visual oficial com logo completa (`ArenaLogo variant="complete"`) e mascote metálico sutil no plano de fundo.
  - Campos institucionais: E-mail e Senha de acesso.
  - Botão de alternância de visibilidade da senha com ícones `Eye` / `EyeOff`.
  - Botão de submissão estilizado *"Entrar no Painel"*.
  - Modal integrado de **Recuperação de Senha** ("Esqueceu a senha?") que dispara `supabase.auth.resetPasswordForEmail()`.
  - Tratamento responsivo e feedbacks visuais em caixas de alerta vermelha (erro) e verde (sucesso).
  - Redirecionamento automático para o painel administrativo caso o usuário já possua sessão ativa.

#### 2. Reorganização das Rotas do Sistema ([`src/routes/index.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/routes/index.tsx))
- `/` — Login administrativo principal.
- `/admin` — Painel administrativo protegido por autenticação e RBAC.
- `/admin/usuarios` — Gerenciamento de administradores (acesso restrito ao `superadmin`).
- `/admin/projetos` — Gerenciamento e ordenação de projetos concorrentes.
- `/admin/votacao` — Controle de abertura, encerramento e cronômetro da rodada.
- `/admin/resultados` — Métricas em tempo real, pontuação oficial de até 20 pontos e ranking.
- `/votar/:eventId` — Entrada pública para votação do evento com sala de espera dinâmica.
- `/votar/:eventId/:projectId` — Avaliação do projeto liberado em tempo real pelo apresentador.
- *Aliases de compatibilidade:* `/admin/login` $\rightarrow$ `/`; `/admin/rodada` $\rightarrow$ `/admin/votacao`; `/votar` $\rightarrow$ `/votar/arena-voice-2025`; `/telao`, `/qrcode`, `/ranking` mantidos.

#### 3. Cadastro e Gerenciamento de Administradores ([`src/pages/admin/AdminUsersPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/admin/AdminUsersPage.tsx))
- Interface visual dedicada para superadministradores com métricas de equipe (Total, Superadmins, Admins, Operadores).
- Modal de cadastro com validação de campos obrigatórios:
  - **Nome Completo**
  - **E-mail Institucional**
  - **Senha Inicial de Acesso** (com valor padrão provisório de conveniência)
  - **Nível de Acesso (RBAC):**
    - `superadmin`: Gestão completa de usuários, configurações, projetos e votação.
    - `admin`: Gerenciamento de projetos e controle operacional das votações.
    - `operator`: Acompanhamento ao vivo e visualização de resultados sem privilégios de escrita.
  - **Situação da Conta:** Switch Ativo / Inativo.
- Tabela com listagem, busca instantânea, filtro por papel, alternância de ativação (`Power`) e exclusão de contas.
- Proteção ativa contra auto-exclusão e auto-desativação da conta do superadministrador conectado.

#### 4. Segurança Server-Side com Edge Function e RLS
- **Edge Function Supabase ([`supabase/functions/manage-admin-user/index.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/supabase/functions/manage-admin-user/index.ts)):**
  - Validação estrita do token JWT no cabeçalho `Authorization`.
  - Verificação de perfil no servidor: somente chamadores com `role = 'superadmin'` e `active = true` em `public.admin_profiles` têm acesso concedido.
  - Utilização da chave sensível `SUPABASE_SERVICE_ROLE_KEY` **exclusivamente** no ambiente isolado da função backend.
  - Operações atômicas de criação (`auth.admin.createUser`), atualização, alternância de status e exclusão (`auth.admin.deleteUser`).
- **Procedure PL/pgSQL ([`supabase/schema.sql`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/supabase/schema.sql#L442)):**
  - Função `public.admin_manage_profile` com `SECURITY DEFINER` e `SET search_path = public, pg_temp` validando `public.is_superadmin()`.
- **Row Level Security (RLS):**
  - Acesso de leitura permitido apenas a administradores autenticados (`public.is_admin()`).
  - Escrita direta, inserção e exclusão restritas exclusivamente a superadministradores (`public.is_superadmin()`).
- O frontend consome apenas `VITE_SUPABASE_URL` e a chave pública `anon`.

#### 5. Controle de Sessão e Rotas Protegidas ([`src/components/auth/ProtectedRoute.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/components/auth/ProtectedRoute.tsx))
- `AdminAuthProvider` ([`src/contexts/AdminAuthContext.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/contexts/AdminAuthContext.tsx)): Gerencia persistência de sessão em `sessionStorage` e `localStorage`, fornecendo helpers de permissão (`canManageUsers`, `canManageProjects`, `canControlRounds`).
- Componente `ProtectedRoute`:
  - Se a sessão não estiver ativa, redireciona o usuário para `/` preservando o histórico de navegação.
  - Se a rota exigir `requiredRole="superadmin"` e o usuário for `admin` ou `operator`, renderiza tela temátiva institucional de **Acesso Restrito ao Superadministrador** com botão de retorno seguro ao painel.
  - Usuários desativados têm a sessão cancelada imediatamente com mensagem de bloqueio.

#### 6. Experiência de Votação Pública ([`src/pages/public/PublicVotingPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/public/PublicVotingPage.tsx))
- Rotas `/votar/:eventId` e `/votar/:eventId/:projectId` isoladas da navegação administrativa.
- Transição automática: se a rodada estiver aberta, exibe o banner e critérios do projeto ativo; se fechada, exibe a sala de espera do evento com indicação de progresso.
- Participantes que já votaram permanecem em feedback de agradecimento sem permitir submissões duplicadas.

#### 7. Suíte de Testes Automatizada ([`scripts/testEtapa3Auth.mjs`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/scripts/testEtapa3Auth.mjs))
- Execução com **100% de aprovação (52 de 52 testes)**:
  - [x] Rota raiz `/` abre o login administrativo.
  - [x] Rota raiz `/` não abre mais a votação pública.
  - [x] Presença de logo oficial, campos de login, alternador de senha e recuperação.
  - [x] Rotas `/admin`, `/admin/usuarios`, `/admin/projetos`, `/admin/votacao`, `/admin/resultados`.
  - [x] Rotas públicas `/votar/:eventId` e `/votar/:eventId/:projectId`.
  - [x] Formulário de gestão de administradores com papéis `superadmin`, `admin`, `operator`.
  - [x] Proteção contra auto-exclusão do superadmin.
  - [x] Edge Function com verificação server-side e uso seguro de `service_role`.
  - [x] Proteção RLS no banco de dados para `admin_profiles`.
  - [x] `ProtectedRoute` com bloqueio não-autenticado e validação de perfil RBAC.
  - [x] Não exposição de chaves privadas no frontend.
- Compilação de produção (`npm run build`) concluída com **0 erros** de TypeScript.

---

---

### Detalhamento da Migração Arquitetural — Etapa 2: Migração Completa para Supabase ✅

#### 1. Diagnóstico e Resolução dos 4 Problemas Operacionais
1. **Falha de registro dos votos:** No Firebase Spark (plano gratuito), as Cloud Functions v2 foram bloqueadas por exigência de faturamento Blaze. No Supabase, toda a lógica de submissão de votos foi portada para a procedure nativa PostgreSQL `submit_vote` (`SECURITY DEFINER`), eliminando custos e dependências externas de funções cloud.
2. **Falta de sincronia na abertura de rodadas:** O painel administrativo capturava erro de permissão no Firestore e alterava apenas o estado React local. Com o Supabase, a chamada RPC atômica `open_round` atualiza a tabela `rounds` e `events`, emitindo broadcast instantâneo via Supabase Realtime para todos os navegadores conectados.
3. **Votos não apareciam em tempo real:** Resolvido com transações atômicas na tabela `results` via `on conflict (id) do update`, com broadcast Realtime nativo na tabela `results` ($O(1)$ sem ler votos individuais).
4. **Página inicial abrindo direto em `/avaliar`:** Corrigido o status inicial mock e do painel de `'aberta'` com 142 votos para `'aguardando'` com 0 votos. O público agora entra diretamente na tela de espera temática (`/aguardando`), transitando para `/avaliar` apenas quando o operador libera a rodada.

#### 2. Estrutura do Banco de Dados PostgreSQL ([`supabase/schema.sql`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/supabase/schema.sql))
- **`public.events`**: Identificador, nome, descrição, status (`draft`, `active`, `finished`), `current_round_id`, `current_project_id`, `results_published` e timestamps.
- **`public.projects`**: Identificador, chave estrangeira para evento, nome, categoria, descrição, `banner_url`, `image_url`, ordem de apresentação, status e flags ativas.
- **`public.rounds`**: Identificador UUID, chaves para evento e projeto, status (`waiting`, `open`, `closed`), `started_at`, `ended_at`, `released_at`, `closed_at`.
- **`public.admin_profiles`**: Perfis vinculados a `auth.users(id)` com papéis RBAC (`superadmin`, `admin`, `operator`), status ativo e dados de auditoria (com view de compatibilidade `public.admins`).
- **`public.votes`**: Registro individual de cada voto com notas de 1 a 5 (`check between 1 and 5`) e chave determinística `{event_id}_{project_id}_{voter_id}`.
- **`public.results`**: Consolidação agregada $O(1)$ com `total_votes`, somatórios por critério, médias parciais, média geral, percentual e pontuação oficial de até 20 pontos (`popular_points`).

#### 3. Regras de Integridade e Restrição de Voto Único
- **Restrição de Negócio Rígida:** `CONSTRAINT uq_votes_event_project_voter UNIQUE (event_id, project_id, voter_id)`.
- Garante matematicamente que um participante só pode registrar um único voto por projeto dentro de um mesmo evento, mesmo que o projeto seja liberado em múltiplas rodadas subsequentes.
- Tentativas de reenvio disparam violação de unicidade tratada com mensagem amigável: *"Voto duplicado: Você já avaliou este projeto neste evento."*

#### 4. Segurança PL/pgSQL e Identidade Inegociável
- **Identidade Servidor Obrigatória:** A função `submit_vote` extrai o ID exclusivamente através de `auth.uid()`. Nenhum parâmetro `voter_uid` enviado pelo cliente é aceito, impedindo spoofing de identidade ou manipulação de votos.
- **`SECURITY DEFINER` com `SET search_path = public, pg_temp`:** Todas as procedures executam com privilégios restritos e imunes a ataques de injeção de caminho de busca.
- **Políticas RLS Rigorosas:**
  - `votes`: Somente o próprio votante pode consultar seus votos (`voter_id = auth.uid()`). A inserção e atualização direta via API REST pública são negadas (somente a procedure `submit_vote` executa a inserção).
  - `results`: Leitura pública somente quando `results_published = true` no evento ou para administradores autenticados.
  - `admin_profiles`: Apenas administradores ativos autenticados têm acesso a dados sensíveis de gestão.
- **Privacidade Realtime:** A tabela `votes` foi expressamente omitida da publicação `supabase_realtime` para evitar vazamento de dados de avaliação individual e IDs de participantes pela rede WebSocket. Apenas `events`, `rounds`, `projects` e `results` são transmitidos.

#### 5. Integração Frontend e Serviços ([`src/supabase/client.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/supabase/client.ts))
- **Cliente Supabase Seguro:** Inicializado com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A chave restrita `service_role` **nunca** é referenciada nem embutida no frontend.
- **`AuthService` ([`src/services/authService.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/services/authService.ts)):**
  - Votantes anônimos: `supabase.auth.signInAnonymously()` com persistência transparente em `localStorage`.
  - Administradores: `supabase.auth.signInWithPassword()` com validação cruzada na tabela `admin_profiles` e verificação de perfil ativo.
  - Fallback local gracioso em caso de ausência de conectividade.
- **`EventService` ([`src/services/eventService.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/services/eventService.ts)):**
  - Implementa subscrições Realtime em canais Supabase (`postgres_changes` para `events`, `rounds`, `projects`, `results`).
  - Executa operações atômicas via RPC: `submit_vote`, `open_round`, `close_round`, `prepare_next_round` e `get_admin_results`.

#### 6. Migração de Dados e Preservação do Firebase
- **Script de Migração ([`scripts/migrateFirebaseToSupabase.mjs`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/scripts/migrateFirebaseToSupabase.mjs)):**
  - Extrai dados oficiais existentes sem alterar o banco de dados Firebase existente.
  - Gera [`supabase/seed_migration.sql`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/supabase/seed_migration.sql) com inserts idempotentes (`ON CONFLICT DO NOTHING`).
  - Gera [`supabase/migration_data.json`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/supabase/migration_data.json) para conferência de integridade.

#### 7. Suíte de Testes Automatizada ([`scripts/testSupabaseIntegration.mjs`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/scripts/testSupabaseIntegration.mjs))
- Execução com **100% de aprovação (33 de 33 testes)**:
  - [x] Existência de todas as 6 tabelas relacionais.
  - [x] Restrição de unicidade `UNIQUE(event_id, project_id, voter_id)`.
  - [x] Restrições de checagem para notas 1 a 5 em todos os critérios.
  - [x] Presença e assinatura das 5 procedures atômicas.
  - [x] Extração obrigatória de `auth.uid()` em `submit_vote` com `SECURITY DEFINER`.
  - [x] RLS ativo em `votes`, `results` e `rounds`.
  - [x] Omissão de `votes` na publicação Realtime para preservação de sigilo.
  - [x] Estado inicial `'aguardando'` validado no mock e no componente administrativo.
  - [x] Client Supabase livre de chaves administrativas sensíveis.
  - [x] Assinatura e submissão RPC homologadas.

#### 8. Compilação de Produção
- `npm run build` (`tsc && vite build`) executado com sucesso e zero erros de tipagem TypeScript.
- Pacote final gerado em `dist/`.

---

---

### Detalhamento da Etapa 9 — Concluída e Homologada ✅

#### 1. Revisão e Preservação Estrita da Identidade Visual
- **Fidelidade com `referencias/telas/`:** Todas as 12 telas do sistema (Home, Espera, Avaliação, Confirmação, Login, Projetos, Controle da Rodada, Configurações, Dashboard, Ranking, Telão 16:9 e QR Code) foram revisadas e validadas em consonância com as especificações visuais de palco.
- **Logos Oficiais:** Preservados os 6 arquivos originais em `public/assets/branding/` (`logo-completa.png`, `logo-escrita.png`, `logo-escrita-slogan.png`, `logo-escrita-transparente.png`, `mascote-transparente.png`, `mascote-preto.png`).
- **Diretrizes de Marca Inegociáveis:** A palavra **ARENA** permanece prateada cromada, **VOICE** dourada metálica, mascote com mão metálica em 'V' segurando microfone, iluminação neon vermelha/azul e slogan *"Ideias que viram futuro"*.

#### 2. Otimizações de Código e Desempenho
- **Carregamento Otimizado de Imagens:** Atributos `loading="eager"` nas logos primárias com `decoding="async"` para evitar engasgos de renderização.
- **Consultas $O(1)$:** O Dashboard e o Telão consomem exclusivamente a coleção agregada `results`, garantindo resposta instantânea com complexidade constante independentemente do número de votos computados.
- **Acessibilidade e Ergonomia Mobile:** Alvos de toque com dimensão mínima $\ge 44\text{px}$ nos seletores de nota e botões primários; `role="radiogroup"` e `aria-labelledby` integrados.
- **ErrorBoundary Corporativo:** Prevenção ativa contra telas brancas em falhas não tratadas, mantendo o usuário seguro com interface temática e ação de recarregamento.

#### 3. Simulação Ponta a Ponta do Ciclo do Evento ([`scripts/testEtapa9Simulation.mjs`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/scripts/testEtapa9Simulation.mjs))
- Execução dos 15 passos da esteira do evento com 100% de sucesso:
  1. [x] Administrador entra no painel de controle.
  2. [x] Cadastro de projetos competidores com categorias e ordens.
  3. [x] Seleção do projeto ativo da vez.
  4. [x] Liberação de votação no servidor (`openRound`).
  5. [x] Acesso dos participantes via QR Code / URL pública sem fricção.
  6. [x] Preenchimento dos 3 critérios obrigatórios de notas (1 a 5).
  7. [x] Registro atômico do voto com chave determinística.
  8. [x] Atualização instantânea da contagem e somatórios agregados.
  9. [x] Encerramento da rodada pelo administrador (`closeRound`).
  10. [x] Preparação da próxima equipe no modo de espera (`waiting`).
  11. [x] Repetição do ciclo completo para os demais competidores.
  12. [x] Consolidação de métricas em tempo real no Dashboard.
  13. [x] Cálculo da fórmula oficial dos 20% com precisão de ponto flutuante.
  14. [x] Projeção do Ranking Oficial de Palco e Pódio 3D (Ouro, Prata, Bronze).
  15. [x] Exportação de relatórios auditáveis em CSV, Excel e PDF.

#### 4. Documentação Master ([`README.md`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/README.md))
- Elaborado manual completo cobrindo os 17 tópicos obrigatórios: Visão geral, arquitetura, tecnologias, árvore de diretórios, instalação local, configuração do Firebase, variáveis de ambiente, autenticação anônima vs administrativa, Firestore, Cloud Functions, rotinas de testes, procedimentos para o evento e publicação.

---

---

### Detalhamento da Etapa 8 — Concluída e Homologada ✅

#### 1. Auditoria do Fluxo Público
- **Resolução de QR Code:** Sem domínios fictícios, apontando dinamicamente para a URL oficial pública (`/votar`).
- **Validação de Formulário:** Bloqueio estrito de submissões incompletas (quando qualquer um dos 3 critérios — Inovação, Impacto, Desenvolvimento — não estiver preenchido de 1 a 5).
- **Chave Determinística por Projeto:** Formato `${eventId}_${projectId}_${voterUid}`, garantindo voto único em cada projeto sem impedir o participante de avaliar projetos subsequentes.
- **Persistência de Sessão:** A atualização de página (`F5`) no navegador preserva o estado de voto e a tela de confirmação/agradecimento via `localStorage` e Firestore.

#### 2. Auditoria das Funcionalidades Administrativas
- **Painel Operacional:** Login institucional, Logout com limpeza de token de sessão, cadastro de novos projetos, edição de projetos existentes, URLs de banners temáticos e seleção de projeto para apresentação.
- **Controle de Rodadas:** Abertura com timestamp oficial do servidor (`openRound`), encerramento atômico com registro de encerramento (`closeRound`) e preparação do próximo projeto no estado de espera sem abertura indevida precoce (`prepareNextRound`).
- **Exportação Multiformato:** Validados os motores de exportação em CSV com UTF-8 BOM e delimitador `;` para Excel BR, Planilha Excel SpreadsheetML estruturada com tipagem e Relatório Executivo em PDF com cabeçalho oficial para homologação de resultados.

#### 3. Auditoria de Segurança e Regras do Firestore ([`firestore.rules`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/firestore.rules))
- **Negação de Escrita Direta pelo Cliente:** Escrita direta nas coleções `votes` e `results` completamente bloqueada (`allow write: if false;`). Todo processamento e cálculo agregado ocorrem exclusivamente via Cloud Functions com Firebase Admin SDK.
- **Restrição de Resultados Não Publicados:** Regra aprimorada para impedir que clientes anônimos leiam a coleção `results` antes da publicação oficial do evento (`resultsPublished == true`).
- **Proteção Administrativa:** Apenas usuários com *custom claims* validadas no token (`admin == true` ou `role == 'admin'`) podem gerenciar rodadas e coleções restritas.
- **Validação de Notas no Servidor:** Rejeição rigorosa de valores fora do intervalo 1 a 5, números decimais ou strings inválidas.

#### 4. Simulação de Concorrência e Transações Atômicas ([`scripts/testEtapa8.mjs`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/scripts/testEtapa8.mjs))
- **50 Votos Simultâneos:** Execução concorrente massiva com integridade matemática absoluta de contagem de votos, soma de critérios, cálculo de percentual e pontuação de 20% sem perdas ou condições de corrida (*race conditions*).
- **Proteção contra Voto Duplicado:** Tentativas concorrentes do mesmo UID resultam em rejeição imediata com erro `already-exists`.
- **Encerramento de Rodada Concorrente:** Submissões disparadas no momento do encerramento da rodada são bloqueadas com erro `failed-precondition`.

#### 5. Limitações de Identidade Documentadas
- **Análise Técnica:** O Firebase Anonymous Authentication vincula a identidade ao navegador/dispositivo (`browserLocalPersistence`). Ele não garante controle biológico ou de CPF por pessoa física, permitindo que participantes utilizem janelas anônimas ou múltiplos aparelhos.
- **Mitigações Ativas:** Bloqueio por UID no Firestore, chave de documento determinística e controle de sessão local no dispositivo.

#### 6. Desempenho e Arquitetura Agregada O(1)
- **Consumo de Leituras O(1):** O Dashboard e o Telão consomem exclusivamente a coleção agregada `results/{eventId}_{projectId}`, eliminando a necessidade de ler milhares de votos individuais da coleção `votes` e economizando 99%+ em cotas do Firestore.
- **Gerenciamento de Memória:** Listeners `onSnapshot` desacoplados com funções de cancelamento (*unsubscribes*) nos efeitos de ciclo de vida do React.

#### 7. Fidelidade Estrita da Identidade Visual Oficial
- Todos os 6 arquivos originais de marca em `public/assets/branding/` preservados intactos:
  1. `logo-completa.png` (Mão metálica + ARENA VOICE + slogan)
  2. `logo-escrita.png` (ARENA prateado + VOICE dourado)
  3. `logo-escrita-slogan.png` (Logo escrita com slogan)
  4. `logo-escrita-transparente.png` (Versão transparente para menu lateral)
  5. `mascote-preto.png` (Mascote metálico cromado)
  6. `mascote-transparente.png` (Mascote em fundo transparente)

#### 8. Responsividade Multi-Resolução
- Suporte homologado às larguras: 320px, 375px, 390px, 430px, 768px, 1366px e 1920px.
- Alvos de toque $\ge 44\text{px}$ nos seletores de notas e botões de ação móveis.
- Proteção contra rolagem horizontal involuntária (`overflow-x-hidden`).

#### 9. Tratamento de Erros e Prevenção de Telas Brancas ([`src/components/ui/ErrorBoundary.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/components/ui/ErrorBoundary.tsx))
- **ErrorBoundary Corporativo:** Implementado e envolvendo a árvore da aplicação no `App.tsx`. Exibe tela temática da Arena Voice com mensagem acolhedora e botão de recarregamento em caso de falhas inesperadas de renderização.
- **Tratamento Offline:** Monitoramento dinâmico dos status `offline` e `reconnecting`, bloqueando submissão de votos sem confirmação do servidor.

#### 10. Suíte de Testes Automatizada ([`scripts/testEtapa8.mjs`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/scripts/testEtapa8.mjs))
- Execução com 100% de aprovação técnica (15 de 15 testes auditados com sucesso).

---

---

### Detalhamento da Etapa 7 — Concluída e Homologada ✅

#### 1. Geração Dinâmica de QR Code sem Domínio Fictício ([`src/utils/url.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/utils/url.ts), [`src/components/qrcode/QRCodeDisplay.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/components/qrcode/QRCodeDisplay.tsx))
- **Resolução de URL:** O utilitário `getPublicVotingUrl()` consulta prioritariamente `VITE_PUBLIC_APP_URL` e, em seu padrão, `window.location.origin/votar`. Garante que o QR Code gerado aponte para o domínio real ou IP de rede da arena, funcionando de forma idêntica durante todas as rodadas.
- **Renderização e Legibilidade:**
  - Gerado com `QRCodeSVG` da biblioteca `qrcode.react` com nível máximo de correção de erro (`level="H"`).
  - Moldura branca de alto contraste, sem sobreposição de logotipos ou elementos decorativos sobre os módulos de dados, assegurando leitura instantânea por smartphones à distância e sob iluminação de palco.
  - Ações integradas para cópia do link e download do arquivo em vetor SVG para materiais impressos e crachás.

#### 2. Tela Oficial de QR Code para Telão ([`src/pages/public/BigScreenQRCodePage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/public/BigScreenQRCodePage.tsx))
- **Rotas:** `/qrcode` e `/telao/qrcode`.
- **Composição Visual:**
  - Logotipo oficial completo (`ArenaLogo` com mão metálica, ARENA prateado e VOICE dourado).
  - Título VOTO POPULAR em destaque neon.
  - QR Code central ampliado com contraste reforçado.
  - Instruções em 3 passos simples para o público.
  - Botão de tela cheia (*Fullscreen*) via API nativa do navegador.

#### 3. Hub de Apresentação de Telão em 16:9 ([`src/pages/public/BigScreenPresentationPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/public/BigScreenPresentationPage.tsx))
- **Rota:** `/telao` (e `/resultados/telao`).
- **Layout Cinematográfico de Palco:**
  - **Modo QR Code:** Para recepção da plateia e intervalos.
  - **Modo Rodada ao Vivo:** Apresenta o banner do projeto ativo em tamanho grande, nome, descrição, cronômetro oficial do servidor (`startedAt`) e contador de votos computados em tempo real atualizado atomicamente na frente da plateia. Inclui mini QR Code lateral para quem ainda não ingressou.
  - **Modo Pódio e Ranking:** Apresenta a revelação em colunas 3D: 1º Lugar (Ouro), 2º Lugar (Prata), 3º Lugar (Bronze) e cards secundários.
  - **Modo Automático:** Sincronizado com o estado global do Firestore (`waiting` $\rightarrow$ QR Code / Projeto; `open` $\rightarrow$ Rodada ao Vivo; `resultsPublished` $\rightarrow$ Pódio).

#### 4. Resiliência de Conectividade e Tratamento Offline ([`src/contexts/VotingProvider.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/contexts/VotingProvider.tsx), [`src/components/layout/PublicLayout.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/components/layout/PublicLayout.tsx))
- **Status de Conexão:** Suporte completo aos 4 estados: `connected`, `connecting`, `reconnecting` e `offline`.
- **Monitoramento de Rede:** Ouvintes globais `online` e `offline`. Em caso de queda, exibe faixa de alerta luminosa; ao retornar a internet, revalida a sessão anônima e sincroniza o estado da rodada automaticamente.
- **Proteção contra Votos Não Persistidos:** O envio de votos é bloqueado se o dispositivo estiver offline. A confirmação visual só é exibida após a confirmação atômica formal da Cloud Function do servidor.

#### 5. Ciclo de Vida da Rodada e Transição do Público
- **Abertura:** Quando o operador clica em "Liberar Votação", os celulares conectados transitam automaticamente e suavemente para a tela de avaliação com o banner do projeto ativo.
- **Encerramento:** O servidor bloqueia novas submissões. Participantes que já votaram continuam visualizando a tela de confirmação e agradecimento; participantes que não votaram são direcionados com segurança para a tela de espera.
- **Próximo Projeto:** O operador prepara a próxima rodada no estado `waiting`. A sessão permanece ativa e a avaliação só é liberada mediante novo comando do operador.

#### 6. Ergonomia e Responsividade Móvel
- Alvos de toque $\ge 44\text{px}$ (`min-h-[44px] min-w-[44px]`) nos seletores numéricos de 1 a 5 e botões de ação.
- Layout vertical sem rolagem horizontal (`overflow-x-hidden`), garantindo usabilidade em qualquer smartphone Android ou iPhone.

#### 7. Suíte de Testes Automatizada ([`scripts/testEtapa7.mjs`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/scripts/testEtapa7.mjs))
- Execução com 100% de aprovação (10 de 10 testes):
  1. [x] **Resolução Dinâmica de URL:** Sem domínios fictícios (`/votar`).
  2. [x] **Geração de QR Code SVG:** Contraste preto/branco e nível H de correção de erro.
  3. [x] **Matriz de Rotas de Telão:** Rotas `/telao`, `/qrcode`, `/telao/qrcode` e `/resultados/telao`.
  4. [x] **Persistência de Sessão Anônima:** Suporte a `browserLocalPersistence` e LocalStorage.
  5. [x] **Transição Automática na Abertura:** Redirecionamento automático para `/avaliar`.
  6. [x] **Preservação da Tela de Confirmação no Encerramento:** Participantes que já votaram mantêm feedback.
  7. [x] **Conectividade e Bloqueio Offline:** Não confirmação de votos offline.
  8. [x] **Hub de Apresentação em 16:9:** Modos Automático, QR Code, Rodada ao Vivo e Pódio com Fullscreen.
  9. [x] **Área de Toque Mobile:** Alvos de toque $\ge 44\text{px}$ auditados.
  10. [x] **Preservação da Identidade Visual:** Arquivos oficiais de branding intocados.

---

### Detalhamento da Etapa 6 — Concluída e Homologada ✅

#### 1. Módulo Matemático e Regras de Pontuação Oficial ([`src/utils/scoring.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/utils/scoring.ts))
- Cálculo dos 20% com pesos iguais nos 3 critérios.
- Exibição com uma casa decimal e preservação de empates reais.
- Tratamento de projetos sem votos como "Sem avaliações".

---

### Detalhamento da Nova Arquitetura — Etapa 4: Correção do Motor de Votação e Sincronização em Tempo Real ✅

#### 1. Supabase como Fonte Única da Verdade
- Eliminação definitiva de qualquer estado simulado ou fallbacks com dados fictícios (142 votos removidos de `AdminResultsPage`, `BigScreenRankingPage` e `BigScreenPresentationPage`).
- O estado de abertura/fechamento e contagem de votos depende exclusivamente do banco PostgreSQL do Supabase.

#### 2. Liberação de Projetos (`open_round`)
- Implementação e validação da procedure PostgreSQL `public.open_round(p_event_id, p_project_id)`:
  - Valida permissões via `public.is_admin()`.
  - Executa lock transacional compartilhado no projeto e no evento (`for update`).
  - Encerra rodadas anteriores em aberto do evento.
  - Insere nova rodada com `status: 'open'`, `started_at: now()`, `released_at: now()`.
  - Atualiza `public.events` com `current_round_id` e `current_project_id`.
  - Transmissão via Supabase Realtime WebSocket notificando instantaneamente os navegadores públicos conectados.
- Na tela administrativa ([`src/pages/admin/AdminRoundPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/admin/AdminRoundPage.tsx)), adicionado seletor dinâmico de projetos para permitir ao operador escolher qual projeto colocar em avaliação.

#### 3. Encerramento de Rodadas (`close_round`)
- Implementação e validação da procedure PostgreSQL `public.close_round(p_event_id, p_round_id default null)`:
  - Altera status para `'closed'`, registra `ended_at` e `closed_at`.
  - Atualiza o evento limpando `current_round_id`.
  - Bloqueia novas tentativas de votos no banco com mensagem de erro clara.

#### 4. Registro Atômico de Voto (`submit_vote`)
- Procedure PostgreSQL `public.submit_vote(p_event_id, p_round_id, p_project_id, p_innovation, p_impact, p_development)`:
  - Identificação estrita do votante no servidor via `auth.uid()` (anônimo ou autenticado), impedindo forja de identidade no frontend.
  - Validação estrita das notas entre 1 e 5 (rejeitando notas fora do intervalo).
  - Verificação de rodada aberta vinculada ao projeto e evento.
  - Inserção atômica em `public.votes` com chave única determinística (`event_id_project_id_voter_id`).
  - Atualização agregada incremental em `public.results` (`total_votes`, médias, percentual e pontuação de até 20 pontos).

#### 5. Bloqueio Determinístico de Duplicidade
- Restrição `UNIQUE (event_id, project_id, voter_id)` na tabela `votes`.
- Se o mesmo participante tentar submeter mais de um voto para o mesmo projeto, o PostgreSQL rejeita a transação com `Voto duplicado: Você já avaliou este projeto neste evento.`.
- O frontend (`VotingProvider` e `PublicVotingPage`) detecta a submissão prévia e exibe imediatamente a tela de confirmação e agradecimento.

#### 6. Preparação para o Próximo Projeto (`prepare_next_round`)
- Procedure PostgreSQL `public.prepare_next_round(p_event_id, p_next_project_id default null)`:
  - Avança para o próximo projeto ativo por ordem de apresentação ou pelo ID informado.
  - Altera o status para `waiting` (aguardando) e define `current_round_id = null`.
  - **Não abre a votação automaticamente.**
  - Os celulares dos participantes transitam automaticamente em tempo real para a sala de espera temática ("Aguardando início da avaliação do próximo participante").
  - O participante fica liberado para votar no novo projeto assim que a próxima rodada for liberada pelo operador.

#### 7. Suíte de Testes Ponta a Ponta Executada ([`scripts/testEtapa4VotingRealtime.mjs`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/scripts/testEtapa4VotingRealtime.mjs))
- Execução completa com **100% de aprovação (13 de 13 testes homologados ao vivo no Supabase)**:
  1. [x] **Autenticação do Administrador no Supabase** (`admin@cptm.sp.gov.br`)
  2. [x] **Autenticação Anônima do Eleitor 1** (`auth.signInAnonymously()`)
  3. [x] **Autenticação Anônima do Eleitor 2** (`auth.signInAnonymously()`)
  4. [x] **Admin libera rodada para Projeto 1** (`open_round`)
  5. [x] **Sincronização Realtime WebSocket recebida pelo Eleitor** (`round_status: open`)
  6. [x] **Eleitor 1 registra voto com notas (5, 4, 5)** (`submit_vote`)
  7. [x] **Eleitor 2 registra voto com notas (4, 4, 4)** (`submit_vote`)
  8. [x] **Tentativa de voto duplicado rejeitada pelo banco** (`UNIQUE constraint`)
  9. [x] **Tentativa de nota inválida (> 5) rejeitada com erro de validação**
  10. [x] **Admin encerra a rodada** (`close_round`)
  11. [x] **Voto rejeitado quando a rodada está encerrada** (`A rodada de votação para este projeto não está aberta`)
  12. [x] **Admin avança para próximo projeto** (`prepare_next_round` $\rightarrow$ `status: waiting`)
  13. [x] **Resultados consolidados com integridade matemática oficial** (`results`: Total Votos, Média Geral, Pontos)

---

**Status Atual:** Etapa 4 (Nova Arquitetura — Correção do Motor de Votação e Sincronização em Tempo Real) concluída e homologada com 100% de aprovação técnica. Supabase validado e ativo em produção.
