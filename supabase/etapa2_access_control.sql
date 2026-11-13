-- ==============================================================================
-- ARENA VOICE — ETAPA 2: CONTROLE DE ACESSO, RBAC E SEGURANÇA AVANÇADA (FINAL)
-- ==============================================================================
-- STATUS: NÃO EXECUTADO — AGUARDANDO AUTORIZAÇÃO EXPRESSA DO USUÁRIO
--
-- EXECUÇÃO TOTALMENTE TRANSACIONAL:
-- Todo o script está envolvido em um bloco BEGIN ... COMMIT.
-- Em caso de qualquer inconsistência, o PostgreSQL desfaz automaticamente
-- todas as operações, garantindo que o banco nunca fique em estado parcial.
--
-- REGRAS E BLINDAGENS DESTE PATCH:
-- 1. SIGILO ABSOLUTO DO VOTO (public.votes):
--    - Elimina "votes_select_own" e "votes_admin_all" que permitiam que admins vissem votos.
--    - Aplica "votes_select_strict_own": ESTRITAMENTE o próprio votante (voter_id = auth.uid()).
--    - NENHUM administrador (nem Superadmin) tem permissão de SELECT em votos individuais de outros.
--    - REVOKE INSERT, UPDATE, DELETE na tabela votes para clientes (voto somente via submit_vote).
-- 2. SEGURANÇA DE RESULTADOS AGREGADOS (public.results):
--    - Elimina "results_select_public" (que permitia leitura pública antes da hora).
--    - Admins autorizados consultam resultados em tempo real para condução do evento.
--    - Público/Telão só lê resultados se results_published = true OU contador durante rodada open.
-- 3. ISOLAMENTO MULTI-EVENTO (public.events, projects, rounds):
--    - Cria public.event_admins e índices de performance.
--    - Admin só lê e opera eventos, projetos e rodadas aos quais foi explicitamente vinculado.
--    - Superadmin mantém acesso global administrativo.
--    - Procedures open_round, close_round e prepare_next_round validadas com has_event_access().
-- 4. PRESERVAÇÃO INTEGRAL:
--    - Nenhuma tabela é dropada. Nenhum dado histórico de arena-voice-2026 é alterado ou excluído.
-- ==============================================================================

BEGIN;

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

COMMENT ON TABLE public.event_admins IS 'Mapeamento de autorizações: vincula administradores e operadores a eventos específicos';
COMMENT ON COLUMN public.event_admins.event_id IS 'ID do evento autorizado';
COMMENT ON COLUMN public.event_admins.user_id IS 'ID do usuário autorizado em auth.users';
COMMENT ON COLUMN public.event_admins.granted_by IS 'ID do Superadmin que concedeu a permissão';

-- ------------------------------------------------------------------------------
-- 2. ÍNDICES DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_event_admins_user_id ON public.event_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_event_admins_event_id ON public.event_admins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_admins_composite ON public.event_admins(user_id, event_id);

-- ------------------------------------------------------------------------------
-- 3. FUNÇÃO DE VERIFICAÇÃO ATÔMICA DE ACESSO: public.has_event_access(p_event_id text)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_event_access(p_event_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    -- 1. Superadmin possui acesso global irrestrito a todos os eventos
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
      AND active = true
      AND role = 'superadmin'
  )
  OR EXISTS (
    -- 2. Admin ou Operador vinculado diretamente ao evento em public.event_admins
    SELECT 1 FROM public.event_admins ea
    JOIN public.admin_profiles ap ON ap.id = ea.user_id
    WHERE ea.event_id = p_event_id
      AND ea.user_id = auth.uid()
      AND ap.active = true
  );
$$;

