-- =============================================================================
-- ARENA VOICE — ETAPA 2
-- CONTROLE DE ACESSO, RBAC, ISOLAMENTO MULTI-EVENTO E SEGURANÇA
--
-- DIRETRIZES FUNDAMENTAIS:
-- 1. Este script é transacional (BEGIN / COMMIT). Se qualquer validação falhar,
--    nenhuma modificação persistirá.
-- 2. Não apaga projetos, votos históricos, rodadas ou resultados existentes.
-- 3. Garante o sigilo do voto: administradores NÃO possuem permissão de SELECT
--    direto na tabela public.votes. O acesso a resultados se dá exclusivamente
--    por consolidação matemática agregada (public.results e get_admin_results).
-- 4. O gerenciamento de perfis administrativos é protegido e restrito ao superadmin.
-- 5. Atualização atômica do cache de esquema do PostgREST ao final via NOTIFY.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 0. CRIAÇÃO DA FUNÇÃO ADMINISTRATIVA DE GESTÃO DE PERFIS (admin_manage_profile)
-- =============================================================================

-- Implementação segura requerida pelo frontend (src/services/adminUsersService.ts).
-- Permite que superadministradores gerenciem perfis em public.admin_profiles
-- com regras estritas de proteção e sem manipulação indevida de auth.users.

