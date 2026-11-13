-- ==============================================================================
-- ARENA VOICE — ETAPA 2: CONTROLE DE ACESSO, RBAC E SEGURANÇA AVANÇADA (REVISADO)
-- ==============================================================================
-- ATENÇÃO: NÃO EXECUTAR AUTOMATICAMENTE. AGUARDANDO AUTORIZAÇÃO DO USUÁRIO.
--
-- REVISÕES DE SEGURANÇA IMPLEMENTADAS NESTA VERSÃO:
-- 1. SIGILO ABSOLUTO DO VOTO (public.votes):
--    - Administradores NÃO possuem permissão de SELECT em votos individuais de outros.
--    - Votantes consultam ESTRITAMENTE a sua própria linha (voter_id = auth.uid()).
--    - Inserção direta bloqueada: ocorre exclusivamente via procedure submit_vote().
-- 2. SEGURANÇA DE RESULTADOS AGREGADOS (public.results):
--    - Administradores autorizados leem resultados consolidados em tempo real.
--    - Público/Telão lê resultados finais apenas se results_published = true.
--    - Público/Telão lê totais da rodada ativa apenas enquanto o status for 'open'.
-- 3. ISOLAMENTO E LEITURA PÚBLICA DE EVENTOS (public.events):
--    - Administrador logado enxerga SOMENTE eventos autorizados via event_admins.
--    - Público geral acessa apenas eventos ativos ou finalizados ('active', 'finished').
-- 4. PERMISSÕES RESTRITAS POR PAPEL:
--    - Superadmin: controle global, concessão/revogação de vínculos, criação/exclusão de eventos.
--    - Admin: opera exclusivamente eventos aos quais foi atribuído.
--    - Operator: acompanhamento operacional estrito no evento atribuído, sem mutação cadastral.
-- 5. INTEGRIDADE DAS PROCEDURES:
--    - search_path explícito (public, pg_temp) contra ataques de schema hijacking.
--    - Validação de administrador ativo antes de vincular eventos.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA DE RELACIONAMENTO: public.event_admins
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_admins_event_user UNIQUE (event_id, user_id)
);

COMMENT ON TABLE public.event_admins IS 'Mapeamento de autorizações granulares: vincula administradores e operadores a eventos específicos';
COMMENT ON COLUMN public.event_admins.event_id IS 'Identificador do evento vinculado';
COMMENT ON COLUMN public.event_admins.user_id IS 'Identificador do administrador vinculado';
COMMENT ON COLUMN public.event_admins.granted_by IS 'Identificador do Superadmin que autorizou o vínculo';

-- ------------------------------------------------------------------------------
-- 2. ÍNDICES DE ALTA PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_event_admins_user_id ON public.event_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_event_admins_event_id ON public.event_admins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_admins_composite ON public.event_admins(user_id, event_id);

-- ------------------------------------------------------------------------------
-- 3. FUNÇÃO DE VERIFICAÇÃO ATÔMICA DE ACESSO: public.has_event_access(p_event_id text)
-- Retorna true se:
-- a) O usuário autenticado for Superadmin ativo (acesso global).
-- b) O usuário for Admin ou Operador ativo vinculado diretamente na tabela event_admins.
-- Retorna false caso contrário.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_event_access(p_event_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    -- Superadmin possui acesso global irrestrito a todos os eventos
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
      AND active = true
      AND role = 'superadmin'
  )
  OR EXISTS (
    -- Admin ou Operador vinculado diretamente ao evento em public.event_admins
    SELECT 1 FROM public.event_admins ea
    JOIN public.admin_profiles ap ON ap.id = ea.user_id
    WHERE ea.event_id = p_event_id
      AND ea.user_id = auth.uid()
      AND ap.active = true
  );
$$;

-- ------------------------------------------------------------------------------
-- 4. PROCEDURES ATÔMICAS DE CONCESSÃO E REVOGAÇÃO (EXCLUSIVAS DE SUPERADMIN)
-- ------------------------------------------------------------------------------