-- ------------------------------------------------------------------------------
-- 4. PROCEDURES ATÔMICAS DE CONCESSÃO E REVOGAÇÃO (APENAS SUPERADMIN)
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
  -- Valida se quem chamou é superadmin ativo
  if not public.is_superadmin() then
    raise exception 'Acesso negado: Apenas superadministradores podem conceder acesso a eventos.';
  end if;

  -- Valida existência do evento
  select exists(select 1 from public.events where id = p_event_id) into v_event_exists;
  if not v_event_exists then
    raise exception 'Evento "%" não encontrado.', p_event_id;
  end if;

  -- Valida se o usuário existe em admin_profiles e se está ativo
  select * into v_user_profile from public.admin_profiles where id = p_user_id;
  if not found then
    raise exception 'Administrador não encontrado no cadastro de perfis.';
  end if;

  if not v_user_profile.active then
    raise exception 'Não é permitido vincular eventos a um administrador inativo.';
  end if;

  -- Insere o relacionamento de forma idempotente
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
  -- Valida se quem chamou é superadmin ativo
  if not public.is_superadmin() then
    raise exception 'Acesso negado: Apenas superadministradores podem revogar acesso a eventos.';
  end if;

  -- Executa revogação
  delete from public.event_admins
  where event_id = p_event_id and user_id = p_user_id;

  -- Checa se o evento ficou sem administrador atribuído
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
-- 5. PROCEDURES OPERACIONAIS DE RODADAS COM CONTROLE DE ACESSO POR EVENTO
-- ------------------------------------------------------------------------------