CREATE OR REPLACE FUNCTION public.admin_manage_profile(
  p_action text,
  p_user_id uuid,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_role text DEFAULT 'operator',
  p_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_caller_active boolean;
  v_target_profile record;
  v_superadmin_count integer;
  v_final_active boolean;
  v_final_role text;
BEGIN
  -- 1. Validação de autenticação da sessão do usuário chamador
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: sessão inválida ou não autenticada.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação de perfil administrativo do chamador: estritamente superadmin ativo
  SELECT role, active
  INTO v_caller_role, v_caller_active
  FROM public.admin_profiles
  WHERE id = v_caller_id;

  IF NOT FOUND OR v_caller_active IS DISTINCT FROM true OR v_caller_role <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadministradores ativos possuem permissão para gerenciar perfis.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Validação dos parâmetros obrigatórios de entrada
  IF p_action IS NULL OR trim(p_action) = '' THEN
    RAISE EXCEPTION 'Parâmetro obrigatório ausente: p_action.'
      USING ERRCODE = '22023';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Parâmetro obrigatório ausente: p_user_id.'
      USING ERRCODE = '22023';
  END IF;

  IF p_role IS NOT NULL AND p_role NOT IN ('superadmin', 'admin', 'operator') THEN
    RAISE EXCEPTION 'Papel de acesso inválido: %. Valores aceitos: superadmin, admin ou operator.', p_role
      USING ERRCODE = '22023';
  END IF;

  -- 4. Busca o registro atual do perfil alvo (se existir)
  SELECT *
  INTO v_target_profile
  FROM public.admin_profiles
  WHERE id = p_user_id;

  -- 5. Regras de salvaguarda do superadministrador e proteção do último superadmin ativo
  IF FOUND AND v_target_profile.role = 'superadmin' AND v_target_profile.active = true THEN
    -- Determina o estado final pretendido para ativação e papel
    v_final_active := CASE
      WHEN p_action = 'delete' THEN false
      WHEN p_action = 'toggle_active' THEN COALESCE(p_active, NOT v_target_profile.active)
      WHEN p_action = 'set_active' THEN COALESCE(p_active, false)
      WHEN p_action IN ('create', 'upsert', 'update') AND p_active IS NOT NULL THEN p_active
      ELSE v_target_profile.active
    END;

    v_final_role := CASE
      WHEN p_action IN ('create', 'upsert', 'update') AND p_role IS NOT NULL THEN p_role
      ELSE v_target_profile.role
    END;

    -- Se a operação resultar na perda do status de superadmin ativo para este usuário:
    IF v_final_active = false OR v_final_role <> 'superadmin' THEN
      SELECT count(*)
      INTO v_superadmin_count
      FROM public.admin_profiles
      WHERE role = 'superadmin'
        AND active = true;

      IF v_superadmin_count <= 1 THEN
        RAISE EXCEPTION 'Operação bloqueada: não é permitido desativar, rebaixar ou excluir o único superadministrador ativo do sistema.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  -- 6. Execução atômica da ação solicitada
  IF p_action IN ('create', 'upsert') THEN
    -- Para cadastro inicial, valida existência da identidade na tabela de autenticação
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      RAISE EXCEPTION 'Usuário % não encontrado no catálogo de autenticação (auth.users). Crie a conta antes de conceder perfil administrativo.', p_user_id
        USING ERRCODE = 'P0002';
    END IF;

    IF (p_name IS NULL OR trim(p_name) = '') AND v_target_profile.name IS NULL THEN
      RAISE EXCEPTION 'O nome do administrador é obrigatório para cadastro.'
        USING ERRCODE = '22023';
    END IF;

    IF (p_email IS NULL OR trim(p_email) = '') AND v_target_profile.email IS NULL THEN
      RAISE EXCEPTION 'O e-mail do administrador é obrigatório para cadastro.'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.admin_profiles (
      id,
      name,
      email,
      role,
      active,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      trim(COALESCE(p_name, v_target_profile.name)),
      lower(trim(COALESCE(p_email, v_target_profile.email))),
      COALESCE(p_role, 'operator'),
      COALESCE(p_active, true),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = CASE WHEN p_name IS NOT NULL AND trim(p_name) <> '' THEN trim(p_name) ELSE public.admin_profiles.name END,
      email = CASE WHEN p_email IS NOT NULL AND trim(p_email) <> '' THEN lower(trim(p_email)) ELSE public.admin_profiles.email END,
      role = CASE WHEN p_role IS NOT NULL THEN p_role ELSE public.admin_profiles.role END,
      active = CASE WHEN p_active IS NOT NULL THEN p_active ELSE public.admin_profiles.active END,
      updated_at = now()
    RETURNING * INTO v_target_profile;

    RETURN json_build_object(
      'success', true,
      'action', p_action,
      'id', v_target_profile.id,
      'name', v_target_profile.name,
      'email', v_target_profile.email,
      'role', v_target_profile.role,
      'active', v_target_profile.active,
      'user', json_build_object(
        'id', v_target_profile.id,
        'name', v_target_profile.name,
        'email', v_target_profile.email,
        'role', v_target_profile.role,
        'active', v_target_profile.active,
        'created_at', v_target_profile.created_at,
        'updated_at', v_target_profile.updated_at
      )
    );

  ELSIF p_action = 'update' THEN
    IF v_target_profile.id IS NULL THEN
      RAISE EXCEPTION 'Perfil administrativo % não encontrado para atualização.', p_user_id
        USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.admin_profiles
    SET name = CASE WHEN p_name IS NOT NULL AND trim(p_name) <> '' THEN trim(p_name) ELSE public.admin_profiles.name END,
        email = CASE WHEN p_email IS NOT NULL AND trim(p_email) <> '' THEN lower(trim(p_email)) ELSE public.admin_profiles.email END,
        role = CASE WHEN p_role IS NOT NULL THEN p_role ELSE public.admin_profiles.role END,
        active = CASE WHEN p_active IS NOT NULL THEN p_active ELSE public.admin_profiles.active END,
        updated_at = now()
    WHERE id = p_user_id
    RETURNING * INTO v_target_profile;

    RETURN json_build_object(
      'success', true,
      'action', 'update',
      'id', v_target_profile.id,
      'name', v_target_profile.name,
      'email', v_target_profile.email,
      'role', v_target_profile.role,
      'active', v_target_profile.active,
      'user', json_build_object(
        'id', v_target_profile.id,
        'name', v_target_profile.name,
        'email', v_target_profile.email,
        'role', v_target_profile.role,
        'active', v_target_profile.active,
        'created_at', v_target_profile.created_at,
        'updated_at', v_target_profile.updated_at
      )
    );

  ELSIF p_action = 'toggle_active' THEN
    IF v_target_profile.id IS NULL THEN
      RAISE EXCEPTION 'Perfil administrativo % não encontrado para alteração de status.', p_user_id
        USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.admin_profiles
    SET active = COALESCE(p_active, NOT active),
        updated_at = now()
    WHERE id = p_user_id
    RETURNING * INTO v_target_profile;

    RETURN json_build_object(
      'success', true,
      'action', 'toggle_active',
      'id', v_target_profile.id,
      'active', v_target_profile.active
    );

  ELSIF p_action = 'set_active' THEN
    IF v_target_profile.id IS NULL THEN
      RAISE EXCEPTION 'Perfil administrativo % não encontrado para alteração de status.', p_user_id
        USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.admin_profiles
    SET active = COALESCE(p_active, false),
        updated_at = now()
    WHERE id = p_user_id
    RETURNING * INTO v_target_profile;

    RETURN json_build_object(
      'success', true,
      'action', 'set_active',
      'id', v_target_profile.id,
      'active', v_target_profile.active
    );

  ELSIF p_action = 'delete' THEN
    IF v_target_profile.id IS NULL THEN
      RAISE EXCEPTION 'Perfil administrativo % não encontrado para exclusão.', p_user_id
        USING ERRCODE = 'P0002';
    END IF;

    -- Limpa registros em event_admins antes de excluir o perfil administrativo
    DELETE FROM public.event_admins
    WHERE user_id = p_user_id;

    -- Remove o perfil administrativo (preserva a credencial em auth.users intacta)
    DELETE FROM public.admin_profiles
    WHERE id = p_user_id;

    RETURN json_build_object(
      'success', true,
      'action', 'delete',
      'deleted_id', p_user_id
    );

  ELSE
    RAISE EXCEPTION 'Ação desconhecida: %. Utilize create, upsert, update, toggle_active, set_active ou delete.', p_action
      USING ERRCODE = '22023';
  END IF;
END;
$$;

-- =============================================================================
-- 0.1 PRÉ-VALIDAÇÃO DO BANCO DE DADOS
-- =============================================================================

DO $$
DECLARE
  v_missing text;
  v_fn regprocedure;
  v_owner_ok boolean;
  v_path_ok boolean;
  v_required_columns text[] := ARRAY[
    'events.id',
    'events.status',
    'events.current_round_id',
    'events.current_project_id',
    'events.results_published',
    'projects.id',
    'projects.event_id',
    'projects.active',
    'projects.order',
    'projects.name',
    'projects.category',
    'projects.banner_url',
    'rounds.id',
    'rounds.event_id',
    'rounds.project_id',
    'rounds.status',
    'rounds.started_at',
    'rounds.released_at',
    'rounds.ended_at',
    'rounds.closed_at',
    'rounds.updated_at',
    'votes.id',
    'votes.event_id',
    'votes.project_id',
    'votes.round_id',
    'votes.voter_id',
    'votes.innovation_score',
    'votes.cptm_impact_score',
    'votes.development_score',
    'votes.innovation',
    'votes.impact',
    'votes.development',
    'results.id',
    'results.event_id',
    'results.project_id',
    'results.total_votes',
    'results.sum_innovation',
    'results.sum_impact',
    'results.sum_development',
    'results.average_innovation',
    'results.average_impact',
    'results.average_development',
    'results.average_general',
    'results.percentage',
    'results.popular_points',
    'results.updated_at',
    'admin_profiles.id',
    'admin_profiles.active',
    'admin_profiles.role'
  ];
  v_col text;
BEGIN
  -- 1. Verifica existência de todas as colunas obrigatórias
  FOREACH v_col IN ARRAY v_required_columns LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = split_part(v_col, '.', 1)
        AND column_name = split_part(v_col, '.', 2)
    ) THEN
      RAISE EXCEPTION
        'PRÉ-VALIDAÇÃO FALHOU: coluna obrigatória ausente no banco de dados: %', v_col;
    END IF;
  END LOOP;

  -- 2. Verifica funções essenciais do catálogo
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Função public.is_admin() não encontrada no catálogo.';
  END IF;

  IF to_regprocedure('public.is_superadmin()') IS NULL THEN
    RAISE EXCEPTION 'Função public.is_superadmin() não encontrada no catálogo.';
  END IF;

  IF to_regprocedure(
    'public.admin_manage_profile(text,uuid,text,text,text,boolean)'
  ) IS NULL THEN
    RAISE EXCEPTION
      'Função public.admin_manage_profile(text,uuid,text,text,text,boolean) não encontrada no catálogo.';
  END IF;

  -- 3. Confirma que as funções privilegiadas pertencem a papel com BYPASSRLS/SUPERUSER
  --    e utilizam search_path normalizado: public, pg_temp
  FOREACH v_fn IN ARRAY ARRAY[
    to_regprocedure('public.is_admin()'),
    to_regprocedure('public.is_superadmin()'),
    to_regprocedure(
      'public.admin_manage_profile(text,uuid,text,text,text,boolean)'
    )
  ] LOOP
    SELECT
      (r.rolsuper OR r.rolbypassrls),
      EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE replace(cfg, ' ', '') = 'search_path=public,pg_temp'
      )
    INTO v_owner_ok, v_path_ok
    FROM pg_proc p
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.oid = v_fn;

    IF NOT COALESCE(v_owner_ok, false) THEN
      RAISE EXCEPTION
        'A função % não pertence a um proprietário com BYPASSRLS ou SUPERUSER.',
        v_fn;
    END IF;

    IF NOT COALESCE(v_path_ok, false) THEN
      RAISE EXCEPTION
        'A função % não possui search_path seguro (public, pg_temp).',
        v_fn;
    END IF;
  END LOOP;

  RAISE NOTICE 'Pré-validação estrutural concluída com sucesso.';