-- 4.1 public.grant_event_access
CREATE OR REPLACE FUNCTION public.grant_event_access(
  p_event_id text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_event_exists boolean;
  v_user_profile record;
  v_assignment_id uuid;
begin
  -- 1. Verifica se quem chamou é superadmin ativo
  if not public.is_superadmin() then
    raise exception 'Acesso negado: Apenas superadministradores podem conceder acesso a eventos.';
  end if;

  -- 2. Valida se o evento existe
  select exists(select 1 from public.events where id = p_event_id) into v_event_exists;
  if not v_event_exists then
    raise exception 'Evento "%" não encontrado.', p_event_id;
  end if;

  -- 3. Valida se o usuário existe em admin_profiles e está ativo
  select * into v_user_profile from public.admin_profiles where id = p_user_id;
  if not found then
    raise exception 'Administrador não encontrado no cadastro de perfis.';
  end if;

  if not v_user_profile.active then
    raise exception 'Não é permitido vincular eventos a um administrador inativo.';
  end if;

  -- 4. Insere o relacionamento de forma idempotente
  insert into public.event_admins (event_id, user_id, granted_by, created_at)
  values (p_event_id, p_user_id, auth.uid(), now())
  on conflict (event_id, user_id) do nothing
  returning id into v_assignment_id;

  return json_build_object(
    'success', true,
    'event_id', p_event_id,
    'user_id', p_user_id,
    'assignment_id', coalesce(v_assignment_id::text, 'already_granted')
  );
end;
$$;

-- 4.2 public.revoke_event_access
CREATE OR REPLACE FUNCTION public.revoke_event_access(
  p_event_id text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_remaining_admins int;
begin
  -- 1. Verifica se quem chamou é superadmin ativo
  if not public.is_superadmin() then
    raise exception 'Acesso negado: Apenas superadministradores podem revogar acesso a eventos.';
  end if;

  -- 2. Executa a revogação
  delete from public.event_admins
  where event_id = p_event_id and user_id = p_user_id;

  -- 3. Verifica se o evento ficou sem administradores atribuídos
  select count(*) into v_remaining_admins
  from public.event_admins
  where event_id = p_event_id;

  return json_build_object(
    'success', true,
    'event_id', p_event_id,
    'user_id', p_user_id,
    'remaining_admins', v_remaining_admins,
    'will_orphan_event', (v_remaining_admins = 0)
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. RLS DA TABELA public.event_admins
-- ------------------------------------------------------------------------------
ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_admins_select" ON public.event_admins;
CREATE POLICY "event_admins_select"
  ON public.event_admins
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin() OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "event_admins_insert" ON public.event_admins;
CREATE POLICY "event_admins_insert"
  ON public.event_admins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin()
  );

DROP POLICY IF EXISTS "event_admins_delete" ON public.event_admins;
CREATE POLICY "event_admins_delete"
  ON public.event_admins
  FOR DELETE
  TO authenticated
  USING (
    public.is_superadmin()
  );

-- ------------------------------------------------------------------------------
-- 6. RLS DA TABELA public.votes — SIGILO ABSOLUTO DO VOTO
-- IMPORTANTE: Nenhum administrador pode consultar os votos individuais de outros.
-- ------------------------------------------------------------------------------
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Remove todas as políticas antigas ou permissivas
DROP POLICY IF EXISTS "votes_select_own" ON public.votes;
DROP POLICY IF EXISTS "votes_all_admin" ON public.votes;
DROP POLICY IF EXISTS "votes_select_public" ON public.votes;
DROP POLICY IF EXISTS "votes_select_strict_own" ON public.votes;

-- Apenas o próprio votante pode consultar seu voto (ex: para checkUserVote)
CREATE POLICY "votes_select_strict_own"
  ON public.votes
  FOR SELECT
  TO authenticated
  USING (
    voter_id = auth.uid()
  );

-- Escrita direta bloqueada via RLS (votos só entram pela função submit_vote)
DROP POLICY IF EXISTS "votes_insert_direct" ON public.votes;
DROP POLICY IF EXISTS "votes_update_direct" ON public.votes;
DROP POLICY IF EXISTS "votes_delete_direct" ON public.votes;

-- ------------------------------------------------------------------------------
-- 7. RLS DA TABELA public.results — APURAÇÃO AGREGADA SEGURA
-- ------------------------------------------------------------------------------
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "results_select_public" ON public.results;
DROP POLICY IF EXISTS "results_select_policy" ON public.results;

CREATE POLICY "results_select_policy"
  ON public.results
  FOR SELECT
  TO public
  USING (
    -- 1. Administrador autorizado no evento: acesso irrestrito aos resultados do seu evento
    (public.is_admin() AND public.has_event_access(event_id))
    -- 2. Acesso público / telão: somente quando os resultados foram oficialmente publicados
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = results.event_id
        AND e.results_published = true
    )
    -- 3. Acesso público / telão ao contador de votos da rodada ativamente aberta
    OR EXISTS (
      SELECT 1 FROM public.rounds r
      WHERE r.event_id = results.event_id
        AND r.project_id = results.project_id
        AND r.status = 'open'
    )
  );

-- ------------------------------------------------------------------------------
-- 8. RLS DA TABELA public.events — ISOLAMENTO POR EVENTO E LEITURA PÚBLICA
-- ------------------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_public" ON public.events;
DROP POLICY IF EXISTS "events_select_authorized" ON public.events;
DROP POLICY IF EXISTS "events_select_policy" ON public.events;

CREATE POLICY "events_select_policy"
  ON public.events
  FOR SELECT
  TO public
  USING (
    CASE
      -- Administrador: visualiza apenas os eventos autorizados (Superadmin vê todos)
      WHEN public.is_admin() THEN public.has_event_access(id)
      -- Público / Votantes: visualizam apenas eventos em andamento ou finalizados
      ELSE status IN ('active', 'finished')
    END
  );

-- Mutações em events
DROP POLICY IF EXISTS "events_all_admin" ON public.events;
DROP POLICY IF EXISTS "events_admin_mutation" ON public.events;
DROP POLICY IF EXISTS "events_superadmin_insert" ON public.events;
DROP POLICY IF EXISTS "events_superadmin_delete" ON public.events;

-- Atualização: Superadmin ou Admin do evento (Operadores não alteram eventos)
CREATE POLICY "events_admin_mutation"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    public.is_superadmin() OR (
      public.has_event_access(id) AND EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE id = auth.uid() AND active = true AND role IN ('superadmin', 'admin')
      )
    )
  )
  WITH CHECK (
    public.is_superadmin() OR (
      public.has_event_access(id) AND EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE id = auth.uid() AND active = true AND role IN ('superadmin', 'admin')
      )
    )
  );

