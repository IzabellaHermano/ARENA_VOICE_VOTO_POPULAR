-- ==============================================================================
-- ARENA VOICE — ETAPA 1: PATCH INCREMENTAL DE GESTÃO DE MÚLTIPLOS EVENTOS
-- ==============================================================================
-- IMPORTANTE: Este script é INCREMENTAL e NÃO apaga nenhum dado existente.
-- Ele apenas adiciona colunas opcionais à tabela public.events e apresenta
-- a estrutura opcional de permissões por evento (public.event_admins).
--
-- NÃO EXECUTAR AUTOMATICAMENTE. APENAS APÓS REVISÃO E APROVAÇÃO DO USUÁRIO.
-- ==============================================================================

-- 1. ADIÇÃO DE METADADOS OPCIONAIS NA TABELA public.events
-- Adiciona subtítulo, data do evento e banner personalizado (se não existirem)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS event_date text,
  ADD COLUMN IF NOT EXISTS banner_url text;

-- 2. AJUSTE DO CHECK CONSTRAINT DE STATUS (OPCIONAL)
-- Atualmente o status aceita ('draft', 'active', 'finished').
-- Se desejar permitir 'archived', pode-se atualizar o check:
-- ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
-- ALTER TABLE public.events ADD CONSTRAINT events_status_check 
--   CHECK (status IN ('draft', 'active', 'finished', 'archived'));

-- 3. PROPOSTA: TABELA DE VINCULAÇÃO ADMIN-EVENTO (RBAC POR EVENTO)
-- Permite que superadmins vinculem administradores e operadores a eventos específicos.
-- Enquanto esta tabela não for criada, administradores autenticados com public.is_admin()
-- têm acesso a todos os eventos como superusuários globais.

CREATE TABLE IF NOT EXISTS public.event_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('superadmin', 'admin', 'operator')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Ativa RLS para a tabela de vínculos
ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para event_admins
DROP POLICY IF EXISTS "Superadmins podem gerenciar vínculos de eventos" ON public.event_admins;
CREATE POLICY "Superadmins podem gerenciar vínculos de eventos"
  ON public.event_admins
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
        AND admin_profiles.role = 'superadmin'
        AND admin_profiles.active = true
    )
  );

DROP POLICY IF EXISTS "Usuários autenticados podem ver seus próprios vínculos" ON public.event_admins;
CREATE POLICY "Usuários autenticados podem ver seus próprios vínculos"
  ON public.event_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. ÍNDICES DE PERFORMANCE PARA MULTI-EVENTO
CREATE INDEX IF NOT EXISTS idx_projects_event_id ON public.projects(event_id);
CREATE INDEX IF NOT EXISTS idx_rounds_event_id ON public.rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_votes_event_id ON public.votes(event_id);
CREATE INDEX IF NOT EXISTS idx_results_event_id ON public.results(event_id);

