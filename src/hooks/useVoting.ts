import { useContext } from 'react';
import { VotingContext, VotingContextType } from '@/contexts/VotingContext';

export const useVoting = (): VotingContextType => {
  const context = useContext(VotingContext);
  if (!context) {
    throw new Error('useVoting deve ser utilizado dentro de um VotingProvider');
  }
  return context;
};

export default useVoting;

