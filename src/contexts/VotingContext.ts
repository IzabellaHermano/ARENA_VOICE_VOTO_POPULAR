import { createContext } from 'react';
import { EventDocument, ProjectDocument, RoundDocument } from '@/types';

export interface VotingContextType {
  voterUid: string | null;
  event: EventDocument | null;
  currentRound: RoundDocument | null;
  currentProject: ProjectDocument | null;
  hasVotedCurrentProject: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  connectionStatus: 'connected' | 'connecting' | 'offline';
  errorMessage: string | null;
  submitCurrentVote: (scores: { innovation: number; impact: number; development: number }) => Promise<void>;
  clearError: () => void;
}

export const VotingContext = createContext<VotingContextType | undefined>(undefined);

export default VotingContext;

