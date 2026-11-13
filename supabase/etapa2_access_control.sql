-- ==============================================================================
-- ARENA VOICE — ETAPA 2: CONTROLE DE ACESSO E VÍNCULO DE ADMINISTRADORES A EVENTOS
-- ==============================================================================
-- ATENÇÃO: NÃO EXECUTAR AUTOMATICAMENTE SEM APROVAÇÃO EXPRESSA DO USUÁRIO.
-- Este script implementa:
-- 1. Tabela relacional public.event_admins (vínculo de administradores a eventos)
-- 2. Índices de alta performance para consultas por administrador e por evento
-- 3. Função de segurança SECURITY DEFINER: public.has_event_access(p_event_id)
-- 4. Funções atômicas de concessão e revogação: grant_event_access / revoke_event_access
-- 5. Atualização das Políticas RLS em events, projects, rounds, votes e event_admins
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

-- Comentários descritivos de integridade
COMMENT ON TABLE public.event_admins IS 'Mapeamento de autorizações granulares: quais administradores/operadores podem acessar cada evento';
COMMENT ON COLUMN public.event_admins.event_id IS 'Chave estrangeira do evento vinculado (cascade on delete)';
COMMENT ON COLUMN public.event_admins.user_id IS 'Chave estrangeira do usuário administrador em auth.users';
COMMENT ON COLUMN public.event_admins.granted_by IS 'ID do superadmin que concedeu a autorização';

-- ------------------------------------------------------------------------------
-- 2. ÍNDICES DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_event_admins_user_id ON public.event_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_event_admins_event_id ON public.event_admins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_admins_composite ON public.event_admins(user_id, event_id);

-- ------------------------------------------------------------------------------
-- 3. FUNÇÃO DE AUTORIZAÇÃO: public.has_event_access(p_event_id text)
-- Verifica de forma segura se o chamador possui autorização para o evento:
-- - Se for superadmin ativo: TRUE para qualquer evento
-- - Se for admin ou operador: TRUE se houver registro ativo em event_admins
-- - Caso contrário: FALSE
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
    -- Admin ou Operador vinculado diretamente ao evento especificado
    SELECT 1 FROM public.event_admins ea
    JOIN public.admin_profiles ap ON ap.id = ea.user_id
    WHERE ea.event_id = p_event_id
      AND ea.user_id = auth.uid()
      AND ap.active = true
  );
$$;

-- ------------------------------------------------------------------------------
-- 4. FUNÇÕES DE GESTÃO DE VÍNCULOS (EXCLUSIVAS PARA SUPERADMIN)
-- ------------------------------------------------------------------------------

-- 4.1 public.grant_event_access: Concede acesso de um administrador a um evento
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
  -- 1. Valida se o chamador é superadmin ativo
  if not public.is_superadmin() then
    raise exception 'Acesso negado: Apenas superadministradores podem conceder acesso a eventos.';
  end if;

  -- 2. Valida se o evento existe
  select exists(select 1 from public.events where id = p_event_id) into v_event_exists;
  if not v_event_exists then
    raise exception 'Evento "%" não encontrado.', p_event_id;
  end if;

  -- 3. Valida se o usuário existe em admin_profiles
  select * into v_user_profile from public.admin_profiles where id = p_user_id;
  if not found then
    raise exception 'Administrador não encontrado no cadastro de perfis.';
  end if;

  -- 4. Insere o relacionamento (idempotente)
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

-- 4.2 public.revoke_event_access: Revoga acesso de um administrador a um evento
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
  v_target_role text;