END;
$$;

-- =============================================================================
-- 1. TABELA DE VÍNCULO ENTRE ADMINISTRADORES E EVENTOS (public.event_admins)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL
    REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_admins_event_user UNIQUE (event_id, user_id)
);

COMMENT ON TABLE public.event_admins IS
  'Vínculo de autorização entre administradores e eventos.';

CREATE INDEX IF NOT EXISTS idx_event_admins_user_id
  ON public.event_admins(user_id);

CREATE INDEX IF NOT EXISTS idx_event_admins_event_id
  ON public.event_admins(event_id);

CREATE INDEX IF NOT EXISTS idx_event_admins_composite
  ON public.event_admins(user_id, event_id);

-- =============================================================================
-- 2. GARANTIA DE VOTO ÚNICO POR EVENTO, PROJETO E PARTICIPANTE
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS ux_votes_event_project_voter
ON public.votes(event_id, project_id, voter_id);

-- =============================================================================
-- 3. FUNÇÃO DE VERIFICAÇÃO DE ACESSO AO EVENTO (has_event_access)
-- =============================================================================

-- Sobrecarga 1: consulta para a sessão atual (auth.uid())
CREATE OR REPLACE FUNCTION public.has_event_access(p_event_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = auth.uid()
        AND ap.active = true
        AND ap.role = 'superadmin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_admins ea
      JOIN public.admin_profiles ap
        ON ap.id = ea.user_id
      WHERE ea.event_id = p_event_id
        AND ea.user_id = auth.uid()
        AND ap.active = true
    );
$$;

-- Sobrecarga 2: consulta para um usuário específico (p_user_id)
CREATE OR REPLACE FUNCTION public.has_event_access(
  p_event_id text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.admin_profiles ap
      WHERE ap.id = p_user_id
        AND ap.active = true
        AND ap.role = 'superadmin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_admins ea
      JOIN public.admin_profiles ap
        ON ap.id = ea.user_id
      WHERE ea.event_id = p_event_id
        AND ea.user_id = p_user_id
        AND ap.active = true
    );
$$;

-- =============================================================================
-- 4. CONCESSÃO E REVOGAÇÃO DE ACESSO A EVENTOS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.grant_event_access(
  p_event_id text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_assignment_id uuid;
  v_active boolean;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Somente superadministradores podem conceder acesso.'
      USING ERRCODE = '42501';
  END IF;

  -- Serializa a alteração de permissões adquirindo lock do evento
  PERFORM 1
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento % não encontrado.', p_event_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT active
  INTO v_active
  FROM public.admin_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrador não encontrado.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Não é permitido vincular um administrador inativo.'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.event_admins (
    event_id, user_id, granted_by
  )
  VALUES (
    p_event_id, p_user_id, auth.uid()
  )
  ON CONFLICT (event_id, user_id) DO NOTHING
  RETURNING id INTO v_assignment_id;

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'user_id', p_user_id,
    'assignment_id', COALESCE(v_assignment_id::text, 'already_granted')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_event_access(
  p_event_id text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_remaining_admins integer;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Somente superadministradores podem revogar acesso.'
      USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento % não encontrado.', p_event_id
      USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.event_admins
  WHERE event_id = p_event_id
    AND user_id = p_user_id;

  SELECT count(*)
  INTO v_remaining_admins
  FROM public.event_admins
  WHERE event_id = p_event_id;

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'user_id', p_user_id,
    'remaining_admins', v_remaining_admins,
    'will_orphan_event', (v_remaining_admins = 0)
  );
