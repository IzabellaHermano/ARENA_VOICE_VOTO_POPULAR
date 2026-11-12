import { Timestamp } from 'firebase/firestore';

/**
 * Modelo Oficial de Dados do Firestore — Arena Voice Voto Popular
 * Conforme especificado na Etapa 4
 */

// Coleção: events
export interface EventDocument {
  id?: string;
  name: string;
  status: 'draft' | 'active' | 'finished';
  currentRoundId: string | null;
  currentProjectId: string | null;
  resultsPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Coleção: projects
export interface ProjectDocument {
  id?: string;
  eventId: string;
  name: string;
  category?: string;
  description: string;
  bannerUrl: string;
  order: number;
  active: boolean;
  status?: 'active' | 'inactive' | 'draft';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Coleção: rounds
export interface RoundDocument {
  id?: string;
  eventId: string;
  projectId: string;
  status: 'waiting' | 'open' | 'closed';
  startedAt: Timestamp | null;
  endedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Coleção: votes
export interface VoteDocument {
  id?: string; // Chave determinística: `${eventId}_${projectId}_${voterUid}`
  eventId: string;
  roundId: string;
  projectId: string;
  voterUid: string;
  innovation: number; // 1 a 5
  impact: number; // 1 a 5
  development: number; // 1 a 5
  createdAt: Timestamp;
}

// Coleção: results
export interface ResultDocument {
  id?: string; // `${eventId}_${projectId}`
  eventId: string;
  projectId: string;
  totalVotes: number;
  sumInnovation: number;
  sumImpact: number;
  sumDevelopment: number;
  averageInnovation: number | null;
  averageImpact: number | null;
  averageDevelopment: number | null;
  averageGeneral: number | null;
  percentage: number | null;
  popularPoints: number | null;
  updatedAt: Timestamp;
}

/**
 * Gera a chave determinística para impedir votos duplicados do mesmo usuário no mesmo projeto
 */
export function generateDeterministicVoteId(
  eventId: string,
  projectId: string,
  voterUid: string
): string {
  return `${eventId}_${projectId}_${voterUid}`;
}

/**
 * Gera a chave do documento de resultado consolidado
 */
export function generateResultId(eventId: string, projectId: string): string {
  return `${eventId}_${projectId}`;
}

