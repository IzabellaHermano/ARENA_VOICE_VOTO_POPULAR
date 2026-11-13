import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '@/components/layout/PublicLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Public Pages
import PublicVotingPage from '@/pages/public/PublicVotingPage';
import WaitingPage from '@/pages/public/WaitingPage';
import EvaluationPage from '@/pages/public/EvaluationPage';
import ConfirmationPage from '@/pages/public/ConfirmationPage';
import BigScreenPresentationPage from '@/pages/public/BigScreenPresentationPage';

// Admin Pages
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminEventsPage from '@/pages/admin/AdminEventsPage';
import AdminProjectsPage from '@/pages/admin/AdminProjectsPage';
import AdminRoundPage from '@/pages/admin/AdminRoundPage';
import AdminResultsPage from '@/pages/admin/AdminResultsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminQuestionsPage from '@/pages/admin/AdminQuestionsPage';

import { DEFAULT_EVENT_ID } from '@/services/eventService';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Nova Rota Principal: LOGIN ADMINISTRATIVO (/) */}
      <Route path="/" element={<AdminLoginPage />} />
      <Route path="/admin/login" element={<Navigate to="/" replace />} />

      {/* 2. Rotas Públicas de Votação com PublicLayout */}
      <Route element={<PublicLayout />}>
        {/* Entrada pública por evento e avaliação por projeto */}
        <Route path="/votar/:eventId" element={<PublicVotingPage />} />
        <Route path="/votar/:eventId/:projectId" element={<PublicVotingPage />} />

        {/* Rotas de compatibilidade com versões anteriores e atalhos de QR Code */}
        <Route path="/votar" element={<Navigate to={`/votar/${DEFAULT_EVENT_ID}`} replace />} />
        <Route path="/aguardando" element={<WaitingPage />} />
        <Route path="/avaliar" element={<EvaluationPage />} />
        <Route path="/confirmacao" element={<ConfirmationPage />} />
      </Route>

      {/* 3. Telão Oficial Único (16:9 Fullscreen sem sidebar) — Todas as rotas secundárias redirecionam para /telao */}
      <Route path="/telao" element={<BigScreenPresentationPage />} />
      <Route path="/qrcode" element={<Navigate to="/telao" replace />} />
      <Route path="/telao/qrcode" element={<Navigate to="/telao" replace />} />
      <Route path="/resultados/telao" element={<Navigate to="/telao" replace />} />
      <Route path="/ranking" element={<Navigate to="/telao" replace />} />

      {/* 4. Rotas Administrativas Protegidas com AdminLayout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/eventos" replace />} />
        <Route path="eventos" element={<AdminEventsPage />} />
        <Route path="projetos" element={<AdminProjectsPage />} />
        <Route path="perguntas" element={<AdminQuestionsPage />} />
        <Route path="criterios" element={<Navigate to="/admin/perguntas" replace />} />
        <Route path="votacao" element={<AdminRoundPage />} />
        <Route path="rodada" element={<Navigate to="/admin/votacao" replace />} />
        <Route path="resultados" element={<AdminResultsPage />} />
        <Route
          path="usuarios"
          element={
            <ProtectedRoute requiredRole="superadmin">
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="configuracoes" element={<AdminSettingsPage />} />
      </Route>

      {/* 5. Fallback para rota principal */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
