-- =============================================================================
-- ARENA VOICE — MIGRAÇÃO ETAPA 2: USUÁRIOS, VÍNCULOS E RBAC MULTI-EVENTO
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ATUALIZAÇÃO DA TABELA public.event_admins (COLUNA ROLE)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'event_admins'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.event_admins
      ADD COLUMN role text NOT NULL DEFAULT 'operator'
      CHECK (role IN ('admin', 'operator'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. FUNÇÃO AUXILIAR DE VERIFICAÇÃO GRANULAR DE ACESSO AO EVENTO
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_event_access(
  p_event_id text,
  p_required_role text DEFAULT 'operator'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_global_role text;
  v_global_active boolean;
  v_event_role text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Superadmin ativo possui acesso universal
  SELECT role, active
  INTO v_global_role, v_global_active
  FROM public.admin_profiles
  WHERE id = v_caller_id;

  IF FOUND AND v_global_active = true AND v_global_role = 'superadmin' THEN
    RETURN true;
  END IF;

  -- 2. Verifica se o usuário possui vínculo explícito com o evento solicitado
  SELECT role
  INTO v_event_role
  FROM public.event_admins
  WHERE event_id = p_event_id
    AND user_id = v_caller_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Validação conforme o papel mínimo exigido
  IF p_required_role = 'admin' THEN
    RETURN v_event_role = 'admin';
  ELSE
    RETURN v_event_role IN ('admin', 'operator');
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. ATUALIZAÇÃO DA FUNÇÃO admin_manage_profile (CRIAÇÃO DIRETA, AUTO-CONFIRMAÇÃO E GESTÃO)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_manage_profile(
  p_action text,
  p_user_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_role text DEFAULT 'operator',
  p_active boolean DEFAULT true,
  p_password text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_caller_active boolean;
  v_target_profile record;
  v_superadmin_count integer;
  v_new_id uuid;
  v_existing_auth_id uuid;
  v_raw_password text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada.' USING ERRCODE = '42501';
  END IF;

  -- Exige permissão de superadmin ativo
  SELECT role, active INTO v_caller_role, v_caller_active
  FROM public.admin_profiles WHERE id = v_caller_id;

  IF NOT FOUND OR v_caller_active IS DISTINCT FROM true OR v_caller_role <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadministradores podem gerenciar usuários.' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'create' THEN
    -- 1. Verifica se o e-mail já existe em auth.users
    SELECT id INTO v_existing_auth_id FROM auth.users WHERE lower(email) = lower(trim(p_email));

    IF v_existing_auth_id IS NOT NULL THEN
      v_new_id := v_existing_auth_id;
      UPDATE auth.users
      SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
          raw_user_meta_data = jsonb_build_object('name', p_name, 'role', p_role)
      WHERE id = v_new_id;
    ELSE
      -- Cria nova conta em auth.users com senha criptografada em bcrypt e e-mail já confirmado
      v_new_id := COALESCE(p_user_id, gen_random_uuid());
      v_raw_password := COALESCE(p_password, 'ArenaVoice@2025');

      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        v_new_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        lower(trim(p_email)),
        crypt(v_raw_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', p_name, 'role', p_role),
        now(),
        now()
      );
    END IF;

    -- 2. Insere ou atualiza o perfil institucional em public.admin_profiles
    INSERT INTO public.admin_profiles (id, name, email, role, active, created_at, updated_at)
    VALUES (
      v_new_id,
      trim(COALESCE(p_name, 'Novo Administrador')),
      lower(trim(p_email)),
      COALESCE(p_role, 'operator'),
      COALESCE(p_active, true),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = CASE WHEN p_name IS NOT NULL AND trim(p_name) <> '' THEN trim(p_name) ELSE public.admin_profiles.name END,
      email = lower(trim(p_email)),
      role = COALESCE(p_role, public.admin_profiles.role),
      active = COALESCE(p_active, public.admin_profiles.active),
      updated_at = now()
    RETURNING * INTO v_target_profile;

    RETURN json_build_object(
      'success', true,
      'action', 'create',
      'id', v_target_profile.id,
      'name', v_target_profile.name,
      'email', v_target_profile.email,
      'role', v_target_profile.role,
      'active', v_target_profile.active,
      'user', row_to_json(v_target_profile)
    );

  ELSIF p_action = 'update' THEN
    UPDATE public.admin_profiles
    SET
      name = CASE WHEN p_name IS NOT NULL AND trim(p_name) <> '' THEN trim(p_name) ELSE public.admin_profiles.name END,
      email = CASE WHEN p_email IS NOT NULL AND trim(p_email) <> '' THEN lower(trim(p_email)) ELSE public.admin_profiles.email END,
      role = COALESCE(p_role, public.admin_profiles.role),
      active = COALESCE(p_active, public.admin_profiles.active),
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
      'user', row_to_json(v_target_profile)
    );

  ELSIF p_action = 'toggle_active' THEN
    -- Impede desativar o último superadmin ativo
    SELECT count(*) INTO v_superadmin_count FROM public.admin_profiles WHERE role = 'superadmin' AND active = true;
    IF v_superadmin_count <= 1 AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = p_user_id AND role = 'superadmin') THEN
      RAISE EXCEPTION 'Operação bloqueada: não é permitido desativar o único superadministrador ativo.' USING ERRCODE = '23514';
    END IF;

    UPDATE public.admin_profiles
    SET active = COALESCE(p_active, NOT active), updated_at = now()
    WHERE id = p_user_id
    RETURNING * INTO v_target_profile;

    RETURN json_build_object('success', true, 'action', 'toggle_active', 'user', row_to_json(v_target_profile));

  ELSIF p_action = 'delete' THEN
    -- Impede excluir o último superadmin
    SELECT count(*) INTO v_superadmin_count FROM public.admin_profiles WHERE role = 'superadmin' AND active = true;
    IF v_superadmin_count <= 1 AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = p_user_id AND role = 'superadmin') THEN
      RAISE EXCEPTION 'Operação bloqueada: não é permitido excluir o único superadministrador ativo.' USING ERRCODE = '23514';
    END IF;

    DELETE FROM public.event_admins WHERE user_id = p_user_id;
    DELETE FROM public.admin_profiles WHERE id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN json_build_object('success', true, 'action', 'delete', 'id', p_user_id);
  ELSE
    RAISE EXCEPTION 'Ação inválida: %', p_action USING ERRCODE = '22023';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. FUNÇÃO RPC PARA SINCRONIZAÇÃO EM LOTE DOS ACESSOS (sync_admin_event_access)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_admin_event_access(
  p_user_id uuid,
  p_assignments jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_item jsonb;
  v_event_id text;
  v_role text;
  v_inserted_count integer := 0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadministradores podem gerenciar acessos a eventos.' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Identificador do usuário ausente.' USING ERRCODE = '22023';
  END IF;

  -- Remove vínculos anteriores para aplicar o novo estado de forma atômica
  DELETE FROM public.event_admins WHERE user_id = p_user_id;

  -- Insere os novos vínculos selecionados com seus respectivos papéis
  IF p_assignments IS NOT NULL AND jsonb_array_length(p_assignments) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_assignments)
    LOOP
      v_event_id := trim(v_item ->> 'event_id');
      v_role := COALESCE(trim(v_item ->> 'role'), 'operator');

      IF v_role NOT IN ('admin', 'operator') THEN
        v_role := 'operator';
      END IF;

      IF v_event_id IS NOT NULL AND v_event_id <> '' THEN
        INSERT INTO public.event_admins (event_id, user_id, role, granted_by, created_at)
        VALUES (v_event_id, p_user_id, v_role, v_caller_id, now())
        ON CONFLICT (event_id, user_id) DO UPDATE SET
          role = EXCLUDED.role,
          granted_by = v_caller_id;
        v_inserted_count := v_inserted_count + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'assignments_count', v_inserted_count
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. POLÍTICAS RLS ATUALIZADAS (PROTEÇÃO CONTRA CHAMADAS DIRETAS DO OPERADOR)
-- -----------------------------------------------------------------------------

-- public.event_admins
ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_admins_all_superadmin" ON public.event_admins;
CREATE POLICY "event_admins_all_superadmin" ON public.event_admins
  FOR ALL TO authenticated USING (public.is_superadmin());

DROP POLICY IF EXISTS "event_admins_select_own" ON public.event_admins;
CREATE POLICY "event_admins_select_own" ON public.event_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- public.projects: Apenas superadmin e administradores vinculados podem alterar (operador BLOQUEADO)
DROP POLICY IF EXISTS "projects_modify_admin" ON public.projects;
CREATE POLICY "projects_modify_admin" ON public.projects
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.is_superadmin() OR public.has_event_access(event_id, 'admin'));

-- public.events: Apenas superadmin pode criar, editar ou excluir eventos
DROP POLICY IF EXISTS "events_modify_superadmin" ON public.events;
CREATE POLICY "events_modify_superadmin" ON public.events
  FOR INSERT TO authenticated WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "events_update_superadmin" ON public.events;
CREATE POLICY "events_update_superadmin" ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "events_delete_superadmin" ON public.events;
CREATE POLICY "events_delete_superadmin" ON public.events
  FOR DELETE TO authenticated USING (public.is_superadmin());

-- public.event_questions: Operador BLOQUEADO de alterar critérios
DROP POLICY IF EXISTS "event_questions_modify_admin" ON public.event_questions;
CREATE POLICY "event_questions_modify_admin" ON public.event_questions
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.is_superadmin() OR public.has_event_access(event_id, 'admin'));

-- -----------------------------------------------------------------------------
-- 6. PERMISSÕES DE EXECUÇÃO
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.has_event_access(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_profile(text, uuid, text, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_admin_event_access(uuid, jsonb) TO authenticated;

-- Recarrega o cache de esquema do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

