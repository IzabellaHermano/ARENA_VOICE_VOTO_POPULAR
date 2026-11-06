import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { VotingProvider } from '@/contexts/VotingProvider';
import { ErrorBoundary } from '@/components/ui';
import AppRoutes from '@/routes';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <VotingProvider>
          <AppRoutes />
        </VotingProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
