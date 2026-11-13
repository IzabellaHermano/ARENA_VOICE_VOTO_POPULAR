-- =============================================================================
-- ARENA VOICE — VOTO POPULAR
-- ETAPA 4: CONFIGURAÇÕES INDEPENDENTES POR EVENTO
-- SCRIPT DDL, POLÍTICAS RLS, RPCs ATÔMICAS E VERSIONAMENTO AUDITÁVEL
-- =============================================================================
--
-- DIRETRIZES DESTA ETAPA:
-- 1. Isolamento estrito: Configurações são armazenadas individualmente por event_id.
-- 2. Duração das rodadas: Duração padrão por evento + duração individual por rodada
--    registrada no banco (rounds.duration_seconds) e projetada em rounds.ended_at.
-- 3. Peso do Voto Popular: Configurável de 0.00% a 100.00% por evento.
--    Gravado no documento de resultado (results.popular_vote_weight) para garantir
--    imutabilidade e preservação do peso original de apuração.
-- 4. Histórico e Versionamento: Tabela event_settings_history registra old_value,
--    new_value, admin responsável (auth.uid()) e timestamp para cada alteração.
-- 5. Não-retroatividade: Alterações valem para cálculos futuros e próximas rodadas.
--    Resultados consolidados e rodadas encerradas permanecem intactos.
-- 6. Preservação histórica: O evento 'arena-voice-2026', seus votos, perguntas
--    da Etapa 3 e resultados permanecem 100% preservados.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ESTRUTURA DE TABELAS DE CONFIGURAÇÃO E AUDITORIA
-- =============================================================================

