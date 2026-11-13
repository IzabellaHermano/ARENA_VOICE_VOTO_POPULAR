-- =============================================================================
-- ARENA VOICE — VOTO POPULAR
-- ETAPA 4: CONFIGURAÇÕES INDEPENDENTES POR EVENTO (VERSÃO CORRIGIDA)
-- =============================================================================
--
-- CORREÇÕES DESTA REVISÃO:
-- 1. Eliminação definitiva de public.is_event_admin(text), que não existe no banco.
-- 2. Alinhamento com a função oficial da Etapa 2: public.has_event_access(p_event_id text).
-- 3. Proteção RBAC estrita: operadores são bloqueados de mutação de configurações
--    através da checagem em public.admin_profiles (role IN ('superadmin', 'admin')).
-- 4. Preservação da RPC open_round(text, text) e criação de sobrecarga explícita
--    de três parâmetros sem DEFAULT, evitando DROP e chamadas ambíguas.
-- 5. Preservação da assinatura de retorno de public.get_admin_results(text) como
--    RETURNS json (compatível com a Etapa 2, Etapa 3 e com o frontend).
-- 6. Resiliência em public.reconcile_results: validação dinâmica de existência
--    da tabela vote_answers via to_regclass, prevenindo falha em ambientes sem a Etapa 3.
-- 7. Trilha de auditoria imutável em public.event_settings_history (append-only).
-- =============================================================================
-- =============================================================================
-- ETAPA 0 — TABELAS-BASE PERSISTENTES
-- Estas duas tabelas são criadas antes da transação principal. Assim, se alguma
-- validação posterior interromper a migração, o seed não ficará sem a tabela.
-- Operação aditiva e idempotente: não apaga nem altera registros existentes.
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.events') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.events não existe. Aplique/verifique as etapas anteriores antes da Etapa 4.';
  END IF;
END;
$$;

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

-- =============================================================================
-- MIGRAÇÃO PRINCIPAL — TRANSAÇÃO ATÔMICA
-- =============================================================================
BEGIN;

-- =============================================================================
-- 1. ESTRUTURA DE TABELAS DE CONFIGURAÇÃO E AUDITORIA
-- As tabelas-base já foram garantidas acima; IF NOT EXISTS mantém idempotência.
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



-- Adiciona questions_snapshot com idempotência caso Etapa 3 ainda não tenha executado
ALTER TABLE public.rounds

  ADD COLUMN IF NOT EXISTS questions_snapshot jsonb;



-- 1.4 Adiciona popular_vote_weight e questions_metrics à tabela results
ALTER TABLE public.results

  ADD COLUMN IF NOT EXISTS popular_vote_weight numeric(5,2) NOT NULL DEFAULT 20.00

    CONSTRAINT chk_results_weight CHECK (popular_vote_weight BETWEEN 0.00 AND 100.00);



ALTER TABLE public.results

  ADD COLUMN IF NOT EXISTS questions_metrics jsonb DEFAULT '[]'::jsonb;



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
-- Utiliza public.has_event_access(event_id) oficial da Etapa 2
-- Bloqueia operadores via verificação de role em public.admin_profiles
DROP POLICY IF EXISTS "event_settings_admin_mutation" ON public.event_settings;

CREATE POLICY "event_settings_admin_mutation"

  ON public.event_settings

  FOR ALL

  TO authenticated

  USING (

    public.has_event_access(event_id)

    AND EXISTS (

      SELECT 1 FROM public.admin_profiles ap

      WHERE ap.id = auth.uid()

        AND ap.active = true

        AND ap.role IN ('superadmin', 'admin')

    )

  )

  WITH CHECK (

    public.has_event_access(event_id)

    AND EXISTS (

      SELECT 1 FROM public.admin_profiles ap

      WHERE ap.id = auth.uid()

        AND ap.active = true

        AND ap.role IN ('superadmin', 'admin')

    )

  );



-- 3.3 event_settings_history: Leitura restrita a administradores vinculados ao evento
DROP POLICY IF EXISTS "event_settings_history_select_admin" ON public.event_settings_history;

CREATE POLICY "event_settings_history_select_admin"

  ON public.event_settings_history

  FOR SELECT

  TO authenticated

  USING (

    public.has_event_access(event_id)

    AND EXISTS (

      SELECT 1 FROM public.admin_profiles ap

      WHERE ap.id = auth.uid()

        AND ap.active = true

        AND ap.role IN ('superadmin', 'admin')

    )

  );