END;
$$;

-- =============================================================================
-- 5. ABERTURA DE RODADA (open_round)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.open_round(
  p_event_id text,
  p_project_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event record;
  v_project record;
  v_new_round_id uuid;
BEGIN
  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.has_event_access(p_event_id) THEN
    RAISE EXCEPTION 'Você não possui acesso administrativo a este evento.'
      USING ERRCODE = '42501';
  END IF;

  IF v_event.status <> 'active' THEN
    RAISE EXCEPTION 'Não é permitido abrir rodadas em eventos que não estejam ativos.'
      USING ERRCODE = '23514';
  END IF;

  SELECT *
  INTO v_project
  FROM public.projects
  WHERE id = p_project_id
    AND event_id = p_event_id
  FOR SHARE;

  IF NOT FOUND OR v_project.active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Projeto inexistente, inativo ou pertencente a outro evento.'
      USING ERRCODE = '23514';
  END IF;

  -- Fecha com segurança qualquer rodada aberta previamente neste evento
  UPDATE public.rounds
  SET status = 'closed',
      ended_at = now(),
      closed_at = now(),
      updated_at = now()
  WHERE event_id = p_event_id
    AND status = 'open';

  -- Cria a nova rodada aberta
  INSERT INTO public.rounds (
    event_id,
    project_id,
    status,
    started_at,
    released_at
  )
  VALUES (
    p_event_id,
    p_project_id,
    'open',
    now(),
    now()
  )
  RETURNING id INTO v_new_round_id;

  -- Atualiza os ponteiros vigentes do evento
  UPDATE public.events
  SET current_round_id = v_new_round_id,
      current_project_id = p_project_id,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'project_id', p_project_id,
    'round_id', v_new_round_id,
    'round', json_build_object(
      'id', v_new_round_id,
      'event_id', p_event_id,
      'project_id', p_project_id,
      'status', 'open',
      'started_at', now()
    )
  );
END;
$$;

-- =============================================================================
-- 6. ENCERRAMENTO DE RODADA (close_round)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.close_round(
  p_event_id text,
  p_round_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event record;
  v_round record;
  v_target_round_id uuid;
BEGIN
  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.has_event_access(p_event_id) THEN
    RAISE EXCEPTION 'Acesso administrativo negado.' USING ERRCODE = '42501';
  END IF;

  IF p_round_id IS NOT NULL THEN
    SELECT *
    INTO v_round
    FROM public.rounds
    WHERE id = p_round_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Rodada não encontrada.' USING ERRCODE = 'P0002';
    END IF;

    IF v_round.event_id <> p_event_id THEN
      RAISE EXCEPTION 'A rodada informada não pertence a este evento.'
        USING ERRCODE = '23514';
    END IF;

    IF v_round.status <> 'open' THEN
      RAISE EXCEPTION 'A rodada informada não está aberta.'
        USING ERRCODE = '23514';
    END IF;

    v_target_round_id := v_round.id;
  ELSE
    SELECT *
    INTO v_round
    FROM public.rounds
    WHERE event_id = p_event_id
      AND status = 'open'
    ORDER BY started_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Não existe rodada aberta para este evento.'
        USING ERRCODE = 'P0002';
    END IF;

    v_target_round_id := v_round.id;
  END IF;

  UPDATE public.rounds
  SET status = 'closed',
      ended_at = now(),
      closed_at = now(),
      updated_at = now()
  WHERE id = v_target_round_id
    AND event_id = p_event_id
    AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não foi possível encerrar a rodada.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Limpa o ponteiro current_round_id apenas se corresponder à rodada encerrada
  UPDATE public.events
  SET current_round_id = NULL,
      updated_at = now()
  WHERE id = p_event_id
    AND current_round_id = v_target_round_id;

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'round_id', v_target_round_id,
    'closed_at', now()
  );
END;
$$;

-- =============================================================================
-- 7. PREPARAÇÃO DO PRÓXIMO PROJETO (prepare_next_round)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prepare_next_round(
  p_event_id text,
  p_next_project_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event record;
  v_project record;
  v_current_order integer;
BEGIN
  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.has_event_access(p_event_id) THEN
    RAISE EXCEPTION 'Acesso administrativo negado.' USING ERRCODE = '42501';
  END IF;

  IF v_event.status <> 'active' THEN
    RAISE EXCEPTION 'Não é permitido preparar projetos em eventos não ativos.'
      USING ERRCODE = '23514';
  END IF;

  IF p_next_project_id IS NOT NULL AND trim(p_next_project_id) <> '' THEN
    SELECT *
    INTO v_project
    FROM public.projects
    WHERE id = p_next_project_id
      AND event_id = p_event_id
      AND active = true
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Projeto não encontrado, inativo ou pertencente a outro evento.'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF v_event.current_project_id IS NOT NULL THEN
      SELECT "order"
      INTO v_current_order
      FROM public.projects
      WHERE id = v_event.current_project_id
        AND event_id = p_event_id;
    END IF;

    SELECT *
    INTO v_project
    FROM public.projects
    WHERE event_id = p_event_id
      AND active = true
      AND "order" > COALESCE(v_current_order, 0)
    ORDER BY "order" ASC
    LIMIT 1
    FOR SHARE;

    IF NOT FOUND THEN
      SELECT *
      INTO v_project
      FROM public.projects
      WHERE event_id = p_event_id
        AND active = true
      ORDER BY "order" ASC
      LIMIT 1
      FOR SHARE;
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Nenhum projeto ativo disponível para preparação.'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- Fecha qualquer rodada aberta existente
  UPDATE public.rounds
  SET status = 'closed',
      ended_at = now(),
      closed_at = now(),
      updated_at = now()
  WHERE event_id = p_event_id
    AND status = 'open';

  -- Atualiza o evento: define o projeto atual e zera a rodada (estado waiting)
  UPDATE public.events
  SET current_round_id = NULL,
      current_project_id = v_project.id,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'project_id', v_project.id,
    'status', 'waiting'
  );