-- 1.1 Tabela de Configurações por Evento (1:1 com public.events)
CREATE TABLE IF NOT EXISTS public.event_settings (
  event_id text PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  default_round_duration integer NOT NULL DEFAULT 60
    CONSTRAINT chk_event_settings_duration CHECK (default_round_duration BETWEEN 10 AND 3600),
  popular_vote_weight numeric(5,2) NOT NULL DEFAULT 20.00
    CONSTRAINT chk_event_settings_weight CHECK (popular_vote_weight BETWEEN 0.00 AND 100.00),
  show_realtime_screen boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Comentários descritivos
COMMENT ON TABLE public.event_settings IS 'Configurações operacionais e regras matemáticas isoladas por evento.';
COMMENT ON COLUMN public.event_settings.default_round_duration IS 'Tempo padrão de contagem regressiva das rodadas em segundos (10 a 3600).';
COMMENT ON COLUMN public.event_settings.popular_vote_weight IS 'Peso percentual do Voto Popular na composição da nota final (0.00% a 100.00%).';
COMMENT ON COLUMN public.event_settings.show_realtime_screen IS 'Determina se o Telão exibirá o cronômetro e aprovação em tempo real.';

-- 1.2 Tabela de Histórico e Versionamento Auditável
CREATE TABLE IF NOT EXISTS public.event_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  old_value text,
  new_value text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.event_settings_history IS 'Trilha de auditoria imutável de alterações de configurações por evento.';

-- 1.3 Adiciona duration_seconds à tabela rounds para snapshot da duração utilizada
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 60
    CONSTRAINT chk_rounds_duration CHECK (duration_seconds BETWEEN 10 AND 3600);

COMMENT ON COLUMN public.rounds.duration_seconds IS 'Duração efetiva (em segundos) configurada e utilizada nesta rodada específica.';

-- 1.4 Adiciona popular_vote_weight à tabela results para registrar o peso utilizado no cálculo
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS popular_vote_weight numeric(5,2) NOT NULL DEFAULT 20.00
    CONSTRAINT chk_results_weight CHECK (popular_vote_weight BETWEEN 0.00 AND 100.00);

COMMENT ON COLUMN public.results.popular_vote_weight IS 'Peso percentual do Voto Popular utilizado no momento da apuração do resultado.';

-- =============================================================================
-- 2. ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_event_settings_event ON public.event_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_settings_history_event_date
  ON public.event_settings_history(event_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_event_duration ON public.rounds(event_id, duration_seconds);
CREATE INDEX IF NOT EXISTS idx_results_event_weight ON public.results(event_id, popular_vote_weight);

-- Habilita REPLICA IDENTITY FULL para suporte a Realtime
ALTER TABLE public.event_settings REPLICA IDENTITY FULL;

-- =============================================================================
-- 3. POLÍTICAS DE CONTROLE DE ACESSO (ROW LEVEL SECURITY - RLS)
-- =============================================================================

ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings_history ENABLE ROW LEVEL SECURITY;

-- 3.1 event_settings: Leitura pública para Telão e Votantes
DROP POLICY IF EXISTS "event_settings_select_public" ON public.event_settings;
CREATE POLICY "event_settings_select_public"
  ON public.event_settings
  FOR SELECT
  USING (true);

-- 3.2 event_settings: Mutação restrita a administradores vinculados ao evento
DROP POLICY IF EXISTS "event_settings_admin_mutation" ON public.event_settings;
CREATE POLICY "event_settings_admin_mutation"
  ON public.event_settings
  FOR ALL
  TO authenticated
  USING (public.is_event_admin(event_id))
  WITH CHECK (public.is_event_admin(event_id));

-- 3.3 event_settings_history: Leitura restrita a administradores vinculados ao evento
DROP POLICY IF EXISTS "event_settings_history_select_admin" ON public.event_settings_history;
CREATE POLICY "event_settings_history_select_admin"
  ON public.event_settings_history
  FOR SELECT
  TO authenticated
  USING (public.is_event_admin(event_id));

-- 3.4 event_settings_history: É estritamente IMUTÁVEL via comandos SQL diretos
-- Inserções ocorrem exclusivamente via RPCs/triggers SECURITY DEFINER.
-- UPDATE e DELETE são revogados para todos os usuários.
REVOKE UPDATE, DELETE ON public.event_settings_history FROM anon, authenticated, public;

-- =============================================================================
-- 4. FUNÇÕES RPC DE GESTÃO DE CONFIGURAÇÕES E HISTÓRICO
-- =============================================================================

-- 4.1 RPC: Obter configurações do evento (com inicialização transparente)
CREATE OR REPLACE FUNCTION public.get_event_settings(
  p_event_id text
)
RETURNS public.event_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.event_settings;
BEGIN
  IF p_event_id IS NULL OR trim(p_event_id) = '' THEN
    RAISE EXCEPTION 'ID do evento é obrigatório.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_settings
  FROM public.event_settings
  WHERE event_id = p_event_id;

  -- Se não existir registro de configurações, cria com os padrões oficiais
  IF NOT FOUND THEN
    INSERT INTO public.event_settings (
      event_id,
      default_round_duration,
      popular_vote_weight,
      show_realtime_screen,
      created_at,
      updated_at
    )
    VALUES (
      p_event_id,
      60,
      20.00,
      true,
      now(),
      now()
    )
    ON CONFLICT (event_id) DO UPDATE
      SET updated_at = now()
    RETURNING * INTO v_settings;
  END IF;

  RETURN v_settings;
END;
$$;

-- 4.2 RPC: Atualizar configurações do evento com auditoria
CREATE OR REPLACE FUNCTION public.update_event_settings(
  p_event_id text,
  p_default_round_duration integer DEFAULT NULL,
  p_popular_vote_weight numeric DEFAULT NULL,
  p_show_realtime_screen boolean DEFAULT NULL
)
RETURNS public.event_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_current public.event_settings;
  v_updated public.event_settings;
  v_new_duration integer;
  v_new_weight numeric(5,2);
  v_new_screen boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Acesso não autenticado.' USING ERRCODE = '42501';
  END IF;

  -- Validação de Permissão RBAC (Superadmin ou Admin do evento; Operador bloqueado)
  SELECT role INTO v_caller_role
  FROM public.admin_profiles
  WHERE id = v_caller_id AND active = true;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Perfil administrativo não encontrado ou inativo.' USING ERRCODE = '42501';
  END IF;

  IF v_caller_role = 'operator' THEN
    RAISE EXCEPTION 'Operadores não possuem permissão para alterar configurações do evento.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_event_admin(p_event_id) THEN
    RAISE EXCEPTION 'Você não possui autorização administrativa para gerenciar este evento.'
      USING ERRCODE = '42501';
  END IF;

  -- Validações estritas de intervalo
  IF p_default_round_duration IS NOT NULL AND (p_default_round_duration < 10 OR p_default_round_duration > 3600) THEN
    RAISE EXCEPTION 'A duração da rodada deve ser um número inteiro entre 10 e 3600 segundos.'
      USING ERRCODE = '23514';
  END IF;

  IF p_popular_vote_weight IS NOT NULL AND (p_popular_vote_weight < 0.00 OR p_popular_vote_weight > 100.00) THEN
    RAISE EXCEPTION 'O peso do Voto Popular deve ser um percentual entre 0.00%% e 100.00%%.'
      USING ERRCODE = '23514';
  END IF;

  -- Obtém estado atual com lock para update
  SELECT * INTO v_current
  FROM public.event_settings
  WHERE event_id = p_event_id
  FOR UPDATE;

  -- Se não existir ainda, inicializa registro base
  IF NOT FOUND THEN
    INSERT INTO public.event_settings (event_id, default_round_duration, popular_vote_weight, show_realtime_screen)
    VALUES (p_event_id, 60, 20.00, true)
    RETURNING * INTO v_current;
  END IF;

  -- Define novos valores considerando defaults
  v_new_duration := COALESCE(p_default_round_duration, v_current.default_round_duration);
  v_new_weight := ROUND(COALESCE(p_popular_vote_weight, v_current.popular_vote_weight), 2);
  v_new_screen := COALESCE(p_show_realtime_screen, v_current.show_realtime_screen);

  -- 1. Auditoria de alteração de Duração
  IF v_new_duration IS DISTINCT FROM v_current.default_round_duration THEN
    INSERT INTO public.event_settings_history (
      event_id,
      setting_key,
      old_value,
      new_value,
      changed_by,
      changed_at
    )
    VALUES (
      p_event_id,
      'default_round_duration',
      v_current.default_round_duration::text || 's',
      v_new_duration::text || 's',
      v_caller_id,
      now()
    );
  END IF;

  -- 2. Auditoria de alteração de Peso do Voto Popular
  IF v_new_weight IS DISTINCT FROM v_current.popular_vote_weight THEN
    INSERT INTO public.event_settings_history (
      event_id,
      setting_key,
      old_value,
      new_value,
      changed_by,
      changed_at
    )
    VALUES (
      p_event_id,
      'popular_vote_weight',
      v_current.popular_vote_weight::text || '%',
      v_new_weight::text || '%',
      v_caller_id,
      now()
    );
  END IF;

  -- 3. Auditoria de alteração de Exibição no Telão
  IF v_new_screen IS DISTINCT FROM v_current.show_realtime_screen THEN
    INSERT INTO public.event_settings_history (
      event_id,
      setting_key,
      old_value,
      new_value,
      changed_by,
      changed_at
    )
    VALUES (
      p_event_id,
      'show_realtime_screen',
      v_current.show_realtime_screen::text,
      v_new_screen::text,
      v_caller_id,
      now()
    );
  END IF;

  -- Executa o update na tabela oficial
  UPDATE public.event_settings
  SET default_round_duration = v_new_duration,
      popular_vote_weight = v_new_weight,
      show_realtime_screen = v_new_screen,
      updated_at = now(),
      updated_by = v_caller_id
  WHERE event_id = p_event_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

-- 4.3 RPC: Consultar Histórico de Alterações do Evento
CREATE OR REPLACE FUNCTION public.get_event_settings_history(
  p_event_id text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  event_id text,
  setting_key text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamptz,
  metadata jsonb,
  changed_by_name text,
  changed_by_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_event_admin(p_event_id) THEN
    RAISE EXCEPTION 'Acesso negado: Administrador não autorizado para este evento.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    h.id,
    h.event_id,
    h.setting_key,
    h.old_value,
    h.new_value,
    h.changed_by,
    h.changed_at,
    h.metadata,
    COALESCE(p.name, 'Admin') AS changed_by_name,
    COALESCE(p.email, '') AS changed_by_email
  FROM public.event_settings_history h
  LEFT JOIN public.admin_profiles p ON p.id = h.changed_by
  WHERE h.event_id = p_event_id
  ORDER BY h.changed_at DESC
  LIMIT LEAST(p_limit, 200);
END;
$$;

-- =============================================================================
-- 5. ATUALIZAÇÃO DA RPC open_round() COM DURAÇÃO CONFIGURÁVEL E SNAPSHOT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.open_round(
  p_event_id text,
  p_project_id text,
  p_duration_seconds integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event record;
  v_project record;
  v_settings record;
  v_effective_duration integer;
  v_new_round_id uuid;
  v_questions_snapshot jsonb;
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

  -- 1. Determina a duração efetiva desta rodada:
  -- Se p_duration_seconds for fornecido, valida entre 10 e 3600 segundos.
  -- Caso contrário, recupera a duração padrão configurada para o evento (default 60s).
  IF p_duration_seconds IS NOT NULL THEN
    IF p_duration_seconds < 10 OR p_duration_seconds > 3600 THEN
      RAISE EXCEPTION 'A duração informada para a rodada deve estar entre 10 e 3600 segundos.'
        USING ERRCODE = '23514';
    END IF;
    v_effective_duration := p_duration_seconds;
  ELSE
    SELECT default_round_duration INTO v_settings
    FROM public.event_settings
    WHERE event_id = p_event_id;

    v_effective_duration := COALESCE(v_settings.default_round_duration, 60);
  END IF;

  -- 2. Captura o snapshot congelado das perguntas ativas para esta rodada (Etapa 3)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'title', q.title,
      'description', q.description,
      'position', q.position,
      'required', q.required,
      'min_score', q.min_score,
      'max_score', q.max_score
    ) ORDER BY q.position ASC, q.created_at ASC
  )
  INTO v_questions_snapshot
  FROM public.event_questions q
  WHERE q.event_id = p_event_id
    AND q.active = true;

  -- Se não existirem perguntas cadastradas para o evento, gera snapshot com os 3 critérios padrão
  IF v_questions_snapshot IS NULL OR jsonb_array_length(v_questions_snapshot) = 0 THEN
    v_questions_snapshot := jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'title', 'Nível de Inovação', 'description', 'Originalidade e inovação da solução.', 'position', 1, 'required', true, 'min_score', 1, 'max_score', 5),
      jsonb_build_object('id', gen_random_uuid(), 'title', 'Impacto do Projeto na CPTM', 'description', 'Contribuição do projeto para a companhia.', 'position', 2, 'required', true, 'min_score', 1, 'max_score', 5),
      jsonb_build_object('id', gen_random_uuid(), 'title', 'Salto de Desenvolvimento do Projeto', 'description', 'Evolução técnica apresentada pelo projeto.', 'position', 3, 'required', true, 'min_score', 1, 'max_score', 5)
    );
  END IF;

  -- 3. Fecha com segurança qualquer rodada aberta previamente
  UPDATE public.rounds
  SET status = 'closed',
      ended_at = now(),
      closed_at = now(),
      updated_at = now()
  WHERE event_id = p_event_id
    AND status = 'open';

  -- 4. Insere a nova rodada com duração individual e snapshot imutável de perguntas
  INSERT INTO public.rounds (
    event_id,
    project_id,
    status,
    started_at,
    released_at,
    ended_at,
    duration_seconds,
    questions_snapshot
  )
  VALUES (
    p_event_id,
    p_project_id,
    'open',
    now(),
    now(),
    now() + (v_effective_duration || ' seconds')::interval,
    v_effective_duration,
    v_questions_snapshot
  )
  RETURNING id INTO v_new_round_id;

  -- 5. Atualiza ponteiros no evento ativo
  UPDATE public.events
  SET current_round_id = v_new_round_id,
      current_project_id = p_project_id,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN json_build_object(
    'success', true,
    'round_id', v_new_round_id,
    'project_id', p_project_id,
    'duration_seconds', v_effective_duration
  );