-- 3.4 event_settings_history: É estritamente IMUTÁVEL via comandos SQL diretos
-- Inserções ocorrem exclusivamente via RPCs/triggers SECURITY DEFINER.
-- UPDATE e DELETE são revogados para todos os usuários.
REVOKE INSERT, UPDATE, DELETE ON public.event_settings_history FROM anon, authenticated, public;



-- =============================================================================
-- 4. FUNÇÕES RPC DE GESTÃO DE CONFIGURAÇÕES E HISTÓRICO
-- =============================================================================
-- 4.1 RPC: Obter configurações do evento (com inicialização transparente)
CREATE OR REPLACE FUNCTION public.get_event_settings(

  p_event_id text

)

RETURNS json

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



  -- Leitura pública sem efeitos colaterais: não cria nem altera configurações.
  IF NOT FOUND THEN
    RETURN json_build_object(
      'event_id', p_event_id,
      'default_round_duration', 60,
      'popular_vote_weight', 20.00,
      'show_realtime_screen', true,
      'created_at', NULL,
      'updated_at', NULL,
      'updated_by', NULL
    );
  END IF;

  RETURN json_build_object(
    'event_id', v_settings.event_id,
    'default_round_duration', v_settings.default_round_duration,
    'popular_vote_weight', v_settings.popular_vote_weight,
    'show_realtime_screen', v_settings.show_realtime_screen,
    'created_at', v_settings.created_at,
    'updated_at', v_settings.updated_at,
    'updated_by', v_settings.updated_by
  );
END;

$$;



-- 4.2 RPC: Atualizar configurações do evento com auditoria
CREATE OR REPLACE FUNCTION public.update_event_settings(

  p_event_id text,

  p_default_round_duration integer DEFAULT NULL,

  p_popular_vote_weight numeric DEFAULT NULL,

  p_show_realtime_screen boolean DEFAULT NULL

)

RETURNS json

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



  -- 1. Validação de Acesso ao Evento via função oficial da Etapa 2
  IF NOT public.has_event_access(p_event_id) THEN

    RAISE EXCEPTION 'Você não possui autorização administrativa para gerenciar este evento.'

      USING ERRCODE = '42501';

  END IF;



  -- 2. Validação de Papel RBAC: Superadmin e Admin autorizados; Operador bloqueado
  SELECT ap.role INTO v_caller_role

  FROM public.admin_profiles ap

  WHERE ap.id = v_caller_id AND ap.active = true;



  IF v_caller_role IS NULL THEN

    RAISE EXCEPTION 'Perfil administrativo não encontrado ou inativo.' USING ERRCODE = '42501';

  END IF;



  IF v_caller_role = 'operator' THEN

    RAISE EXCEPTION 'Operadores não possuem permissão para alterar configurações do evento.'

      USING ERRCODE = '42501';

  END IF;



  -- 3. Validações estritas de intervalo
  IF p_default_round_duration IS NOT NULL AND (p_default_round_duration < 10 OR p_default_round_duration > 3600) THEN

    RAISE EXCEPTION 'A duração da rodada deve ser um número inteiro entre 10 e 3600 segundos.'

      USING ERRCODE = '23514';

  END IF;



  IF p_popular_vote_weight IS NOT NULL AND (p_popular_vote_weight < 0.00 OR p_popular_vote_weight > 100.00) THEN

    RAISE EXCEPTION 'O peso do Voto Popular deve ser um percentual entre 0.00%% e 100.00%%.'

      USING ERRCODE = '23514';

  END IF;



  -- 4. Obtém estado atual com lock para update
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



  -- 5. Auditoria de alteração de Duração
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



  -- 6. Auditoria de alteração de Peso do Voto Popular
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



  -- 7. Auditoria de alteração de Exibição no Telão
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



  -- 8. Executa o update na tabela oficial
  UPDATE public.event_settings

  SET default_round_duration = v_new_duration,

      popular_vote_weight = v_new_weight,

      show_realtime_screen = v_new_screen,

      updated_at = now(),

      updated_by = v_caller_id

  WHERE event_id = p_event_id

  RETURNING * INTO v_updated;



  RETURN json_build_object(

    'event_id', v_updated.event_id,

    'default_round_duration', v_updated.default_round_duration,

    'popular_vote_weight', v_updated.popular_vote_weight,

    'show_realtime_screen', v_updated.show_realtime_screen,

    'created_at', v_updated.created_at,

    'updated_at', v_updated.updated_at,

    'updated_by', v_updated.updated_by

  );

