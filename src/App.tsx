import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { VotingProvider } from '@/contexts/VotingProvider';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { ErrorBoundary } from '@/components/ui';
import AppRoutes from '@/routes';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AdminAuthProvider>
          <VotingProvider>
            <AppRoutes />
          </VotingProvider>
        </AdminAuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