END;
$$;

-- =============================================================================
-- 8. CONSULTA ADMINISTRATIVA DE RESULTADOS (get_admin_results)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_results(
  p_event_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_results json;
BEGIN
  IF NOT (
    public.is_admin()
    AND public.has_event_access(p_event_id)
  ) THEN
    RAISE EXCEPTION 'Acesso negado aos resultados deste evento.'
      USING ERRCODE = '42501';
  END IF;

  SELECT json_agg(row_to_json(r))
  INTO v_results
  FROM (
    SELECT
      res.id,
      res.event_id,
      res.project_id,
      res.total_votes,
      res.sum_innovation,
      res.sum_impact,
      res.sum_development,
      res.average_innovation,
      res.average_impact,
      res.average_development,
      res.average_general,
      res.percentage,
      res.popular_points,
      res.updated_at,
      p.name AS project_name,
      p.category AS project_category,
      p.banner_url AS project_banner,
      p."order" AS project_order
    FROM public.results res
    JOIN public.projects p
      ON p.id = res.project_id
     AND p.event_id = res.event_id
    WHERE res.event_id = p_event_id
    ORDER BY res.average_general DESC NULLS LAST
  ) r;

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'results', COALESCE(v_results, '[]'::json)
  );
END;
$$;

-- =============================================================================
-- 9. CONCILIAÇÃO DE RESULTADOS (reconcile_results)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_results(
  p_event_id text,
  p_project_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event record;
  v_rec record;
  v_count integer := 0;
BEGIN
  -- Bloqueio exclusivo do evento. Concorre com submit_vote (FOR SHARE).
  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_admin()
    AND public.has_event_access(p_event_id)
  ) THEN
    RAISE EXCEPTION 'Acesso negado à conciliação.' USING ERRCODE = '42501';
  END IF;

  IF p_project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id
      AND event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'O projeto informado não pertence ao evento.'
      USING ERRCODE = '23514';
  END IF;

  FOR v_rec IN
    SELECT
      p.event_id,
      p.id AS project_id,
      count(v.id) AS total_votes,
      COALESCE(
        sum(COALESCE(v.innovation_score, v.innovation)), 0
      ) AS sum_inno,
      COALESCE(
        sum(COALESCE(v.cptm_impact_score, v.impact)), 0
      ) AS sum_imp,
      COALESCE(
        sum(COALESCE(v.development_score, v.development)), 0
      ) AS sum_dev
    FROM public.projects p
    LEFT JOIN public.votes v
      ON v.event_id = p.event_id
     AND v.project_id = p.id
    WHERE p.event_id = p_event_id
      AND (
        p_project_id IS NULL
        OR p.id = p_project_id
      )
    GROUP BY p.event_id, p.id
  LOOP

    -- Salvaguarda de dados históricos: se a contagem em public.votes for zero,
    -- mas o projeto já possuir resultado consolidado histórico (total_votes > 0),
    -- preserva os dados históricos intactos para evitar zeramento acidental.
    IF v_rec.total_votes = 0 AND EXISTS (
      SELECT 1
      FROM public.results r
      WHERE r.id = v_rec.event_id || '_' || v_rec.project_id
        AND r.total_votes > 0
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.results (
      id,
      event_id,
      project_id,
      total_votes,
      sum_innovation,
      sum_impact,
      sum_development,
      average_innovation,
      average_impact,
      average_development,
      average_general,
      percentage,
      popular_points,
      updated_at
    )
    VALUES (
      v_rec.event_id || '_' || v_rec.project_id,
      v_rec.event_id,
      v_rec.project_id,
      v_rec.total_votes,
      v_rec.sum_inno,
      v_rec.sum_imp,
      v_rec.sum_dev,

      CASE WHEN v_rec.total_votes > 0
        THEN round(v_rec.sum_inno::numeric / v_rec.total_votes, 2)
        ELSE 0
      END,

      CASE WHEN v_rec.total_votes > 0
        THEN round(v_rec.sum_imp::numeric / v_rec.total_votes, 2)
        ELSE 0
      END,

      CASE WHEN v_rec.total_votes > 0
        THEN round(v_rec.sum_dev::numeric / v_rec.total_votes, 2)
        ELSE 0
      END,

      CASE WHEN v_rec.total_votes > 0
        THEN round(
          (
            (v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)
            ::numeric / 3.0
          ) / v_rec.total_votes,
          2
        )
        ELSE 0
      END,

      CASE WHEN v_rec.total_votes > 0
        THEN round(
          (
            (
              (v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)
              ::numeric / 3.0
            ) / v_rec.total_votes / 5.0
          ) * 100.0,
          2
        )
        ELSE 0
      END,

      CASE WHEN v_rec.total_votes > 0
        THEN round(
          (
            (
              (v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)
              ::numeric / 3.0
            ) / v_rec.total_votes / 5.0
          ) * 20.0,
          2
        )
        ELSE 0
      END,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      total_votes = EXCLUDED.total_votes,
      sum_innovation = EXCLUDED.sum_innovation,
      sum_impact = EXCLUDED.sum_impact,
      sum_development = EXCLUDED.sum_development,
      average_innovation = EXCLUDED.average_innovation,
      average_impact = EXCLUDED.average_impact,
      average_development = EXCLUDED.average_development,
      average_general = EXCLUDED.average_general,
      percentage = EXCLUDED.percentage,
      popular_points = EXCLUDED.popular_points,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'reconciled_projects', v_count
  );
END;
$$;

-- =============================================================================
-- 10. SUBMISSÃO OFICIAL DE VOTO (submit_vote)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_vote(
  p_event_id text,
  p_round_id uuid,
  p_project_id text,
  p_innovation int,
  p_impact int,
  p_development int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_voter_id uuid;
  v_event record;
  v_project record;
  v_round record;
  v_vote_id text;
  v_result_id text;
BEGIN
  -- 1. Identidade do eleitor extraída exclusivamente do JWT autenticado
  v_voter_id := auth.uid();
  IF v_voter_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida. Autentique-se novamente.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação estrita das notas: obrigatórias e exclusivamente de 1 a 5
  IF p_innovation IS NULL
     OR p_impact IS NULL
     OR p_development IS NULL
     OR p_innovation NOT BETWEEN 1 AND 5
     OR p_impact NOT BETWEEN 1 AND 5
     OR p_development NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION
      'Notas inválidas. Cada critério deve receber uma nota inteira entre 1 e 5.'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Ordem hierárquica de bloqueios anti-deadlock: evento -> projeto -> rodada
  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR SHARE;

  IF NOT FOUND OR v_event.status <> 'active' THEN
    RAISE EXCEPTION 'Evento inexistente ou não ativo para votação.'
      USING ERRCODE = '23514';
  END IF;

  SELECT *
  INTO v_project
  FROM public.projects
  WHERE id = p_project_id
    AND event_id = p_event_id
  FOR SHARE;

  IF NOT FOUND OR v_project.active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Projeto inexistente, inativo ou incompatível.'
      USING ERRCODE = '23514';
  END IF;

  SELECT *
  INTO v_round
  FROM public.rounds
  WHERE id = p_round_id
  FOR SHARE;

  IF NOT FOUND OR v_round.status <> 'open' THEN
    RAISE EXCEPTION 'Não existe rodada aberta para este voto.'
      USING ERRCODE = '23514';
  END IF;

  IF v_round.event_id <> p_event_id
     OR v_round.project_id <> p_project_id THEN
    RAISE EXCEPTION 'A rodada não corresponde ao evento e projeto informados.'
      USING ERRCODE = '23514';
  END IF;

  IF v_event.current_round_id IS DISTINCT FROM p_round_id THEN
    RAISE EXCEPTION 'A rodada informada não é a rodada atualmente liberada para votação.'
      USING ERRCODE = '23514';
  END IF;

  v_vote_id := p_event_id || '_' || p_project_id || '_' || v_voter_id::text;
  v_result_id := p_event_id || '_' || p_project_id;

  -- 4. Inserção atômica do voto com preenchimento dual de compatibilidade
  BEGIN
    INSERT INTO public.votes (
      id,
      event_id,
      project_id,
      round_id,
      voter_id,
      voter_uid,
      innovation_score,
      cptm_impact_score,
      development_score,
      innovation,
      impact,
      development
    )
    VALUES (
      v_vote_id,
      p_event_id,
      p_project_id,
      p_round_id,
      v_voter_id,
      v_voter_id,
      p_innovation,
      p_impact,
      p_development,
      p_innovation,
      p_impact,
      p_development
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Voto duplicado: você já avaliou este projeto neste evento.'
        USING ERRCODE = '23505';
  END;

  -- 5. Atualização atômica imediata dos resultados consolidados
  INSERT INTO public.results (
    id,
    event_id,
    project_id,
    total_votes,
    sum_innovation,
    sum_impact,
    sum_development,
    average_innovation,
    average_impact,
    average_development,
    average_general,
    percentage,
    popular_points,
    updated_at
  )
  VALUES (
    v_result_id,
    p_event_id,
    p_project_id,
    1,
    p_innovation,
    p_impact,
    p_development,
    p_innovation,
    p_impact,
    p_development,
    round(
      (p_innovation + p_impact + p_development)::numeric / 3.0,
      2
    ),
    round(
      (
        (p_innovation + p_impact + p_development)::numeric
        / 3.0 / 5.0
      ) * 100.0,
      2
    ),
    round(
      (
        (p_innovation + p_impact + p_development)::numeric
        / 3.0 / 5.0
      ) * 20.0,
      2
    ),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_votes = public.results.total_votes + 1,

    sum_innovation =
      public.results.sum_innovation + EXCLUDED.sum_innovation,

    sum_impact =
      public.results.sum_impact + EXCLUDED.sum_impact,

    sum_development =
      public.results.sum_development + EXCLUDED.sum_development,

    average_innovation = round(
      (
        public.results.sum_innovation + EXCLUDED.sum_innovation
      )::numeric
      / (public.results.total_votes + 1),
      2
    ),

    average_impact = round(
      (
        public.results.sum_impact + EXCLUDED.sum_impact
      )::numeric
      / (public.results.total_votes + 1),
      2
    ),

    average_development = round(
      (
        public.results.sum_development + EXCLUDED.sum_development
      )::numeric
      / (public.results.total_votes + 1),
      2
    ),

    average_general = round(
      (
        (
          public.results.sum_innovation + EXCLUDED.sum_innovation
          + public.results.sum_impact + EXCLUDED.sum_impact
          + public.results.sum_development + EXCLUDED.sum_development
        )::numeric / 3.0
      ) / (public.results.total_votes + 1),
      2
    ),

    percentage = round(
      (
        (
          (
            public.results.sum_innovation + EXCLUDED.sum_innovation
            + public.results.sum_impact + EXCLUDED.sum_impact
            + public.results.sum_development + EXCLUDED.sum_development
          )::numeric / 3.0
        ) / (public.results.total_votes + 1) / 5.0
      ) * 100.0,
      2
    ),

    popular_points = round(
      (
        (
          (
            public.results.sum_innovation + EXCLUDED.sum_innovation
            + public.results.sum_impact + EXCLUDED.sum_impact
            + public.results.sum_development + EXCLUDED.sum_development
          )::numeric / 3.0
        ) / (public.results.total_votes + 1) / 5.0
      ) * 20.0,
      2
    ),

    updated_at = now();

  RETURN json_build_object(
    'success', true,
    'vote_id', v_vote_id
  );
END;
$$;

-- =============================================================================
-- 11. RLS E PRIVILÉGIOS: VOTOS INDIVIDUAIS (SIGILO RIGOROSO DO VOTO)
-- =============================================================================

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'votes'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.votes',
      pol.policyname
    );
  END LOOP;
END;
$$;

-- Somente o próprio eleitor autenticado pode consultar o seu próprio voto.
-- NENHUM administrador possui permissão de leitura sobre votos individuais.
CREATE POLICY votes_select_strict_own
ON public.votes
FOR SELECT
TO authenticated
USING (
  voter_id::text = auth.uid()::text
  OR voter_uid::text = auth.uid()::text
);

-- Revoga todos os privilégios diretos em votes
REVOKE ALL ON TABLE public.votes
FROM PUBLIC, anon, authenticated;

-- Concede estritamente SELECT ao authenticated (restringido pela policy acima)
GRANT SELECT ON TABLE public.votes
TO authenticated;

-- =============================================================================
-- 12. RLS E PRIVILÉGIOS: RESULTADOS AGREGADOS
-- =============================================================================

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'results'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.results',
      pol.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY results_select_policy
ON public.results
FOR SELECT
TO public
USING (
  (
    public.is_admin()
    AND public.has_event_access(event_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = results.event_id
      AND e.results_published = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.rounds r
    WHERE r.event_id = results.event_id
      AND r.project_id = results.project_id
      AND r.status = 'open'
  )
);

REVOKE ALL ON TABLE public.results
FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  event_id,
  project_id,
  total_votes,
  sum_innovation,
  sum_impact,
  sum_development,
  average_innovation,
  average_impact,
  average_development,
  average_general,
  percentage,
  popular_points,
  updated_at
)
ON TABLE public.results
TO anon, authenticated;

-- =============================================================================
-- 13. RLS E PRIVILÉGIOS: EVENTOS
-- =============================================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.events',
      pol.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY events_select_policy
ON public.events
FOR SELECT
TO public
USING (
  CASE
    WHEN public.is_admin()
      THEN public.has_event_access(id)
    ELSE status IN ('active', 'finished')
  END
);

CREATE POLICY events_admin_mutation
ON public.events
FOR UPDATE
TO authenticated
USING (
  public.is_superadmin()
  OR (
    public.has_event_access(id)
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE id = auth.uid()
        AND active = true
        AND role IN ('superadmin', 'admin')
    )
  )
)
WITH CHECK (
  public.is_superadmin()
  OR (
    public.has_event_access(id)
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE id = auth.uid()
        AND active = true
        AND role IN ('superadmin', 'admin')
    )
  )
);

CREATE POLICY events_superadmin_insert
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin());

