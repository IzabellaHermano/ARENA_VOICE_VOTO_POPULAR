# ARENA VOICE — VOTO POPULAR
> **Sistema Oficial de Votação Popular em Tempo Real para Apresentações de Inovação**  
> *Identidade Oficial: ARENA Prata | VOICE Dourado | "Ideias que viram futuro"*

---

## 1. 📌 Visão Geral

O **Arena Voice — Voto Popular** é uma plataforma web responsiva de alta performance e auditoria desenvolvida para permitir a participação do público presente em eventos presenciais e transmissões ao vivo. 

Através do escaneamento de um **QR Code único**, o participante acessa uma aplicação móvel intuitiva onde avalia o pitch da equipe competidora em tempo real em três critérios fundamentais (Inovação, Impacto e Salto de Desenvolvimento).

Simultaneamente, a comissão organizadora gerencia as rodadas pelo **Painel Administrativo**, enquanto o **Telão de Palco em formato 16:9** projeta dinamicamente a contagem de votos, o cronômetro do servidor e o pódio final de premiação oficial (compondo os 20% da nota global dos projetos).

---

## 2. 🏛️ Arquitetura do Sistema

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 ARENA VOICE TELÃO 16:9                 │
                  │   (/telao, /qrcode, /ranking - Sincronização em Tempo) │
                  └───────────────────────────▲────────────────────────────┘
                                              │ Firestore onSnapshot
                                              │
┌──────────────────────────┐      ┌───────────┴──────────┐      ┌──────────────────────────┐
│      PÚBLICO GERAL       │      │   CLOUD FIRESTORE    │      │      ADMINISTRAÇÃO       │
│  (/votar, /avaliar, ...) │◄────►│ (events, projects,   │◄────►│   (/admin, /rodada, ...) │
│   Firebase Anonymous     │      │  rounds, results)    │      │  Claims 'admin' Token    │
└────────────┬─────────────┘      └───────────▲──────────┘      └────────────┬─────────────┘
             │                                │                              │
             │ HTTPS Callable                 │ Atomic Transactions          │ HTTPS Callable
             ▼                                │                              ▼
┌─────────────────────────────────────────────┴────────────────────────────────────────────┐
│                                CLOUD FUNCTIONS v2 (Node 20)                              │
│         [submitVote]        [openRound]        [closeRound]       [prepareNextRound]     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 🛠️ Tecnologias Utilizadas

### Front-end
- **Linguagem & Framework:** React 18 com TypeScript 5 e Vite 6
- **Estilização:** Tailwind CSS com paleta neon (`arena-red`, `arena-blue`, `arena-gold`, `arena-black`)
- **Roteamento:** React Router DOM v6 com suporte total a SPA (*Single Page Application*)
- **Ícones:** Lucide React
- **Gráficos e Métricas:** Recharts
- **Animações Fluidas:** Framer Motion
- **Geração de QR Code:** QRCodeSVG (`qrcode.react`) com nível H de correção de erro

### Back-end & Infraestrutura (Firebase)
- **Firebase Authentication:** Sessões anônimas para o público (`browserLocalPersistence`) e credenciais de e-mail/senha com *custom claims* para administradores.
- **Cloud Firestore:** Banco NoSQL particionado por evento, com arquitetura agregada $O(1)$ na coleção `results`.
- **Cloud Functions v2:** Funções serverless com Firebase Admin SDK para transações atômicas de votação e controle de rodadas.
- **Firebase Storage:** Armazenamento seguro de banners com validação MIME e limite de 5 MB.
- **Firebase Hosting:** Distribuição global com CDN, compressão Gzip e SSL/HTTPS automático.

---

## 4. 📂 Estrutura de Pastas