-- 5.1 open_round com verificação has_event_access
CREATE OR REPLACE FUNCTION public.open_round(
  p_event_id text,
  p_project_id text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_new_round_id uuid;
  v_proj record;
  v_event record;
begin
  if not public.has_event_access(p_event_id) then
    raise exception 'Acesso negado: Você não possui permissão para administrar este evento.';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Evento % não encontrado.', p_event_id;
  end if;

  select * into v_proj from public.projects where id = p_project_id and event_id = p_event_id for share;
  if not found or not v_proj.active then
    raise exception 'Projeto % inexistente, inativo ou pertencente a outro evento.', p_project_id;
  end if;

  -- Encerra rodadas abertas anteriores do evento
  update public.rounds
  set status = 'closed', ended_at = now(), closed_at = now(), updated_at = now()
  where event_id = p_event_id and status = 'open';

  -- Cria nova rodada aberta
  insert into public.rounds (event_id, project_id, status, started_at, released_at)
  values (p_event_id, p_project_id, 'open', now(), now())
  returning id into v_new_round_id;

  -- Atualiza ponteiros do evento
  update public.events
  set current_round_id = v_new_round_id, current_project_id = p_project_id, updated_at = now()
  where id = p_event_id;

  return json_build_object('success', true, 'round_id', v_new_round_id);
end;
$$;

-- 5.2 close_round com verificação has_event_access
CREATE OR REPLACE FUNCTION public.close_round(
  p_event_id text,
  p_round_id uuid default null
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_event record;
  v_closed_round_id uuid;
begin
  if not public.has_event_access(p_event_id) then
    raise exception 'Acesso negado: Você não possui permissão para administrar este evento.';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Evento % não encontrado.', p_event_id;
  end if;

  if p_round_id is not null then
    update public.rounds
    set status = 'closed', ended_at = now(), closed_at = now(), updated_at = now()
    where id = p_round_id and event_id = p_event_id and status = 'open'
    returning id into v_closed_round_id;
  else
    update public.rounds
    set status = 'closed', ended_at = now(), closed_at = now(), updated_at = now()
    where event_id = p_event_id and status = 'open'
    returning id into v_closed_round_id;
  end if;

  update public.events
  set current_round_id = null, updated_at = now()
  where id = p_event_id;

  return json_build_object('success', true, 'round_id', coalesce(v_closed_round_id, p_round_id));
end;
$$;

-- 5.3 prepare_next_round com verificação has_event_access
CREATE OR REPLACE FUNCTION public.prepare_next_round(
  p_event_id text,
  p_next_project_id text default null
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_proj record;
  v_current_proj_id text;
  v_current_order int;
begin
  if not public.has_event_access(p_event_id) then
    raise exception 'Acesso negado: Você não possui permissão para administrar este evento.';
  end if;

  if p_next_project_id is not null and trim(p_next_project_id) <> '' then
    select * into v_proj from public.projects
    where id = p_next_project_id and event_id = p_event_id and active = true;
  else
    select current_project_id into v_current_proj_id from public.events where id = p_event_id;
    if v_current_proj_id is not null then
      select "order" into v_current_order from public.projects where id = v_current_proj_id and event_id = p_event_id;
    end if;

    select * into v_proj from public.projects
    where event_id = p_event_id and active = true and ("order" > coalesce(v_current_order, 0))
    order by "order" asc limit 1;

    if not found then
      select * into v_proj from public.projects
      where event_id = p_event_id and active = true
      order by "order" asc limit 1;
    end if;
  end if;

  if not found or not v_proj.active then
    raise exception 'Nenhum projeto ativo disponível para a próxima rodada.';
  end if;

  update public.rounds
  set status = 'closed', ended_at = now(), closed_at = now(), updated_at = now()
  where event_id = p_event_id and status = 'open';

  update public.events
  set current_round_id = null, current_project_id = v_proj.id, updated_at = now()
  where id = p_event_id;

  return json_build_object('success', true, 'project_id', v_proj.id);
end;
$$;

-- 5.4 get_admin_results com verificação has_event_access
CREATE OR REPLACE FUNCTION public.get_admin_results(
  p_event_id text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_results json;
begin
  if not (public.is_admin() and public.has_event_access(p_event_id)) then
    raise exception 'Acesso negado: Você não possui autorização para consultar os resultados deste evento.';
  end if;

  select json_agg(row_to_json(r)) into v_results
  from (
    select
      res.*,
      p.name as project_name,
      p.category as project_category,
      p.banner_url as project_banner,
      p."order" as project_order
    from public.results res
    join public.projects p on p.id = res.project_id
    where res.event_id = p_event_id
    order by res.average_general desc nulls last
  ) r;

  return json_build_object('success', true, 'results', coalesce(v_results, '[]'::json));
end;
$$;

-- 5.5 reconcile_results com verificação has_event_access
CREATE OR REPLACE FUNCTION public.reconcile_results(
  p_event_id text,
  p_project_id text default null
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_rec record;
  v_count int := 0;
begin
  if not (public.is_admin() and public.has_event_access(p_event_id)) then
    raise exception 'Acesso negado: Você não possui autorização para conciliar os resultados deste evento.';
  end if;

  for v_rec in
    select
      v.event_id,
      v.project_id,
      count(*) as total_votes,
      sum(coalesce(v.innovation_score, v.innovation)) as sum_inno,
      sum(coalesce(v.cptm_impact_score, v.impact)) as sum_imp,
      sum(coalesce(v.development_score, v.development)) as sum_dev
    from public.votes v
    where v.event_id = p_event_id
      and (p_project_id is null or v.project_id = p_project_id)
    group by v.event_id, v.project_id
  loop
    insert into public.results (
      id, event_id, project_id, total_votes, sum_innovation, sum_impact, sum_development,
      average_innovation, average_impact, average_development, average_general, percentage, popular_points, updated_at
    )
    values (
      v_rec.event_id || '_' || v_rec.project_id,
      v_rec.event_id,
      v_rec.project_id,
      v_rec.total_votes,
      v_rec.sum_inno,
      v_rec.sum_imp,
      v_rec.sum_dev,
      round(v_rec.sum_inno::numeric / v_rec.total_votes, 2),
      round(v_rec.sum_imp::numeric / v_rec.total_votes, 2),
      round(v_rec.sum_dev::numeric / v_rec.total_votes, 2),
      round((((v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)::numeric / 3.0) / v_rec.total_votes), 2),
      round(((((v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)::numeric / 3.0) / v_rec.total_votes) / 5.0) * 100.0, 2),
      round(((((v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)::numeric / 3.0) / v_rec.total_votes) / 5.0) * 20.0, 2),
      now()
    )
    on conflict (id) do update set
      total_votes = excluded.total_votes,
      sum_innovation = excluded.sum_innovation,
      sum_impact = excluded.sum_impact,
      sum_development = excluded.sum_development,
      average_innovation = excluded.average_innovation,
      average_impact = excluded.average_impact,
      average_development = excluded.average_development,
      average_general = excluded.average_general,
      percentage = excluded.percentage,
      popular_points = excluded.popular_points,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  return json_build_object('success', true, 'reconciled_projects', v_count);
end;
$$;

-- ------------------------------------------------------------------------------
-- 6. BLINDAGEM DA TABELA public.votes (SIGILO ABSOLUTO DO VOTO)
-- ------------------------------------------------------------------------------
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 6.1 Remove TODAS as políticas antigas ou permissivas
DROP POLICY IF EXISTS "votes_select_own" ON public.votes;
DROP POLICY IF EXISTS "votes_admin_all" ON public.votes;
DROP POLICY IF EXISTS "votes_select_public" ON public.votes;
DROP POLICY IF EXISTS "votes_select_strict_own" ON public.votes;
DROP POLICY IF EXISTS "votes_insert_direct" ON public.votes;
DROP POLICY IF EXISTS "votes_update_direct" ON public.votes;
DROP POLICY IF EXISTS "votes_delete_direct" ON public.votes;

-- 6.2 Política de Leitura ÚNICA: ESTRITAMENTE o próprio votante
-- Administradores NÃO podem ler votos de outros participantes.
CREATE POLICY "votes_select_strict_own"
  ON public.votes
  FOR SELECT
  TO authenticated
  USING (
    voter_id = auth.uid()
  );

-- 6.3 Privilégios de Tabela: Revoga mutações diretas em votes para a API
-- Votos são gravados EXCLUSIVAMENTE via public.submit_vote() (SECURITY DEFINER)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.votes FROM anon, authenticated, public;
GRANT SELECT ON TABLE public.votes TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. BLINDAGEM DA TABELA public.results (APURAÇÃO AGREGADA SEGURA)
-- ------------------------------------------------------------------------------
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas
DROP POLICY IF EXISTS "results_select_public" ON public.results;
DROP POLICY IF EXISTS "results_select_policy" ON public.results;

-- Nova política de resultados agregados
CREATE POLICY "results_select_policy"
  ON public.results
  FOR SELECT
  TO public
  USING (
    -- 1. Administrador autorizado no evento: acesso irrestrito para condução
    (public.is_admin() AND public.has_event_access(event_id))
    -- 2. Público / Telão: após publicação oficial dos resultados do evento
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = results.event_id
        AND e.results_published = true
    )
    -- 3. Telão / Medidor: durante a rodada aberta do projeto sob avaliação
    OR EXISTS (
      SELECT 1 FROM public.rounds r
      WHERE r.event_id = results.event_id
        AND r.project_id = results.project_id
        AND r.status = 'open'
    )
  );

-- ------------------------------------------------------------------------------
-- 8. BLINDAGEM DA TABELA public.events
-- ------------------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_public" ON public.events;
DROP POLICY IF EXISTS "events_all_admin" ON public.events;
DROP POLICY IF EXISTS "events_select_authorized" ON public.events;
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_admin_mutation" ON public.events;
DROP POLICY IF EXISTS "events_superadmin_insert" ON public.events;
DROP POLICY IF EXISTS "events_superadmin_delete" ON public.events;

-- Leitura de Eventos
CREATE POLICY "events_select_policy"
  ON public.events
  FOR SELECT
  TO public
  USING (
    CASE
      -- Administrador: visualiza apenas os eventos autorizados (Superadmin vê todos)
      WHEN public.is_admin() THEN public.has_event_access(id)
      -- Público / Votantes: visualizam apenas eventos ativos ou finalizados
      ELSE status IN ('active', 'finished')
    END
  );

-- Atualização de Eventos
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

-- Inserção e Exclusão de Eventos: Exclusivos de Superadmin
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
-- 9. BLINDAGEM DA TABELA public.projects
-- ------------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_public" ON public.projects;
DROP POLICY IF EXISTS "projects_all_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_mutation" ON public.projects;

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
-- 10. BLINDAGEM DA TABELA public.rounds
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
-- 11. RLS DA TABELA public.event_admins
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
-- 12. PERMISSÕES DE EXECUÇÃO DAS PROCEDURES (GRANT / REVOKE)
-- ------------------------------------------------------------------------------
-- 12.1 Gestão de Acessos a Eventos (Exclusivo Superadmin via lógica interna)
REVOKE EXECUTE ON FUNCTION public.grant_event_access(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.grant_event_access(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.revoke_event_access(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.revoke_event_access(text, uuid) TO authenticated;

-- 12.2 Verificação de Acesso a Eventos
REVOKE EXECUTE ON FUNCTION public.has_event_access(text) FROM public;
GRANT EXECUTE ON FUNCTION public.has_event_access(text) TO authenticated, anon;

-- 12.3 Operações de Rodada (Exclusivo Administradores Vinculados)
REVOKE EXECUTE ON FUNCTION public.open_round(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.open_round(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.close_round(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.close_round(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.prepare_next_round(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.prepare_next_round(text, text) TO authenticated;

-- 12.4 Auditoria e Conciliação de Resultados
REVOKE EXECUTE ON FUNCTION public.get_admin_results(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_admin_results(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reconcile_results(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.reconcile_results(text, text) TO authenticated;

COMMIT;
