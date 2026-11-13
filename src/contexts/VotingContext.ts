import { createContext } from 'react';
import { EventDocument, ProjectDocument, RoundDocument } from '@/types';
import { EventQuestion } from '@/types/supabase';

export interface VotingContextType {
  voterUid: string | null;
  event: EventDocument | null;
  currentRound: RoundDocument | null;
  currentProject: ProjectDocument | null;
  currentQuestions: EventQuestion[];
  hasVotedCurrentProject: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'offline';
  errorMessage: string | null;
  submitCurrentVote: (payload: {
    answers?: Record<string, number>;
    innovation?: number | null;
    impact?: number | null;
    development?: number | null;
  }) => Promise<void>;
  clearError: () => void;
}

export const VotingContext = createContext<VotingContextType | undefined>(undefined);

export default VotingContext;