END;

$$;



-- 4.3 RPC: Consultar Histórico de Alterações do Evento
CREATE OR REPLACE FUNCTION public.get_event_settings_history(

  p_event_id text,

  p_limit integer DEFAULT 50

)

RETURNS json

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, pg_temp

AS $$

DECLARE

  v_history json;

BEGIN

  IF NOT (

    public.has_event_access(p_event_id)

    AND EXISTS (

      SELECT 1 FROM public.admin_profiles ap

      WHERE ap.id = auth.uid()

        AND ap.active = true

        AND ap.role IN ('superadmin', 'admin')

    )

  ) THEN

    RAISE EXCEPTION 'Acesso negado: Administrador não autorizado para este evento.'

      USING ERRCODE = '42501';

  END IF;



  SELECT json_agg(row_to_json(h))

  INTO v_history

  FROM (

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

    LIMIT LEAST(p_limit, 200)

  ) h;



  RETURN json_build_object(

    'success', true,

    'event_id', p_event_id,

    'history', COALESCE(v_history, '[]'::json)

  );

END;

$$;



-- =============================================================================
-- 5. ATUALIZAÇÃO DA RPC open_round() COM DURAÇÃO CONFIGURÁVEL E RESOLUÇÃO DE SOBRECARGA
-- =============================================================================
-- Remove assinatura anterior com 2 argumentos para evitar ambiguidade ('is not unique')
CREATE OR REPLACE FUNCTION public.open_round(

  p_event_id text,

  p_project_id text,

  p_duration_seconds integer

)

RETURNS json

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, pg_temp

AS $$

DECLARE

  v_event record;

  v_project record;

  v_duration_setting integer;

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
  -- Se p_duration_seconds for informado, valida entre 10 e 3600 segundos.
  -- Caso contrário, adota a duração configurada para o evento (fallback 60s).
  IF p_duration_seconds IS NOT NULL THEN

    IF p_duration_seconds < 10 OR p_duration_seconds > 3600 THEN

      RAISE EXCEPTION 'A duração informada para a rodada deve estar entre 10 e 3600 segundos.'

        USING ERRCODE = '23514';

    END IF;

    v_effective_duration := p_duration_seconds;

  ELSE

    SELECT default_round_duration INTO v_duration_setting

    FROM public.event_settings

    WHERE event_id = p_event_id;



    v_effective_duration := COALESCE(v_duration_setting, 60);

  END IF;



  -- 2. Captura o snapshot congelado das perguntas ativas para esta rodada (Etapa 3)
  -- Se a tabela event_questions existir, extrai as perguntas ativas
  IF to_regclass('public.event_questions') IS NOT NULL THEN

    EXECUTE '

      SELECT jsonb_agg(

        jsonb_build_object(

          ''id'', q.id,

          ''title'', q.title,

          ''description'', q.description,

          ''position'', q.position,

          ''required'', q.required,

          ''min_score'', q.min_score,

          ''max_score'', q.max_score

        ) ORDER BY q.position ASC, q.created_at ASC

      )

      FROM public.event_questions q

      WHERE q.event_id = $1 AND q.active = true'

    INTO v_questions_snapshot

    USING p_event_id;

  END IF;



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