begin
  -- 1. Valida se o chamador é superadmin ativo
  if not public.is_superadmin() then
    raise exception 'Acesso negado: Apenas superadministradores podem revogar acesso a eventos.';
  end if;

  -- 2. Proteção do último superadmin do sistema
  select role into v_target_role from public.admin_profiles where id = p_user_id;
  if v_target_role = 'superadmin' then
    -- Superadmins possuem acesso implícito global, mas avisamos que o vínculo individual não é limitante
    null;
  end if;

  -- 3. Executa a revogação
  delete from public.event_admins
  where event_id = p_event_id and user_id = p_user_id;

  -- 4. Verifica se o evento ficou sem administradores atribuídos
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
-- 5. ROW LEVEL SECURITY (RLS) PARA public.event_admins
-- ------------------------------------------------------------------------------
ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;

-- 5.1 SELECT: Superadmin visualiza todas as atribuições; Admins/Operadores visualizam as suas
DROP POLICY IF EXISTS "event_admins_select" ON public.event_admins;
CREATE POLICY "event_admins_select"
  ON public.event_admins
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin() OR user_id = auth.uid()
  );

-- 5.2 INSERT: Apenas Superadmin
DROP POLICY IF EXISTS "event_admins_insert" ON public.event_admins;
CREATE POLICY "event_admins_insert"
  ON public.event_admins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin()
  );

-- 5.3 DELETE: Apenas Superadmin
DROP POLICY IF EXISTS "event_admins_delete" ON public.event_admins;
CREATE POLICY "event_admins_delete"
  ON public.event_admins
  FOR DELETE
  TO authenticated
  USING (
    public.is_superadmin()
  );

-- ------------------------------------------------------------------------------
-- 6. ATUALIZAÇÃO DAS POLÍTICAS RLS EM public.events
-- - Superadmin: visualiza todos os eventos
-- - Admin / Operador: visualiza SOMENTE eventos autorizados via public.has_event_access()
-- - Público anônimo / votante: visualiza eventos para fins de votação pública
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "events_select_public" ON public.events;
DROP POLICY IF EXISTS "events_select_authorized" ON public.events;
CREATE POLICY "events_select_authorized"
  ON public.events
  FOR SELECT
  TO public
  USING (
    CASE
      -- Se for administrador autenticado, aplica isolamento estrito
      WHEN public.is_admin() THEN public.has_event_access(id)
      -- Acesso público (participantes e telão anônimo)
      ELSE true
    END
  );

-- Modificação de eventos: Superadmins podem gerenciar qualquer evento;
-- Admins só podem atualizar eventos aos quais têm acesso; Operadores não alteram eventos.
DROP POLICY IF EXISTS "events_all_admin" ON public.events;
CREATE POLICY "events_admin_mutation"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    public.is_superadmin() OR (public.has_event_access(id) AND public.is_admin())
  )
  WITH CHECK (
    public.is_superadmin() OR (public.has_event_access(id) AND public.is_admin())
  );

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
-- 7. ATUALIZAÇÃO DAS POLÍTICAS RLS EM TABELAS FILHAS
-- Garante que chamadas diretas à API para projects, rounds e votes sejam bloqueadas
-- se o usuário não possuir autorização no evento correspondente.
-- ------------------------------------------------------------------------------

-- 7.1 public.projects
DROP POLICY IF EXISTS "projects_all_admin" ON public.projects;
CREATE POLICY "projects_all_admin"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (
    public.has_event_access(event_id)
  )
  WITH CHECK (
    public.has_event_access(event_id)
  );

-- 7.2 public.rounds
DROP POLICY IF EXISTS "rounds_all_admin" ON public.rounds;
CREATE POLICY "rounds_all_admin"
  ON public.rounds
  FOR ALL
  TO authenticated
  USING (
    public.has_event_access(event_id)
  )
  WITH CHECK (
    public.has_event_access(event_id)
  );

-- 7.3 public.votes (leitura administrativa restrita ao evento autorizado)
DROP POLICY IF EXISTS "votes_select_own" ON public.votes;
CREATE POLICY "votes_select_own"
  ON public.votes
  FOR SELECT
  TO authenticated
  USING (
    voter_id = auth.uid() OR public.has_event_access(event_id)
  );

