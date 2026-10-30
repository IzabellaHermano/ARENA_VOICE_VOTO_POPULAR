# DIÁRIO DE BORDO — PROGRESSO DO PROJETO
## ARENA VOICE — VOTO POPULAR

Este documento registra o status de execução de cada uma das 9 etapas de desenvolvimento do sistema de votação popular em tempo real para o evento Arena Voice.

---

### Resumo do Status Geral

- [x] **Etapa 1: Planejamento, Arquitetura e Organização da Identidade Visual** (Concluída ✅)
- [x] **Etapa 2: Implementação Completa das Telas do Público** (Concluída ✅)
- [x] **Etapa 3: Desenvolvimento do Painel Administrativo** (Concluída ✅)
- [x] **Etapa 4: Configuração do Firebase e Modelo de Dados** (Concluída ✅)
- [x] **Etapa 5: Controle de Rodadas, Sincronização em Tempo Real e Voto Único com Firebase** (Concluída ✅)
- [ ] **Etapa 6: Consolidação de Resultados e Cálculo Oficial dos 20%** (Aguardando autorização)
- [ ] **Etapa 7: Telão de Projeção, Pódio e Visualização de Métricas** (Pendente)
- [ ] **Etapa 8: Relatórios, Exportação de Dados e Auditoria** (Pendente)
- [ ] **Etapa 9: Testes de Carga, Resiliência, Otimização e Homologação Final** (Pendente)

---

### Detalhamento da Etapa 5 — Concluída ✅