CREATE POLICY events_superadmin_delete
ON public.events
FOR DELETE
TO authenticated
USING (public.is_superadmin());

REVOKE ALL ON TABLE public.events
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.events
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.events
TO authenticated;

-- =============================================================================
-- 14. RLS E PRIVILÉGIOS: PROJETOS
-- =============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.projects',
      pol.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY projects_select_policy
ON public.projects
FOR SELECT
TO public
USING (
  CASE
    WHEN public.is_admin()
      THEN public.has_event_access(event_id)
    ELSE (
      active = true
      AND EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = projects.event_id
          AND e.status IN ('active', 'finished')
      )
    )
  END
);

CREATE POLICY projects_admin_mutation
ON public.projects
FOR ALL
TO authenticated
USING (
  public.has_event_access(event_id)
  AND EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE id = auth.uid()
      AND active = true
      AND role IN ('superadmin', 'admin')
  )
)
WITH CHECK (
  public.has_event_access(event_id)
  AND EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE id = auth.uid()
      AND active = true
      AND role IN ('superadmin', 'admin')
  )
);

REVOKE ALL ON TABLE public.projects
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.projects
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.projects
TO authenticated;

-- =============================================================================
-- 15. RLS E PRIVILÉGIOS: RODADAS
-- =============================================================================

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rounds'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.rounds',
      pol.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY rounds_select_policy