END;
$$;

-- =============================================================================
-- 6. ATUALIZAÇÃO DA RPC reconcile_results() COM PESO CONFIGURÁVEL DO VOTO POPULAR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_results(
  p_event_id text,
  p_project_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec record;
  v_settings record;
  v_weight numeric(5,2);
  v_avg_general numeric(5,2);
  v_percentage numeric(5,2);
  v_popular_pts numeric(5,2);
  v_q_metrics jsonb;
BEGIN
  IF NOT public.has_event_access(p_event_id) THEN
    RAISE EXCEPTION 'Acesso negado: Administrador não autorizado para este evento.'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Obtém o peso do Voto Popular configurado para o evento (default 20.00%)
  SELECT popular_vote_weight INTO v_settings
  FROM public.event_settings
  WHERE event_id = p_event_id;

  v_weight := COALESCE(v_settings.popular_vote_weight, 20.00);

  -- 2. Agrega os votos do projeto
  SELECT
    p_event_id AS event_id,
    p_project_id AS project_id,
    COUNT(v.id)::int AS total_votes,
    COALESCE(SUM(v.innovation_score), 0)::int AS sum_inno,
    COALESCE(SUM(v.cptm_impact_score), 0)::int AS sum_imp,
    COALESCE(SUM(v.development_score), 0)::int AS sum_dev
  INTO v_rec
  FROM public.votes v
  WHERE v.event_id = p_event_id
    AND v.project_id = p_project_id;

  -- 3. Apuração dinâmica a partir de vote_answers (se houver respostas dinâmicas da Etapa 3)
  IF EXISTS (
    SELECT 1 FROM public.vote_answers va
    JOIN public.votes v ON v.id = va.vote_id
    WHERE v.event_id = p_event_id AND v.project_id = p_project_id
  ) THEN
    -- Média Geral = soma de todas as notas válidas / quantidade total de respostas válidas
    SELECT
      COALESCE(ROUND(AVG(va.score)::numeric, 2), 0)
    INTO v_avg_general
    FROM public.vote_answers va
    JOIN public.votes v ON v.id = va.vote_id
    WHERE v.event_id = p_event_id AND v.project_id = p_project_id;

    -- Agrega métricas detalhadas de cada critério para o breakdown oficial
    SELECT jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'title', q.title,
        'position', q.position,
        'total_answers', COUNT(va.id),
        'sum_score', COALESCE(SUM(va.score), 0),
        'average_score', CASE WHEN COUNT(va.id) > 0 THEN ROUND(AVG(va.score)::numeric, 2) ELSE 0 END
      ) ORDER BY q.position ASC
    )
    INTO v_q_metrics
    FROM public.event_questions q
    LEFT JOIN public.vote_answers va ON va.question_id = q.id
    LEFT JOIN public.votes v ON v.id = va.vote_id AND v.event_id = p_event_id AND v.project_id = p_project_id
    WHERE q.event_id = p_event_id
    GROUP BY q.id, q.title, q.position;

  ELSE
    -- Modo legado baseado nas 3 colunas padrão
    v_q_metrics := '[]'::jsonb;
    IF v_rec.total_votes > 0 THEN
      v_avg_general := ROUND(
        ((v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)::numeric / 3.0) / v_rec.total_votes,
        2
      );
    ELSE
      v_avg_general := 0;
    END IF;
  END IF;

  -- 4. Aplicação da Fórmula Parametrizada pelo Peso Configurado do Evento
  -- Percentual = (Média Geral / 5.0) * 100.0%
  -- Pontos Populares = (Média Geral / 5.0) * Peso do Evento
  v_percentage := ROUND((v_avg_general / 5.0) * 100.0, 2);
  v_popular_pts := ROUND((v_avg_general / 5.0) * v_weight, 2);

  -- 5. Atualização atômica em public.results com registro do peso utilizado
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
    popular_vote_weight,
    questions_metrics,
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
    CASE WHEN v_rec.total_votes > 0 THEN ROUND(v_rec.sum_inno::numeric / v_rec.total_votes, 2) ELSE 0 END,
    CASE WHEN v_rec.total_votes > 0 THEN ROUND(v_rec.sum_imp::numeric / v_rec.total_votes, 2) ELSE 0 END,
    CASE WHEN v_rec.total_votes > 0 THEN ROUND(v_rec.sum_dev::numeric / v_rec.total_votes, 2) ELSE 0 END,
    v_avg_general,
    v_percentage,
    v_popular_pts,
    v_weight,
    COALESCE(v_q_metrics, '[]'::jsonb),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET total_votes = EXCLUDED.total_votes,
        sum_innovation = EXCLUDED.sum_innovation,
        sum_impact = EXCLUDED.sum_impact,
        sum_development = EXCLUDED.sum_development,
        average_innovation = EXCLUDED.average_innovation,
        average_impact = EXCLUDED.average_impact,
        average_development = EXCLUDED.average_development,
        average_general = EXCLUDED.average_general,
        percentage = EXCLUDED.percentage,
        popular_points = EXCLUDED.popular_points,
        popular_vote_weight = EXCLUDED.popular_vote_weight,
        questions_metrics = EXCLUDED.questions_metrics,
        updated_at = now();

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'project_id', p_project_id,
    'total_votes', v_rec.total_votes,
    'average_general', v_avg_general,
    'percentage', v_percentage,
    'popular_points', v_popular_pts,
    'popular_vote_weight', v_weight
  );