-- Mantém a assinatura de dois parâmetros utilizada pelo frontend.
-- Sem override, utiliza a duração padrão configurada para o evento.
CREATE OR REPLACE FUNCTION public.open_round(
  p_event_id text,
  p_project_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.open_round(p_event_id, p_project_id, NULL::integer);
END;
$$;

-- 6. ATUALIZAÇÃO DA RPC reconcile_results() COM PESO CONFIGURÁVEL DO VOTO POPULAR
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

  v_rec record;

  v_weight_setting numeric(5,2);

  v_weight numeric(5,2);

  v_avg_general numeric(5,2);

  v_percentage numeric(5,2);

  v_popular_pts numeric(5,2);

  v_q_metrics jsonb := '[]'::jsonb;

  v_has_dynamic boolean := false;
  v_all_results json;

BEGIN

  IF NOT (public.is_admin() AND public.has_event_access(p_event_id)) THEN

    RAISE EXCEPTION 'Acesso negado: Administrador não autorizado para este evento.'

      USING ERRCODE = '42501';

  END IF;

  -- Compatibilidade com chamadas antigas que omitem p_project_id: apura todos os projetos.
  IF p_project_id IS NULL THEN
    SELECT COALESCE(json_agg(public.reconcile_results(p_event_id, p.id)), '[]'::json)
      INTO v_all_results
      FROM public.projects p
     WHERE p.event_id = p_event_id;

    RETURN json_build_object('success', true, 'event_id', p_event_id, 'results', v_all_results);
  END IF;



  -- 1. Obtém o peso do Voto Popular configurado para o evento (default 20.00%)
  SELECT popular_vote_weight INTO v_weight_setting

  FROM public.event_settings

  WHERE event_id = p_event_id;



  v_weight := COALESCE(v_weight_setting, 20.00);

  IF EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.results_published = true) THEN
    RAISE EXCEPTION 'Os resultados deste evento já foram publicados; a reapuração exige procedimento explícito e auditável.' USING ERRCODE = '55000';
  END IF;



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



  -- 3. Apuração dinâmica a partir de vote_answers (se a tabela existir no banco)
  IF to_regclass('public.vote_answers') IS NOT NULL THEN

    EXECUTE '

      SELECT EXISTS (

        SELECT 1 FROM public.vote_answers va

        JOIN public.votes v ON v.id = va.vote_id

        WHERE v.event_id = $1 AND v.project_id = $2

      )'

    INTO v_has_dynamic

    USING p_event_id, p_project_id;



    IF v_has_dynamic THEN

      -- Média Geral = soma de todas as notas válidas / quantidade total de respostas válidas
      EXECUTE '

        SELECT COALESCE(ROUND(AVG(va.score)::numeric, 2), 0)

        FROM public.vote_answers va

        JOIN public.votes v ON v.id = va.vote_id

        WHERE v.event_id = $1 AND v.project_id = $2'

      INTO v_avg_general

      USING p_event_id, p_project_id;



      -- Agrega métricas detalhadas de cada critério para o breakdown oficial
      IF to_regclass('public.event_questions') IS NOT NULL THEN

        EXECUTE '

          SELECT jsonb_agg(

            jsonb_build_object(

              ''question_id'', q.id,

              ''title'', q.title,

              ''position'', q.position,

              ''total_answers'', COUNT(v.id),

              ''sum_score'', COALESCE(SUM(va.score) FILTER (WHERE v.id IS NOT NULL), 0),

              ''average_score'', CASE WHEN COUNT(v.id) > 0 THEN ROUND((AVG(va.score) FILTER (WHERE v.id IS NOT NULL))::numeric, 2) ELSE 0 END

            ) ORDER BY q.position ASC

          )

          FROM public.event_questions q

          LEFT JOIN public.vote_answers va ON va.question_id = q.id

          LEFT JOIN public.votes v ON v.id = va.vote_id AND v.event_id = $1 AND v.project_id = $2

          WHERE q.event_id = $1

          GROUP BY q.id, q.title, q.position'

        INTO v_q_metrics

        USING p_event_id, p_project_id;

      END IF;

    END IF;

  END IF;



  -- Se não utilizou apuração dinâmica, utiliza apuração legada das 3 colunas padrão
  IF NOT v_has_dynamic THEN

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
-- 7. ATUALIZAÇÃO DA RPC get_admin_results() (RETORNA JSON CONFORME CONTRATO ORIGINAL)
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

  IF NOT (public.is_admin() AND public.has_event_access(p_event_id)) THEN

    RAISE EXCEPTION 'Acesso negado aos resultados deste evento.' USING ERRCODE = '42501';

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

      COALESCE(res.popular_vote_weight, 20.00) AS popular_vote_weight,

      COALESCE(res.questions_metrics, '[]'::jsonb) AS questions_metrics,

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

GRANT EXECUTE ON FUNCTION public.open_round(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_round(text, text, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.reconcile_results(text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_admin_results(text) TO authenticated;



-- Revoga explicitamente de anon e public
REVOKE EXECUTE ON FUNCTION public.update_event_settings(text, integer, numeric, boolean) FROM anon, public;

REVOKE EXECUTE ON FUNCTION public.get_event_settings_history(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.open_round(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.open_round(text, text, integer) FROM anon, public;



COMMIT;



-- Recarrega o cache do PostgREST para publicar as novas RPCs e colunas
NOTIFY pgrst, 'reload schema';