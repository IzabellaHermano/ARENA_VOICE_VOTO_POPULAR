import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '@/components/layout/PublicLayout';
import AdminLayout from '@/components/layout/AdminLayout';

// Public Pages
import HomePage from '@/pages/public/HomePage';
import WaitingPage from '@/pages/public/WaitingPage';
import EvaluationPage from '@/pages/public/EvaluationPage';
import ConfirmationPage from '@/pages/public/ConfirmationPage';
import BigScreenRankingPage from '@/pages/public/BigScreenRankingPage';

// Admin Pages
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminProjectsPage from '@/pages/admin/AdminProjectsPage';
import AdminRoundPage from '@/pages/admin/AdminRoundPage';
import AdminResultsPage from '@/pages/admin/AdminResultsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rotas Públicas com PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/votar" element={<HomePage />} />
        <Route path="/aguardando" element={<WaitingPage />} />
        <Route path="/avaliar" element={<EvaluationPage />} />
        <Route path="/confirmacao" element={<ConfirmationPage />} />
      </Route>

      {/* Rota do Telão e Ranking (Sem sidebar administrativa, visão limpa full-screen) */}
      <Route path="/resultados/telao" element={<BigScreenRankingPage />} />
      <Route path="/telao" element={<BigScreenRankingPage />} />
      <Route path="/ranking" element={<BigScreenRankingPage />} />

      {/* Rota de Login Administrativo */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Rotas Administrativas com AdminLayout */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/projetos" replace />} />
        <Route path="projetos" element={<AdminProjectsPage />} />
        <Route path="rodada" element={<AdminRoundPage />} />
        <Route path="resultados" element={<AdminResultsPage />} />
        <Route path="configuracoes" element={<AdminSettingsPage />} />
      </Route>

      {/* Rota Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