END;
$$;

-- =============================================================================
-- 7. ATUALIZAÇÃO DA RPC get_admin_results()
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_results(
  p_event_id text
)
RETURNS TABLE (
  id text,
  event_id text,
  project_id text,
  total_votes integer,
  sum_innovation integer,
  sum_impact integer,
  sum_development integer,
  average_innovation numeric,
  average_impact numeric,
  average_development numeric,
  average_general numeric,
  percentage numeric,
  popular_points numeric,
  popular_vote_weight numeric,
  questions_metrics jsonb,
  updated_at timestamptz,
  project_name text,
  project_order integer,
  project_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_event_access(p_event_id) THEN
    RAISE EXCEPTION 'Acesso negado: Administrador não autorizado para este evento.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
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
    COALESCE(res.popular_vote_weight, 20.00) AS popular_vote_weight,
    COALESCE(res.questions_metrics, '[]'::jsonb) AS questions_metrics,
    res.updated_at,
    p.name AS project_name,
    p.order AS project_order,
    p.active AS project_active
  FROM public.results res
  JOIN public.projects p ON p.id = res.project_id AND p.event_id = res.event_id
  WHERE res.event_id = p_event_id
  ORDER BY res.average_general DESC NULLS LAST, res.total_votes DESC;
END;
$$;

-- =============================================================================
-- 8. SEED IDEMPOTENTE DE COMPATIBILIDADE HISTÓRICA ('arena-voice-2026')
-- =============================================================================

-- Insere as configurações padrão oficiais (60s, 20.00%, telão ativo)
-- para o evento histórico arena-voice-2026 preservando integralmente seus dados.
INSERT INTO public.event_settings (
  event_id,
  default_round_duration,
  popular_vote_weight,
  show_realtime_screen,
  created_at,
  updated_at
)
SELECT
  e.id,
  60,
  20.00,
  true,
  now(),
  now()
FROM public.events e
WHERE e.id = 'arena-voice-2026'
ON CONFLICT (event_id) DO NOTHING;

-- Registra a configuração inicial no histórico se vazio
INSERT INTO public.event_settings_history (
  event_id,
  setting_key,
  old_value,
  new_value,
  changed_at
)
SELECT
  'arena-voice-2026',
  'initial_setup',
  NULL,
  'Configurações padrão inicializadas (60s, 20% Voto Popular)',
  now()
WHERE EXISTS (SELECT 1 FROM public.events WHERE id = 'arena-voice-2026')
  AND NOT EXISTS (SELECT 1 FROM public.event_settings_history WHERE event_id = 'arena-voice-2026');

-- =============================================================================
-- 9. PERMISSÕES E PRIVILÉGIOS (DCL)
-- =============================================================================

-- Leitura de configurações para authenticated e anon (Telão e Celulares de Votação)
GRANT SELECT ON public.event_settings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_settings(text) TO anon, authenticated;

-- Gerenciamento restrito a authenticated
GRANT EXECUTE ON FUNCTION public.update_event_settings(text, integer, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_settings_history(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_round(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_results(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_results(text) TO authenticated;

-- Revoga explicitamente de anon e public
REVOKE EXECUTE ON FUNCTION public.update_event_settings(text, integer, numeric, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_event_settings_history(text, integer) FROM anon, public;

COMMIT;

-- Recarrega o cache do PostgREST para publicar as novas RPCs e colunas
NOTIFY pgrst, 'reload schema';