#### 1. Fluxo Administrativo Completo Integrado ao Firebase
- Operações de controle de rodada executadas via Cloud Functions com verificação estrita de permissões administrativas no servidor:
  - **`openRound`** ([`functions/src/rounds/openRound.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/functions/src/rounds/openRound.ts)): Encerra automaticamente qualquer rodada previamente aberta, valida o projeto ativo, gera o documento da nova rodada com status `open` e registra `startedAt: FieldValue.serverTimestamp()`, atualizando o evento de forma atômica no Firestore. Garante que apenas **uma rodada permaneça aberta por evento**.
  - **`closeRound`** ([`functions/src/rounds/closeRound.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/functions/src/rounds/closeRound.ts)): Encerra a rodada ativa no servidor, registra `endedAt: FieldValue.serverTimestamp()` e atualiza o status para `closed`, impedindo imediatamente novas submissões de voto.
  - **`prepareNextRound`** ([`functions/src/rounds/prepareNextRound.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/functions/src/rounds/prepareNextRound.ts)): Verifica o encerramento da rodada anterior, identifica o próximo projeto por ordem sequencial e coloca o evento no estado de preparação (`waiting`). **Não abre automaticamente a votação**, preservando o controle humano do operador de palco.
- Integração nas páginas administrativas:
  - [`AdminProjectsPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/admin/AdminProjectsPage.tsx): Botão "Liberar Votação" dispara `openRound` diretamente no servidor.
  - [`AdminRoundPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/admin/AdminRoundPage.tsx): Controle de rodada em tempo real com botões de encerrar avaliação, preparar próximo projeto e abrir próxima rodada.

#### 2. Fluxo Público Reativo e Automático
- Implementado em [`VotingContext.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/contexts/VotingContext.tsx) e páginas do público:
  - **Sessão Anônima Persistente:** O participante obtém UID anônimo automaticamente ao acessar `/votar`, preservado no navegador via `browserLocalPersistence`.
  - **Reatividade em Tempo Real (`onSnapshot`):** Assinatura instantânea do estado do evento e da rodada ativa sem necessidade de polling ou recarregar a página (`F5`).
  - **Transição Automática de Telas:**
    - Ao acessar com rodada fechada ou em preparação $\rightarrow$ Redirecionamento automático para a tela de espera ([`WaitingPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/public/WaitingPage.tsx)).
    - Quando o administrador clica em "Liberar Votação" $\rightarrow$ O evento é atualizado no Firestore e todos os celulares conectados transitam instantaneamente para a tela de avaliação ([`EvaluationPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/public/EvaluationPage.tsx)) com o banner, nome e descrição do projeto ativo.
    - O participante seleciona as 3 notas (1 a 5) para Inovação, Impacto e Salto Tecnológico e clica em "CONFIRMAR VOTO".
    - Validação e envio executados via Cloud Function `submitVote` com feedback visual de carregamento.
    - Recebimento de confirmação oficial com timestamp e transição automática para a tela de confirmação ([`ConfirmationPage.tsx`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/pages/public/ConfirmationPage.tsx)).
    - Quando o administrador encerra a rodada ou prepara o próximo projeto, o público transita de volta para `/aguardando`.

#### 3. Prevenção de Votos Duplicados e Transação Atômica
- Implementado na Cloud Function **`submitVote`** ([`functions/src/voting/submitVote.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/functions/src/voting/submitVote.ts)):
  - **Chave Determinística:**
    $$\text{voteId} = \text{eventId} + \text{"\_"} + \text{projectId} + \text{"\_"} + \text{voterUid}$$
  - **Transação Atômica:**
    1. Verifica autenticação do participante (`request.auth.uid`).
    2. Valida se as 3 notas são números inteiros estritamente entre 1 e 5.
    3. Confirma se a rodada referenciada está com status `open`.
    4. Verifica atomicamente se o documento `votes/{voteId}` já existe. Se existir, rejeita com erro `ALREADY_EXISTS`.
    5. Grava o voto imutável na coleção `votes`.
    6. Atualiza atomicamente o agregador em `results/{eventId}_{projectId}` (total de votos, somatórios e recálculo das médias).
  - Garante que cada participante vote **apenas 1 vez por projeto**, mas permite que participe das rodadas dos demais projetos da noite.

#### 4. Integridade do Cronômetro do Servidor
- Resolvido o requisito de persistência do cronômetro:
  - O cronômetro da rodada é calculado com base no `startedAt` gravado pelo servidor Firestore (`serverTimestamp`):
    $$\text{segundosDecorridos} = \left\lfloor \frac{\text{Date.now()} - \text{startedAt.toMillis()}}{1000} \right\rfloor$$
  - O tempo **não reinicia** quando o operador ou o público atualiza a página ou reconecta a conexão.

#### 5. Contador de Votos em Tempo Real
- O painel administrativo escuta em tempo real o documento agregado `results/{eventId}_{projectId}` através de `subscribeToProjectResults`.
- Conforme os votos são confirmados pela Cloud Function, o contador de votos na tela do administrador atualiza instantaneamente sem atraso ou polling.

#### 6. Compilação e Qualidade de Código
- **Backend Cloud Functions (`functions/lib/`):** Compilação TypeScript com 0 erros (`npm.cmd --prefix functions run build`).
- **Frontend SPA (`dist/`):** Compilação completa com TypeScript e Vite com 0 erros (`npm.cmd run build`).

---

### Detalhamento da Etapa 4 — Concluída ✅

#### 1. Infraestrutura e Serviços Firebase
- Configuração oficial dos serviços em [`src/firebase/config.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/firebase/config.ts):
  - **Firebase Authentication:** Suporte a sessões anônimas para o público e e-mail/senha com Custom Claims para administradores.
  - **Cloud Firestore:** Instância oficial com persistência local de dados e suporte ao Firebase Emulator Suite.
  - **Cloud Functions:** Configuração v2 (`southamerica-east1`) para as 5 funções de backend.
  - **Firebase Storage:** Bucket oficial para upload e visualização de banners de projetos.
  - **Firebase Hosting:** Arquitetura SPA com rewrites para `index.html`.
  - **Firebase App Check:** Preparado com provider reCAPTCHA v3 e suporte a debug token no ambiente de desenvolvimento local.

#### 2. Autenticação do Público e Administrativa
- Implementação em [`src/services/authService.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/services/authService.ts):
  - **Público:** Autenticação anônima instantânea sem solicitação de e-mail ou senha, persistente no navegador via `browserLocalPersistence`.
  - **Administrativa:** Validação obrigatória de Custom Claims no servidor (`token.admin === true` ou `token.role === 'admin'`). O acesso a rotas `/admin` não concede privilégios de escrita nem permissões de execução.

#### 3. Modelo de Dados Oficial do Firestore
- Tipagem TypeScript estrita em [`src/types/firebase.ts`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/src/types/firebase.ts):
  - **`events`**: Metadados, status (`draft`, `active`, `finished`), `currentRoundId`, `currentProjectId`, `resultsPublished`.
  - **`projects`**: `eventId`, `name`, `description`, `bannerUrl`, `order`, `active`.
  - **`rounds`**: `eventId`, `projectId`, `status` (`waiting`, `open`, `closed`), `startedAt`, `endedAt`.
  - **`votes`**: `eventId`, `roundId`, `projectId`, `voterUid`, `innovation` (1 a 5), `impact` (1 a 5), `development` (1 a 5).
  - **`results`**: `eventId`, `projectId`, `totalVotes`, `sumInnovation`, `sumImpact`, `sumDevelopment`, `averageInnovation`, `averageImpact`, `averageDevelopment`, `averageGeneral`, `percentage`, `popularPoints`.
- Todos os documentos possuem particionamento por `eventId` para suportar múltiplas edições e isolamento de dados.

#### 4. Identificação e Prevenção de Votos Duplicados
- Implementação da chave determinística:
  $$\text{voteId} = \text{eventId} + \text{"\_"} + \text{projectId} + \text{"\_"} + \text{voterUid}$$
- Transação atômica em Cloud Function (`submitVote`) impedindo que o mesmo UID anônimo vote mais de uma vez no mesmo projeto.
- Documentado que a identificação anônima garante voto único por UID/dispositivo autenticado, mas não substitui verificação biométrica/física de CPF.

#### 5. Regras de Segurança do Firestore (`firestore.rules`)
- **Negação Padrão:** `allow read, write: if false;`
- **Votos (`votes`):** Escrita direta pelo cliente bloqueada (`allow write: if false;`). Registro executado exclusivamente via Cloud Functions com Admin SDK. Leitura restrita ao próprio autor do voto (`voterUid == request.auth.uid`) ou admin.
- **Resultados (`results`):** Escrita direta pelo cliente bloqueada.
- **Projetos e Rodadas:** Escrita restrita a administradores validados via claims.

#### 6. Regras de Segurança do Storage (`storage.rules`)
- Banners armazenados em `events/{eventId}/banners/{projectId}/{fileName}`.
- Validação de formato (apenas `image/jpeg`, `image/png`, `image/webp`) e tamanho máximo de 5 MB.
- Escrita restrita exclusivamente a administradores autenticados.
- Logos e arquivos de marca continuam estáticos locais em `public/assets/branding/`.

#### 7. Cloud Functions de Backend (`functions/src/`)
- Módulos desenvolvidos e compilados (`tsc` 0 erros):
  1. [`openRound`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/functions/src/rounds/openRound.ts): Fecha rodadas anteriores, cria nova rodada com status `open` e atualiza o evento.
  2. [`closeRound`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/functions/src/rounds/closeRound.ts): Encerra a rodada ativa com timestamp de término.
  3. [`prepareNextRound`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/functions/src/rounds/prepareNextRound.ts): Prepara o próximo projeto com status `waiting` sem abrir automaticamente a votação.
  4. [`submitVote`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/functions/src/voting/submitVote.ts): Transação atômica de validação, gravação determinística e recálculo instantâneo das médias de pontuação popular.
  5. [`getAdminResults`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/functions/src/results/getAdminResults.ts): Relatório administrativo consolidado ordenado por média geral.

#### 8. Ambiente Local e Requisitos de Plano
- Índices compostos configurados em [`firestore.indexes.json`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/firestore.indexes.json).
- Script de teste e seed criado em [`scripts/seedEmulators.js`](file:///c:/Users/IZABELLAA/Documents/ARENA_VOICE_VOTO_POPULAR/scripts/seedEmulators.js).
- **Esclarecimento de Plano:** No plano gratuito **Spark**, o Firestore, Authentication, Hosting, Storage e o **Firebase Emulator Suite** operam normalmente sem custos. Para deploy de Cloud Functions em produção no Google Cloud, a infraestrutura do Google exige o plano **Blaze** (Pay-as-you-go). No entanto, todo o desenvolvimento e homologação local no Emulator Suite dispensa cartão de crédito ou ativação de faturamento.

---

**Status Atual:** Etapa 5 finalizada com sucesso. Aguardando autorização do usuário para iniciar a **Etapa 6**.