-- Criação e Exclusão: Exclusivas do Superadmin
CREATE POLICY "events_superadmin_insert"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin()
  );

CREATE POLICY "events_superadmin_delete"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (
    public.is_superadmin()
  );

-- ------------------------------------------------------------------------------
-- 9. RLS DA TABELA public.projects
-- ------------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_public" ON public.projects;
DROP POLICY IF EXISTS "projects_all_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_mutation" ON public.projects;

-- Leitura: Administrador vê do seu evento; Público vê projetos ativos de eventos ativos/finalizados
CREATE POLICY "projects_select_policy"
  ON public.projects
  FOR SELECT
  TO public
  USING (
    CASE
      WHEN public.is_admin() THEN public.has_event_access(event_id)
      ELSE active = true AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = projects.event_id AND e.status IN ('active', 'finished')
      )
    END
  );

-- Mutações (INSERT, UPDATE, DELETE): Superadmin ou Admin vinculado (Operador não altera projetos)
CREATE POLICY "projects_admin_mutation"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (
    public.has_event_access(event_id) AND EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND active = true AND role IN ('superadmin', 'admin')
    )
  )
  WITH CHECK (
    public.has_event_access(event_id) AND EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND active = true AND role IN ('superadmin', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- 10. RLS DA TABELA public.rounds
-- ------------------------------------------------------------------------------
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rounds_select_public" ON public.rounds;
DROP POLICY IF EXISTS "rounds_all_admin" ON public.rounds;
DROP POLICY IF EXISTS "rounds_select_policy" ON public.rounds;

CREATE POLICY "rounds_select_policy"
  ON public.rounds
  FOR SELECT
  TO public
  USING (
    CASE
      WHEN public.is_admin() THEN public.has_event_access(event_id)
      ELSE EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = rounds.event_id AND e.status IN ('active', 'finished')
      )
    END
  );

-- ------------------------------------------------------------------------------
-- 11. PRIVILÉGIOS DE EXECUÇÃO DAS PROCEDURES
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.grant_event_access(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.grant_event_access(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.revoke_event_access(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.revoke_event_access(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_event_access(text) FROM public;
GRANT EXECUTE ON FUNCTION public.has_event_access(text) TO authenticated, anon;