ON public.rounds
FOR SELECT
TO public
USING (
  CASE
    WHEN public.is_admin()
      THEN public.has_event_access(event_id)
    ELSE EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = rounds.event_id
        AND e.status IN ('active', 'finished')
    )
  END
);

REVOKE ALL ON TABLE public.rounds
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.rounds
TO anon, authenticated;

-- =============================================================================
-- 16. RLS E PRIVILÉGIOS: EVENT_ADMINS
-- =============================================================================

ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_admins'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.event_admins',
      pol.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY event_admins_select
ON public.event_admins
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR user_id = auth.uid()
);

CREATE POLICY event_admins_insert
ON public.event_admins
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin());

CREATE POLICY event_admins_delete
ON public.event_admins
FOR DELETE
TO authenticated
USING (public.is_superadmin());

REVOKE ALL ON TABLE public.event_admins
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.event_admins
TO authenticated;

-- =============================================================================
-- 17. PERMISSÕES DE EXECUÇÃO DAS FUNÇÕES (DCL)
-- =============================================================================

-- Gestão de vínculo de administradores
REVOKE ALL ON FUNCTION public.grant_event_access(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_event_access(text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_event_access(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_event_access(text, uuid) TO authenticated;

-- Verificação de acesso e autorização
REVOKE ALL ON FUNCTION public.has_event_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_event_access(text) TO authenticated, anon;

REVOKE ALL ON FUNCTION public.has_event_access(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_event_access(text, uuid) TO authenticated, anon;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, anon;

-- Operações administrativas de rodadas
REVOKE ALL ON FUNCTION public.open_round(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_round(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.close_round(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_round(text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.prepare_next_round(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_next_round(text, text) TO authenticated;

-- Resultados administrativos
REVOKE ALL ON FUNCTION public.get_admin_results(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_results(text) TO authenticated;

REVOKE ALL ON FUNCTION public.reconcile_results(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_results(text, text) TO authenticated;

-- Gestão administrativa de perfis
REVOKE ALL ON FUNCTION public.admin_manage_profile(text, uuid, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_profile(text, uuid, text, text, text, boolean) TO authenticated;

-- Submissão oficial de votos
REVOKE ALL ON FUNCTION public.submit_vote(text, uuid, text, int, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_vote(text, uuid, text, int, int, int) TO authenticated;

-- =============================================================================
-- 18. AUDITORIA FINAL ANTES DO COMMIT
-- =============================================================================

DO $$
DECLARE
  v_bad integer;
BEGIN
  -- 1. Confirma que todas as funções críticas são SECURITY DEFINER e têm search_path seguro normalizado
  SELECT count(*)
  INTO v_bad
  FROM pg_proc p
  WHERE p.oid IN (
    'public.has_event_access(text)'::regprocedure,
    'public.has_event_access(text,uuid)'::regprocedure,
    'public.grant_event_access(text,uuid)'::regprocedure,
    'public.revoke_event_access(text,uuid)'::regprocedure,
    'public.open_round(text,text)'::regprocedure,
    'public.close_round(text,uuid)'::regprocedure,
    'public.prepare_next_round(text,text)'::regprocedure,
    'public.get_admin_results(text)'::regprocedure,
    'public.reconcile_results(text,text)'::regprocedure,
    'public.submit_vote(text,uuid,text,integer,integer,integer)'::regprocedure,
    'public.admin_manage_profile(text,uuid,text,text,text,boolean)'::regprocedure
  )
  AND (
    p.prosecdef IS DISTINCT FROM true
    OR NOT EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE replace(cfg, ' ', '') = 'search_path=public,pg_temp'
    )
  );

  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'Auditoria final falhou: existem % funções críticas sem SECURITY DEFINER ou search_path seguro normalizado.', v_bad;
  END IF;

  -- 2. Confirma que RLS está habilitado em todas as tabelas protegidas
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'votes',
        'results',
        'events',
        'projects',
        'rounds',
        'event_admins'
      )
      AND c.relrowsecurity IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION
      'Auditoria final falhou: RLS não está habilitado em uma ou mais tabelas do sistema.';
  END IF;

  RAISE NOTICE 'Auditoria interna de pré-commit concluída com sucesso.';
END;
$$;

-- Atualização atômica do cache de esquema do PostgREST
-- Notificação enviada apenas se a transação for concluída e confirmada
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- 19. CONSULTAS DE AUDITORIA PÓS-APLICAÇÃO
-- EXECUTAR MANUALMENTE APÓS O COMMIT PARA HOMOLOGAÇÃO
-- =============================================================================

-- A. Auditoria das funções e permissões efetivas
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS signature,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  EXISTS (
    SELECT 1
    FROM aclexplode(
      COALESCE(p.proacl, acldefault('f', p.proowner))
    ) a
    WHERE a.grantee = 0
      AND a.privilege_type = 'EXECUTE'
  ) AS public_has_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE')
    AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AS authenticated_can_execute,
  p.proconfig AS function_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'grant_event_access',
    'revoke_event_access',
    'has_event_access',
    'open_round',
    'close_round',
    'prepare_next_round',
    'get_admin_results',
    'reconcile_results',
    'submit_vote',
    'is_admin',
    'is_superadmin',
    'admin_manage_profile'
  )
ORDER BY p.proname;

-- B. Auditoria de ativação do RLS nas tabelas
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'votes',
    'results',
    'events',
    'projects',
    'rounds',
    'event_admins'
  )
ORDER BY c.relname;

-- C. Auditoria das políticas ativas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'votes',
    'results',
    'events',
    'projects',
    'rounds',
    'event_admins'
  )
ORDER BY tablename, policyname;

-- D. Conferência de unicidade de votos
SELECT
  event_id,
  project_id,
  voter_id,
  count(*) AS total_ocorrencias
FROM public.votes
GROUP BY event_id, project_id, voter_id
HAVING count(*) > 1;

-- E. Conferência dos agregados atuais preservados
SELECT
  event_id,
  project_id,
  total_votes,
  average_innovation,
  average_impact,
  average_development,
  average_general,
  percentage,
  popular_points
FROM public.results
ORDER BY event_id, project_id;
