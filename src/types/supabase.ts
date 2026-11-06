/**
 * Tipos Oficiais do Banco de Dados Supabase (PostgreSQL) — Arena Voice Voto Popular
 */

export interface EventRow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'finished';
  current_round_id: string | null;
  current_project_id: string | null;
  results_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  event_id: string;
  name: string;
  category: string;
  description: string;
  banner_url: string;
  image_url?: string;
  order: number;
  active: boolean;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface RoundRow {
  id: string;
  event_id: string;
  project_id: string;
  status: 'waiting' | 'open' | 'closed';
  started_at: string | null;
  ended_at: string | null;
  released_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoteRow {
  id: string;
  event_id: string;
  project_id: string;
  round_id: string;
  voter_id: string;
  voter_uid?: string;
  innovation_score: number;
  cptm_impact_score: number;
  development_score: number;
  innovation?: number;
  impact?: number;
  development?: number;
  created_at: string;
}

export interface ResultRow {
  id: string;
  event_id: string;
  project_id: string;
  total_votes: number;
  sum_innovation: number;
  sum_impact: number;
  sum_development: number;
  average_innovation: number | null;
  average_impact: number | null;
  average_development: number | null;
  average_general: number | null;
  percentage: number | null;
  popular_points: number | null;
  updated_at: string;
}

export interface AdminProfileRow {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'operator';
  active: boolean;
  created_at: string;
  updated_at: string;
}

