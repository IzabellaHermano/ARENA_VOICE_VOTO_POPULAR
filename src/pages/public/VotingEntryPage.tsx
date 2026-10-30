import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import { Loader2 } from 'lucide-react';

export const VotingEntryPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionamento inicial: no fluxo real (etapa futura) verifica o estado da rodada no Firestore
    const timer = setTimeout(() => {
      navigate('/aguardando');
    }, 1200);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
      <ArenaLogo variant="complete" width={280} className="mb-6" />

      <div className="bg-arena-card border border-arena-border rounded-2xl p-6 w-full max-w-sm flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 text-arena-red animate-spin" />
        <h2 className="text-lg font-semibold">Conectando à votação...</h2>
        <p className="text-xs text-gray-400">
          Sincronizando com o painel do apresentador em tempo real.
        </p>
      </div>
    </div>
  );
};

export default VotingEntryPage;

