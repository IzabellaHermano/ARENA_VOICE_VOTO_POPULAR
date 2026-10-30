import { Project, Round, EventConfig, AdminUser } from '@/types';

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'projeto01',
    nome: 'Projeto 01',
    categoria: 'Plataforma Inteligente de Gestão',
    descricao: 'Solução preditiva e em tempo real para otimização de mobilidade e eficiência energética na malha.',
    bannerUrl: '',
    ordem: 1,
    ativo: true,
  },
  {
    id: 'projeto02',
    nome: 'Projeto 02',
    categoria: 'Manutenção Preditiva com IoT',
    descricao: 'Sensores inteligentes embarcados para diagnóstico antecipado de falhas em trens e vias permanentes.',
    bannerUrl: '',
    ordem: 2,
    ativo: true,
  },
  {
    id: 'projeto03',
    nome: 'Projeto 03',
    categoria: 'Acessibilidade Digital',
    descricao: 'Ecossistema inclusivo multicanal com inteligência artificial para orientação de passageiros com deficiência.',
    bannerUrl: '',
    ordem: 3,
    ativo: true,
  },
  {
    id: 'projeto04',
    nome: 'Projeto 04',
    categoria: 'Sustentabilidade e Economia Circular',
    descricao: 'Reaproveitamento avançado de componentes e gestão inteligente de resíduos industriais da frota.',
    bannerUrl: '',
    ordem: 4,
    ativo: true,
  },
];

const INITIAL_ROUND: Round = {
  projetoAtualId: 'projeto01',
  status: 'aberta',
  inicio: new Date().toISOString(),
  totalVotos: 142,
};

const INITIAL_EVENT_CONFIG: EventConfig = {
  nomeEvento: 'Arena Voice 2026',
  subtitulo: 'Ideias que viram futuro — Voto Popular',
  statusEvento: 'em_andamento',
  ordemProjetos: ['projeto01', 'projeto02', 'projeto03', 'projeto04'],
  exibirTelaoTempoReal: true,
  tempoPadraoRodadaSegundos: 90,
  pesoVotoPopularPercentual: 20,
};

const INITIAL_ADMINS: AdminUser[] = [
  {
    uid: 'admin_master',
    email: 'admin@arenavoice.com',
    nome: 'Coordenador Arena Voice',
    role: 'superadmin',
    ativo: true,
    ultimoAcesso: 'Hoje às 10:30',
  },
  {
    uid: 'admin_operador',
    email: 'operador@cptm.sp.gov.br',
    nome: 'Operador de Palco',
    role: 'operador',
    ativo: true,
    ultimoAcesso: 'Hoje às 11:15',
  },
];

export const AdminMockService = {
  getProjects(): Project[] {
    const data = localStorage.getItem('arena_voice_admin_projects');
    if (!data) {
      localStorage.setItem('arena_voice_admin_projects', JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    return JSON.parse(data);
  },

  saveProjects(projects: Project[]) {
    localStorage.setItem('arena_voice_admin_projects', JSON.stringify(projects));
  },

  getRound(): Round {
    const data = localStorage.getItem('arena_voice_admin_round');
    if (!data) {
      localStorage.setItem('arena_voice_admin_round', JSON.stringify(INITIAL_ROUND));
      return INITIAL_ROUND;
    }
    return JSON.parse(data);
  },

  saveRound(round: Round) {
    localStorage.setItem('arena_voice_admin_round', JSON.stringify(round));
  },

  getEventConfig(): EventConfig {
    const data = localStorage.getItem('arena_voice_admin_event_config');
    if (!data) {
      localStorage.setItem('arena_voice_admin_event_config', JSON.stringify(INITIAL_EVENT_CONFIG));
      return INITIAL_EVENT_CONFIG;
    }
    return JSON.parse(data);
  },

  saveEventConfig(config: EventConfig) {
    localStorage.setItem('arena_voice_admin_event_config', JSON.stringify(config));
  },

  getAdmins(): AdminUser[] {
    const data = localStorage.getItem('arena_voice_admin_users');
    if (!data) {
      localStorage.setItem('arena_voice_admin_users', JSON.stringify(INITIAL_ADMINS));
      return INITIAL_ADMINS;
    }
    return JSON.parse(data);
  },

  saveAdmins(admins: AdminUser[]) {
    localStorage.setItem('arena_voice_admin_users', JSON.stringify(admins));
  },
};