```text
ARENA_VOICE_VOTO_POPULAR/
├── public/
│   ├── assets/branding/       # 6 arquivos de logos e mascotes oficiais
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── assets/branding/       # Imagens complementares
│   ├── components/
│   │   ├── admin/             # ProjectCard, ProjectForm, RoundTimer, VoteCounter
│   │   ├── branding/          # ArenaLogo.tsx e ArenaMascot.tsx
│   │   ├── layout/            # PublicLayout e AdminLayout
│   │   ├── qrcode/            # QRCodeDisplay.tsx
│   │   ├── results/           # ProjectResultCard, CriteriaComparisonChart, ResultsTable
│   │   ├── ui/                # ErrorBoundary, ProjectBanner, WaitingAnimation
│   │   └── voting/            # RatingSelector.tsx, VotingButton.tsx
│   ├── contexts/              # VotingContext.ts e VotingProvider.tsx (HMR-safe)
│   ├── firebase/              # config.ts (SDK Web) e index.ts
│   ├── hooks/                 # useVoting.ts
│   ├── pages/
│   │   ├── admin/             # Login, Projetos, Rodada, Resultados, Configurações
│   │   └── public/            # Home, Espera, Avaliar, Confirmação, Telão, QR Code
│   ├── routes/                # index.tsx (Roteamento universal SPA)
│   ├── services/              # eventService.ts e adminMockService.ts
│   ├── types/                 # Interfaces TypeScript do modelo de dados
│   ├── utils/                 # scoring.ts, exportReports.ts, url.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── functions/                 # Backend Cloud Functions (TypeScript)
│   └── src/
│       ├── rounds/            # openRound, closeRound, prepareNextRound
│       ├── voting/            # submitVote (transação atômica)
│       └── results/           # getAdminResults
├── scripts/                   # Suítes de testes automatizados (.mjs)
│   ├── testEtapa6.mjs         # Validação matemática dos 20% e rankings
│   ├── testEtapa7.mjs         # Validação de Telão e QR Code
│   ├── testEtapa8.mjs         # Auditoria técnica e segurança Firestore
│   └── testEtapa9Simulation.mjs # Simulação do ciclo completo do evento
├── firebase.json              # Configurações de Hosting, Firestore, Storage e Emulators
├── firestore.rules            # Regras estritas de segurança NoSQL
├── storage.rules              # Regras de upload de mídia
├── .firebaserc                # Associação ao projeto arena-voice-voto-popular
├── PROGRESSO.md               # Diário de bordo detalhado de todas as 9 etapas
└── README.md
```

---

## 5. ⚙️ Instalação e Execução Local

### Pré-requisitos
- **Node.js:** Versão 18 ou superior (testado e compatível até Node 26)
- **npm:** Versão 9+ ou **pnpm**
- **Firebase CLI:** Instalado globalmente (`npm install -g firebase-tools`)

### 1. Clonar e Instalar Dependências
```bash
# Na raiz do projeto:
npm install

# Instalar dependências das Cloud Functions:
cd functions
npm install
cd ..
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e configure suas chaves do Firebase:
```bash
cp .env.example .env
```

Conteúdo de `.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSyBjgzrrGuJdUAjB_m8yPoMVbZb-yuBzOes
VITE_FIREBASE_AUTH_DOMAIN=arena-voice-voto-popular.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=arena-voice-voto-popular
VITE_FIREBASE_STORAGE_BUCKET=arena-voice-voto-popular.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=906850350363
VITE_FIREBASE_APP_ID=1:906850350363:web:7d60399ff45b92f04b8fbe

# URL pública utilizada na geração do QR Code:
VITE_PUBLIC_APP_URL=https://arena-voice-voto-popular.web.app

# Desative os emuladores para utilizar o projeto online:
VITE_USE_FIREBASE_EMULATORS=false
```

### 3. Rodar em Modo de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:3000`.

---

## 6. 🧪 Suíte de Testes Automatizados

O sistema inclui quatro suítes independentes de testes automatizados cobrindo todas as regras de negócio, concorrência e segurança:

```bash
# 1. Validação matemática dos 20%, empates e relatórios:
node --experimental-strip-types scripts/testEtapa6.mjs

# 2. Validação do Telão 16:9, QR Code dinâmico e resiliência offline:
node --experimental-strip-types scripts/testEtapa7.mjs

# 3. Auditoria de segurança Firestore, concorrência de 50 votos e integridade:
node --experimental-strip-types scripts/testEtapa8.mjs

# 4. Simulação ponta a ponta do ciclo completo do evento (15 passos):
node --experimental-strip-types scripts/testEtapa9Simulation.mjs
```

---

## 7. 📱 Fluxo do Público (Mobile)

