import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { VotingProvider } from '@/contexts/VotingContext';
import AppRoutes from '@/routes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <VotingProvider>
        <AppRoutes />
      </VotingProvider>
    </BrowserRouter>
  );
};

export default App;
