# DIÁRIO DE BORDO — PROGRESSO DO PROJETO
## ARENA VOICE — VOTO POPULAR

Este documento registra o status de execução de cada uma das 9 etapas de desenvolvimento do sistema de votação popular em tempo real para o evento Arena Voice.

---

### Resumo do Status Geral

- [x] **Etapa 1: Planejamento, Arquitetura e Organização da Identidade Visual** (Concluída ✅)
- [x] **Etapa 2: Implementação Completa das Telas do Público** (Concluída ✅)
- [x] **Etapa 3: Desenvolvimento do Painel Administrativo** (Concluída ✅)
- [x] **Etapa 4: Configuração do Firebase e Modelo de Dados** (Concluída ✅)
- [ ] **Etapa 5: Controle de Rodadas, Sincronização em Tempo Real e Voto Único com Firebase** (Aguardando autorização)
- [ ] **Etapa 6: Consolidação de Resultados e Cálculo Oficial dos 20%** (Pendente)
- [ ] **Etapa 7: Telão de Projeção, Pódio e Visualização de Métricas** (Pendente)
- [ ] **Etapa 8: Relatórios, Exportação de Dados e Auditoria** (Pendente)
- [ ] **Etapa 9: Testes de Carga, Resiliência, Otimização e Homologação Final** (Pendente)

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

**Status Atual:** Etapa 4 finalizada com sucesso. Aguardando autorização do usuário para iniciar a **Etapa 5**.
