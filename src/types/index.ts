/**
 * Tipos centrais do domínio do Arena Voice — Voto Popular
 * Baseado no modelo de dados oficial especificado nas referências arquiteturais
 */

export interface Project {
  id: string;
  nome: string;
  descricao?: string;
  bannerUrl?: string;
  ordem: number;
  ativo: boolean;
  categoria?: string;
}

export interface Vote {
  id: string; // formato: `${projetoId}_${uid}`
  projetoId: string;
  uid: string; // anônimo gerado pelo Firebase Auth
  inovacao: number; // 1 a 5
  impacto: number; // 1 a 5
  salto: number; // 1 a 5
  timestamp: string | number;
}

export type RoundStatus = 'aguardando' | 'aberta' | 'encerrada';

export interface Round {
  projetoAtualId: string;
  status: RoundStatus;
  inicio?: string | number;
  fim?: string | number;
  totalVotos?: number;
}

export interface ProjectResult {
  projetoId: string;
  nome: string;
  mediaInovacao: number;
  mediaImpacto: number;
  mediaSalto: number;
  mediaGeral: number; // (inovacao + impacto + salto) / 3
  percentualVotoPopular: number; // (mediaGeral / 5) * 100
  pontosNotaFinal: number; // (mediaGeral / 5) * 20
  totalVotos: number;
}

export interface EventConfig {
  id?: string;
  nomeEvento: string;
  subtitulo?: string;
  statusEvento: 'planejado' | 'em_andamento' | 'pausado' | 'encerrado';
  ordemProjetos: string[]; // IDs ordenados dos projetos
  exibirTelaoTempoReal: boolean;
  tempoPadraoRodadaSegundos: number; // ex: 90
  pesoVotoPopularPercentual: number; // 20%
}

export interface AdminUser {
  uid: string;
  email: string;
  nome: string;
  role: 'superadmin' | 'admin' | 'operador';
  ativo: boolean;
  ultimoAcesso?: string;
}