1. **Acesso:** O participante aponta a câmera do celular para o QR Code projetado no telão (`/votar`).
2. **Identificação Transparente:** O Firebase Authenticator gera uma sessão anônima persistida localmente (`IndexedDB`), dispensando cadastro burocrático de e-mail ou senha.
3. **Sala de Espera (`/aguardando`):** Se a rodada não estiver liberada pelo operador, o participante visualiza uma tela temática aguardando o início do pitch.
4. **Avaliação Simultânea (`/avaliar`):** No momento em que o administrador clica em *"Liberar Votação"*, os smartphones de toda a plateia transitam instantaneamente para a tela de notas:
   - 💡 **Inovação:** notas de 1 a 5
   - 📈 **Impacto na Operação:** notas de 1 a 5
   - 🚀 **Salto de Desenvolvimento:** notas de 1 a 5
5. **Confirmação:** Ao enviar, uma transação atômica registra o voto individual com chave determinística `${eventId}_${projectId}_${uid}` e incrementa o somatório da equipe. A tela de confirmação (`/confirmacao`) é exibida e protegida contra votos repetidos.

---

## 8. 💻 Fluxo do Administrador (Painel)

1. **Acesso:** Acesse `/admin/login` e informe as credenciais de operador.
2. **Projetos (`/admin/projetos`):** Cadastre, edite a ordem e configure as URLs de banner das equipes competidoras.
3. **Controle da Rodada (`/admin/rodada`):**
   - Selecione a equipe que subirá ao palco.
   - Clique em **"LIBERAR VOTAÇÃO"** (Dourado): abre a rodada no Firestore e inicia o cronômetro oficial.
   - Acompanhe o contador atômico de votos computados ao vivo.
   - Clique em **"ENCERRAR AVALIAÇÃO"** (Vermelho): bloqueia imediatamente novas submissões no servidor.
   - Clique em **"PRÓXIMO PROJETO"** (Azul): prepara a próxima equipe no estado de espera sem liberar o formulário antecipadamente.
4. **Dashboard e Resultados (`/admin/resultados`):**
   - Visualize as médias com precisão de 1 casa decimal e percentuais.
   - Compare o desempenho por critério em gráficos visuais.
   - Clique em **"Divulgar Resultados"** para liberar a visualização no telão de palco.
   - Exporte a planilha em CSV, Excel SpreadsheetML ou PDF para auditoria.

---

## 9. 🧮 Fórmula Oficial de Pontuação (20% da Nota Final)

Cada um dos três critérios possui o mesmo peso:

$$\text{Média Inovação} = \frac{\sum \text{Notas de Inovação}}{\text{Total de Votos}}$$

$$\text{Média Impacto} = \frac{\sum \text{Notas de Impacto}}{\text{Total de Votos}}$$

$$\text{Média Salto} = \frac{\sum \text{Notas de Salto}}{\text{Total de Votos}}$$

$$\text{Média Geral} = \frac{\text{Média Inovação} + \text{Média Impacto} + \text{Média Salto}}{3}$$

$$\text{Percentual Popular} = \left(\frac{\text{Média Geral}}{5}\right) \times 100$$

$$\text{Pontos do Voto Popular (até 20 pts)} = \left(\frac{\text{Média Geral}}{5}\right) \times 20$$

*Regra de Exibição:* Projetos sem avaliações aparecem estritamente como `"Sem avaliações"` (nunca com nota `0` ou `0.0`). O ranking preserva a precisão completa de ponto flutuante para desempates reais.

---

## 10. 🔒 Limitações de Segurança Conhecidas

- **Autenticação Anônima:** O sistema vincula a identidade ao navegador e armazenamento local do aparelho. **Não há verificação civil/biométrica de CPF**. Um usuário pode gerar outra identidade se acessar por janela anônima ou outro celular.
- **Defesas Implementadas:** Bloqueio atômico de duplicação por UID no Firestore, chave única determinística por documento, negação de escrita direta no banco (`allow write: if false`) e bloqueio de consultas a resultados não divulgados.

---

## 11. 🚀 Procedimentos para Publicação (Deploy)

A publicação do frontend no Firebase Hosting é feita com:

```bash
# 1. Compilar os arquivos TypeScript e empacotar no Vite:
npm run build

# 2. Publicar regras do Firestore e Hosting:
firebase deploy --only hosting,firestore:rules
```

- **URL Pública Oficial:** [https://arena-voice-voto-popular.web.app](https://arena-voice-voto-popular.web.app)
- **Telão de Palco:** [https://arena-voice-voto-popular.web.app/telao](https://arena-voice-voto-popular.web.app/telao)
- **Painel Administrativo:** [https://arena-voice-voto-popular.web.app/admin/login](https://arena-voice-voto-popular.web.app/admin/login)
