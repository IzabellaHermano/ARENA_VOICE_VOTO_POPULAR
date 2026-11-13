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
  questions_snapshot?: any;
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

export interface QuestionMetric {
  question_id: string;
  title: string;
  position: number;
  total_answers: number;
  sum_score: number;
  average_score: number;
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
  questions_metrics?: QuestionMetric[];
  updated_at: string;
}

export interface EventQuestionRow {
  id: string;
  event_id: string;
  title: string;
  description: string;
  position: number;
  active: boolean;
  required: boolean;
  min_score: number;
  max_score: number;
  created_at: string;
  updated_at: string;
}

export interface EventQuestion {
  id: string;
  eventId: string;
  title: string;
  description: string;
  position: number;
  active: boolean;
  required: boolean;
  minScore: number;
  maxScore: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoteAnswerRow {
  id: string;
  vote_id: string;
  question_id: string;
  score: number;
  created_at: string;
}

export interface VoteAnswer {
  id: string;
  voteId: string;
  questionId: string;
  score: number;
  createdAt?: string;
}

export interface AdminProfileRow {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'operator';
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type AdminProfile = AdminProfileRow;

export interface EventAdminRow {
  id: string;
  event_id: string;
  user_id: string;
  granted_by?: string | null;
  created_at: string;
}

export interface EventAdminAssignment {
  id: string;
  eventId: string;
  userId: string;
  grantedBy?: string | null;
  createdAt: string;
  eventName?: string;
  eventStatus?: string;
}


