# ARENA VOICE — VOTO POPULAR

Sistema web de votação popular em tempo real para o evento **Arena Voice**, permitindo que o público avalie apresentações de projetos de inovação pelo celular via QR Code, enquanto o administrador gerencia rodadas, projetos e resultados em um painel interativo com sincronização instantânea e exibição em telão.

---

## 🚀 Arquitetura Tecnológica

### Front-end
- **Framework & Build:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) com paleta oficial Arena Voice (vermelho neon, dourado metálico, prata e cinzas escuros)
- **Roteamento:** [React Router v6](https://reactrouter.com/)
- **Ícones & UI:** [Lucide React](https://lucide.dev/)
- **Visualização de Dados:** [Recharts](https://recharts.org/)
- **Animações:** [Framer Motion](https://www.framer.com/motion/)

### Backend e Infraestrutura (Firebase)
- **Autenticação:** Firebase Auth (Admin via E-mail/Senha com Custom Claims no servidor; Público via login anônimo sem cadastro prévio, persistente no navegador)
- **Banco de Dados:** Cloud Firestore em tempo real com dados particionados por `eventId` nas coleções: `events`, `projects`, `rounds`, `votes` e `results`
- **Regras de Segurança:** `firestore.rules` com negação padrão, bloqueio de escrita direta de votos e resultados pelo cliente, e acesso exclusivo via Cloud Functions
- **Cloud Functions v2:** `openRound`, `closeRound`, `prepareNextRound`, `submitVote` e `getAdminResults` com validação de permissões no servidor
- **Armazenamento:** Firebase Storage (`storage.rules`) para upload de banners com validação de MIME e tamanho máximo (5 MB)
- **Hospedagem:** Firebase Hosting com SSL/HTTPS nativo
- **Emuladores:** Firebase Emulator Suite configurado em `firebase.json` (portas 9099, 8080, 5001, 5000, 4000)

---

## 🎨 Identidade Visual e Regras da Marca

### Arquivos Oficiais Mapeados

| Arquivo Original | Localização de Referência | Arquivo Web (`/public/assets/branding/`) | Componente & Variante |
| :--- | :--- | :--- | :--- |
| `Logo_Completo_Preto.png` | `referencias/identidade-visual/Logo_Completo_Preto.png` | `logo-completa.png` | `<ArenaLogo variant="complete" />` |
| `Escrita_Preta.png` | `referencias/identidade-visual/Escrita_Preta.png` | `logo-escrita.png` | `<ArenaLogo variant="text" />` |
| `Escrita_Compreta_Preto.png` | `referencias/identidade-visual/Escrita_Completa_Preto.png` | `logo-escrita-slogan.png` | `<ArenaLogo variant="textWithSlogan" />` |
| `Escrita_Transparente.png` | `referencias/identidade-visual/Escrita_Transparente.png` | `logo-escrita-transparente.png` | `<ArenaLogo variant="transparentText" />` |
| `Mascote_Transparente.png` | `referencias/identidade-visual/Mascote_Transparente.png` | `mascote-transparente.png` | `<ArenaMascot variant="transparent" />` |
| `Macote_Preto.png` | `referencias/identidade-visual/Macote_Preto.png` | `mascote-preto.png` | `<ArenaMascot variant="black" />` |

### Regras Obrigatórias de Aplicação da Marca
- **ARENA**: Prata metálico cromado.
- **VOICE**: Dourado metálico.
- **Mão Metálica**: Cromada em sinal de 'V' segurando microfone.
- **Iluminação**: Vermelha nas bordas (glow neon).
- **Slogan**: *"IDEIAS QUE VIRAM FUTURO"* nas versões completas.
- **Preservação**: Não recriar elementos em CSS/vetores/emojis; manter proporções e cores originais; utilizar `object-fit: contain`.
- **Padrão de Utilização**:
  - *Home*: Logo completa.
  - *Espera*: Logo completa ou escrita com slogan.
  - *Avaliação*: Logo completa em versão compacta.
  - *Confirmação*: Logo completa.
  - *Login administrativo*: Logo completa.
  - *Menu lateral*: Escrita transparente.
  - *Dashboard*: Logo completa ou escrita com slogan.
  - *Ranking / Telão*: Logo completa com mascote decorativo transparente.

---

## 📁 Estrutura do Projeto

```text
arena-voice-voto-popular/
├── referencias/
│   ├── identidade-visual/     # Arquivos originais oficiais preservados
│   └── telas/                 # Protótipos e diagramas arquiteturais
├── public/
│   └── assets/
│       └── branding/          # Logos e mascotes para consumo web
├── src/
│   ├── assets/                # Assets complementares
│   ├── components/
│   │   ├── branding/          # ArenaLogo.tsx e ArenaMascot.tsx
│   │   ├── layout/            # PublicLayout e AdminLayout
│   │   ├── ui/                # Componentes base reutilizáveis
│   │   ├── voting/            # Componentes de votação do público
│   │   ├── admin/             # Componentes administrativos
│   │   └── dashboard/         # Visualizações de métricas
│   ├── pages/
│   │   ├── public/            # Home, Votar, Aguardando, Avaliar, Confirmação, Telão
│   │   └── admin/             # Login, Projetos, Rodada, Resultados, Configurações
│   ├── contexts/              # Contextos globais (Auth, Rodada)
│   ├── hooks/                 # Custom hooks (Firestore real-time)
│   ├── services/              # Serviços de comunicação
│   ├── firebase/              # Inicialização e configuração do SDK Firebase
│   ├── routes/                # Definição e proteção de rotas
│   ├── types/                 # Interfaces TypeScript do modelo de dados
│   ├── utils/                 # Funções utilitárias e regras de cálculo
│   ├── App.tsx
│   └── main.tsx
├── functions/                 # Backend Cloud Functions
│   └── src/
│       ├── voting/
│       ├── rounds/
│       └── results/
├── firebase.json              # Configuração Hosting, Firestore e Emuladores
├── firestore.rules            # Regras de segurança Firestore
├── storage.rules              # Regras de segurança Cloud Storage
├── .env.example               # Variáveis de ambiente
├── PROGRESSO.md               # Diário de bordo das etapas
└── README.md
```

---

## 🗺️ Rotas do Sistema

### Área Pública (Mobile-First)
- `/`: Home com apresentação e botão de entrada
- `/votar`: Entrada e sincronização inicial
- `/aguardando`: Tela de espera enquanto o apresentador não libera a rodada
- `/avaliar`: Avaliação com os 3 critérios oficiais (1 a 5)
- `/confirmacao`: Confirmação de voto registrado
- `/resultados/telao`: Exibição do pódio e ranking para telão de projeção

### Área Administrativa (Desktop)
- `/admin/login`: Autenticação restrita
- `/admin/projetos`: Seleção e liberação de projetos
- `/admin/rodada`: Controle e métricas em tempo real da rodada ativa
- `/admin/resultados`: Tabela de consolidação de pontuações e exportação
- `/admin/configuracoes`: Parâmetros do evento e status de infraestrutura

---

## 🧮 Regra de Pontuação (20% da Nota Final)

1. **Critérios:**
   - Nível de Inovação (1 a 5)
   - Impacto do Projeto na CPTM (1 a 5)
   - Salto de Desenvolvimento do Projeto (1 a 5)
2. **Cálculos:**
   $$\text{Média Geral} = \frac{\text{Inovação} + \text{Impacto} + \text{Salto}}{3}$$
   $$\text{\% do Voto Popular} = \left(\frac{\text{Média Geral}}{5}\right) \times 100$$
   $$\text{Pontuação na Nota Final (até 20 pts)} = \left(\frac{\text{Média Geral}}{5}\right) \times 20$$

---

## 💻 Como Executar Localmente

### Pré-requisitos
- Node.js (v18+)
- npm ou pnpm

### Passos
1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o arquivo de ambiente:
   ```bash
   cp .env.example .env
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`.

4. Para testar o build de produção:
   ```bash
   npm run build
   ```

