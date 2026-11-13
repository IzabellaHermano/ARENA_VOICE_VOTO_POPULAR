-- =============================================================================
-- ARENA VOICE — ETAPA 3
-- PERGUNTAS E CRITÉRIOS DE AVALIAÇÃO PERSONALIZADOS POR EVENTO
--
-- DIRETRIZES:
-- 1. Transacional (BEGIN / COMMIT) com auditoria antes e pós-aplicação.
-- 2. Cada evento possui conjunto independente de perguntas (escala 1 a 5).
-- 3. As rodadas gravam snapshot das perguntas ativas no momento de abertura.
-- 4. Votos dinâmicos gravados em public.vote_answers com atomicidade e validação.
-- 5. Preservação estrita dos votos e resultados do evento histórico arena-voice-2026.
-- 6. Sigilo absoluto do voto: nenhuma resposta individual acessível a administradores.
-- 7. Não altera tempo de rodada, peso do voto popular ou fluxo de QR Code.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 0. PRÉ-VALIDAÇÃO DO BANCO DE DADOS
-- =============================================================================

DO $$
DECLARE
  v_col text;
  v_required_columns text[] := ARRAY[
    'events.id',
    'events.status',
    'projects.id',
    'projects.event_id',
    'rounds.id',
    'rounds.event_id',
    'rounds.status',
    'votes.id',
    'votes.event_id',
    'votes.project_id',
    'votes.round_id',
    'votes.voter_id',
    'results.id',
    'results.event_id',
    'results.project_id',
    'results.total_votes',
    'admin_profiles.id',
    'admin_profiles.active',
    'admin_profiles.role'
  ];
BEGIN
  FOREACH v_col IN ARRAY v_required_columns LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = split_part(v_col, '.', 1)
        AND column_name = split_part(v_col, '.', 2)
    ) THEN
      RAISE EXCEPTION 'PRÉ-VALIDAÇÃO ETAPA 3 FALHOU: coluna obrigatória ausente: %', v_col;
    END IF;
  END LOOP;

  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'PRÉ-VALIDAÇÃO ETAPA 3 FALHOU: função public.is_admin() ausente.';
  END IF;

  IF to_regprocedure('public.is_superadmin()') IS NULL THEN
    RAISE EXCEPTION 'PRÉ-VALIDAÇÃO ETAPA 3 FALHOU: função public.is_superadmin() ausente.';
  END IF;

  RAISE NOTICE 'Pré-validação da Etapa 3 concluída com sucesso.';
END;
$$;

-- =============================================================================
-- 1. TABELA DE PERGUNTAS E CRITÉRIOS POR EVENTO (public.event_questions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL
    REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  required boolean NOT NULL DEFAULT true,
  min_score integer NOT NULL DEFAULT 1 CHECK (min_score = 1),
  max_score integer NOT NULL DEFAULT 5 CHECK (max_score = 5),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_event_questions_event_title UNIQUE (event_id, title)
);

COMMENT ON TABLE public.event_questions IS
  'Perguntas e critérios de avaliação personalizados para cada evento (escala fixa de 1 a 5).';

CREATE INDEX IF NOT EXISTS idx_event_questions_event_id
  ON public.event_questions(event_id);

CREATE INDEX IF NOT EXISTS idx_event_questions_event_pos
  ON public.event_questions(event_id, position);

CREATE INDEX IF NOT EXISTS idx_event_questions_active
  ON public.event_questions(event_id, active);

-- =============================================================================
-- 2. SNAPSHOT DE PERGUNTAS NA TABELA public.rounds
-- =============================================================================

-- Permite versionar as perguntas ativas no momento em que a rodada é aberta,
-- garantindo que todos os eleitores de uma mesma rodada respondam exatamente
-- às mesmas perguntas, mesmo se houver edições posteriores.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rounds'
      AND column_name = 'questions_snapshot'
  ) THEN
    ALTER TABLE public.rounds
    ADD COLUMN questions_snapshot jsonb DEFAULT NULL;
  END IF;
END;
$$;

-- =============================================================================
-- 3. TABELA DE RESPOSTAS DINÂMICAS AOS CRITÉRIOS (public.vote_answers)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vote_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id text NOT NULL
    REFERENCES public.votes(id) ON DELETE CASCADE,
  question_id uuid NOT NULL
    REFERENCES public.event_questions(id) ON DELETE RESTRICT,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_vote_answers_vote_question UNIQUE (vote_id, question_id)
);

COMMENT ON TABLE public.vote_answers IS
  'Respostas individuais de cada voto às perguntas específicas do evento (sigilo garantido).';

CREATE INDEX IF NOT EXISTS idx_vote_answers_vote_id
  ON public.vote_answers(vote_id);

CREATE INDEX IF NOT EXISTS idx_vote_answers_question_id
  ON public.vote_answers(question_id);

-- =============================================================================
-- 4. MÉTRICAS DINÂMICAS POR PERGUNTA NA TABELA public.results
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'results'
      AND column_name = 'questions_metrics'
  ) THEN
    ALTER TABLE public.results
    ADD COLUMN questions_metrics jsonb DEFAULT '[]'::jsonb;
  END IF;
END;
$$;

-- =============================================================================
-- 5. RPC: CONSULTA PÚBLICA E ADMINISTRATIVA DE PERGUNTAS (get_event_questions)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_event_questions(
  p_event_id text,
  p_include_inactive boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
  v_questions json;
BEGIN
  v_is_admin := public.is_admin();

  -- Usuários públicos só podem ver perguntas ativas de eventos ativos ou finalizados
  IF NOT v_is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.events
      WHERE id = p_event_id AND status IN ('active', 'finished')
    ) THEN
      RAISE EXCEPTION 'Evento não disponível.' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Administradores devem ter acesso concedido ao evento
    IF NOT public.has_event_access(p_event_id) THEN
      RAISE EXCEPTION 'Acesso administrativo negado a este evento.' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', q.id,
      'event_id', q.event_id,
      'title', q.title,
      'description', q.description,
      'position', q.position,
      'active', q.active,
      'required', q.required,
      'min_score', q.min_score,
      'max_score', q.max_score,
      'created_at', q.created_at,
      'updated_at', q.updated_at
    ) ORDER BY q.position ASC, q.created_at ASC
  )
  INTO v_questions
  FROM public.event_questions q
  WHERE q.event_id = p_event_id
    AND (
      p_include_inactive = true
      OR q.active = true
    );

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'questions', COALESCE(v_questions, '[]'::json)
  );
END;
$$;

-- =============================================================================
-- 6. RPC: GESTÃO ADMINISTRATIVA DE PERGUNTAS (manage_event_question)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.manage_event_question(
  p_action text,
  p_event_id text,
  p_question_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_description text DEFAULT '',
  p_position integer DEFAULT NULL,
  p_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_open_round boolean;
  v_answers_count integer;
  v_max_pos integer;
  v_target record;
BEGIN
  -- 1. Validações de acesso administrativo
  IF NOT (public.is_admin() AND public.has_event_access(p_event_id)) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores autorizados podem gerenciar critérios deste evento.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Proteção contra modificações com rodada aberta
  SELECT EXISTS (
    SELECT 1 FROM public.rounds
    WHERE event_id = p_event_id AND status = 'open'
  ) INTO v_has_open_round;

  IF v_has_open_round THEN
    RAISE EXCEPTION 'Operação bloqueada: não é permitido alterar, excluir ou criar critérios enquanto houver rodada de votação aberta.'
      USING ERRCODE = '23514';
  END IF;

  -- 3. Ações
  IF p_action = 'create' THEN
    IF p_title IS NULL OR trim(p_title) = '' THEN
      RAISE EXCEPTION 'O título ou enunciado da pergunta é obrigatório.' USING ERRCODE = '22023';
    END IF;

    -- Se a posição não foi informada, atribui o final da fila
    IF p_position IS NULL OR p_position < 1 THEN
      SELECT COALESCE(max(position), 0) + 1 INTO v_max_pos
      FROM public.event_questions
      WHERE event_id = p_event_id;
    ELSE
      v_max_pos := p_position;
    END IF;

    INSERT INTO public.event_questions (
      event_id,
      title,
      description,
      position,
      active,
      required,
      min_score,
      max_score,
      created_at,
      updated_at
    )
    VALUES (
      p_event_id,
      trim(p_title),
      COALESCE(trim(p_description), ''),
      v_max_pos,
      COALESCE(p_active, true),
      true,
      1,
      5,
      now(),
      now()
    )
    RETURNING * INTO v_target;

    RETURN json_build_object(
      'success', true,
      'action', 'create',
      'question', row_to_json(v_target)
    );

  ELSIF p_action = 'update' THEN
    IF p_question_id IS NULL THEN
      RAISE EXCEPTION 'Identificador da pergunta (p_question_id) é obrigatório para atualização.'
        USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_target
    FROM public.event_questions
    WHERE id = p_question_id AND event_id = p_event_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pergunta não encontrada para este evento.' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.event_questions
    SET title = CASE WHEN p_title IS NOT NULL AND trim(p_title) <> '' THEN trim(p_title) ELSE title END,
        description = CASE WHEN p_description IS NOT NULL THEN trim(p_description) ELSE description END,
        position = CASE WHEN p_position IS NOT NULL AND p_position >= 1 THEN p_position ELSE position END,
        active = CASE WHEN p_active IS NOT NULL THEN p_active ELSE active END,
        updated_at = now()
    WHERE id = p_question_id AND event_id = p_event_id
    RETURNING * INTO v_target;

    RETURN json_build_object(
      'success', true,
      'action', 'update',
      'question', row_to_json(v_target)
    );

  ELSIF p_action = 'toggle_active' THEN
    IF p_question_id IS NULL THEN
      RAISE EXCEPTION 'Identificador da pergunta é obrigatório.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.event_questions
    SET active = COALESCE(p_active, NOT active),
        updated_at = now()
    WHERE id = p_question_id AND event_id = p_event_id
    RETURNING * INTO v_target;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pergunta não encontrada.' USING ERRCODE = 'P0002';
    END IF;

    RETURN json_build_object(
      'success', true,
      'action', 'toggle_active',
      'id', v_target.id,
      'active', v_target.active
    );

  ELSIF p_action = 'delete' THEN
    IF p_question_id IS NULL THEN
      RAISE EXCEPTION 'Identificador da pergunta é obrigatório para exclusão.' USING ERRCODE = '22023';
    END IF;

    -- Verifica se já existem votos associados a esta pergunta
    SELECT count(*) INTO v_answers_count
    FROM public.vote_answers
    WHERE question_id = p_question_id;

    IF v_answers_count > 0 THEN
      RAISE EXCEPTION 'Não é permitido excluir perguntas que já possuem votos registrados (% respostas vinculadas). Desative a pergunta para retirá-la das próximas votações.', v_answers_count
        USING ERRCODE = '23514';
    END IF;

    DELETE FROM public.event_questions
    WHERE id = p_question_id AND event_id = p_event_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pergunta não encontrada para exclusão.' USING ERRCODE = 'P0002';
    END IF;

    RETURN json_build_object(
      'success', true,
      'action', 'delete',
      'deleted_id', p_question_id
    );

  ELSE
    RAISE EXCEPTION 'Ação desconhecida: %. Utilize create, update, toggle_active ou delete.', p_action
      USING ERRCODE = '22023';
  END IF;
END;
$$;

-- =============================================================================
-- 7. RPC: REORDENAÇÃO EM LOTE DE PERGUNTAS (reorder_event_questions)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reorder_event_questions(
  p_event_id text,
  p_question_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_i integer;
  v_qid uuid;
BEGIN
  IF NOT (public.is_admin() AND public.has_event_access(p_event_id)) THEN
    RAISE EXCEPTION 'Acesso negado à reordenação.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rounds
    WHERE event_id = p_event_id AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'Não é permitido reordenar perguntas durante rodada aberta.'
      USING ERRCODE = '23514';
  END IF;

  IF p_question_ids IS NULL OR array_length(p_question_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Lista de identificadores vazia.' USING ERRCODE = '22023';
  END IF;

  FOR v_i IN 1 .. array_length(p_question_ids, 1) LOOP
    v_qid := p_question_ids[v_i];
    UPDATE public.event_questions
    SET position = v_i,
        updated_at = now()
    WHERE id = v_qid AND event_id = p_event_id;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'total_reordered', array_length(p_question_ids, 1)
  );
END;
$$;

-- =============================================================================
-- 8. ATUALIZAÇÃO DA RPC open_round() COM SNAPSHOT DE PERGUNTAS
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

  -- 1. Captura o snapshot congelado das perguntas ativas para esta rodada
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

  -- 2. Fecha com segurança qualquer rodada aberta previamente
  UPDATE public.rounds
  SET status = 'closed',
      ended_at = now(),
      closed_at = now(),
      updated_at = now()
  WHERE event_id = p_event_id
    AND status = 'open';

  -- 3. Insere a nova rodada com o snapshot imutável de perguntas
  INSERT INTO public.rounds (
    event_id,
    project_id,
    status,
    started_at,
    released_at,
    questions_snapshot
  )
  VALUES (
    p_event_id,
    p_project_id,
    'open',
    now(),
    now(),
    v_questions_snapshot
  )
  RETURNING id INTO v_new_round_id;

  -- 4. Atualiza o evento com os novos ponteiros
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
    'questions_count', jsonb_array_length(v_questions_snapshot)
  );
END;
$$;

-- =============================================================================
-- 9. ATUALIZAÇÃO DA RPC submit_vote() PARA RESPOSTAS DINÂMICAS E ATÔMICAS
-- =============================================================================

-- Esta versão aceita tanto respostas dinâmicas (p_answers jsonb) quanto as
-- 3 notas clássicas legadas (p_innovation, p_impact, p_development), garantindo
-- compatibilidade absoluta com o frontend atual e com novas telas dinâmicas.

CREATE OR REPLACE FUNCTION public.submit_vote(
  p_event_id text,
  p_round_id uuid,
  p_project_id text,
  p_innovation int DEFAULT NULL,
  p_impact int DEFAULT NULL,
  p_development int DEFAULT NULL,
  p_answers jsonb DEFAULT NULL
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
  v_item jsonb;
  v_qid uuid;
  v_score int;
  v_sum_scores numeric := 0;
  v_count_answers int := 0;
  v_avg_vote numeric := 0;
  v_inno int := 0;
  v_imp int := 0;
  v_dev int := 0;
  v_q_record record;
  v_snapshot_item jsonb;
  v_required_count int := 0;
BEGIN
  -- 1. Identidade do participante via JWT autenticado
  v_voter_id := auth.uid();
  IF v_voter_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida. Autentique-se novamente.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Hierarquia de bloqueios ordenados: evento -> projeto -> rodada
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

  IF v_round.event_id <> p_event_id OR v_round.project_id <> p_project_id THEN
    RAISE EXCEPTION 'A rodada não corresponde ao evento e projeto informados.'
      USING ERRCODE = '23514';
  END IF;

  IF v_event.current_round_id IS DISTINCT FROM p_round_id THEN
    RAISE EXCEPTION 'A rodada informada não é a rodada atualmente liberada para votação.'
      USING ERRCODE = '23514';
  END IF;

  v_vote_id := p_event_id || '_' || p_project_id || '_' || v_voter_id::text;
  v_result_id := p_event_id || '_' || p_project_id;

  -- 3. Processamento das respostas (Modo Dinâmico ou Modo Legado)
  IF p_answers IS NOT NULL AND jsonb_array_length(p_answers) > 0 THEN

    -- Modo Dinâmico: valida cada resposta contra a escala 1..5 e contra as perguntas do evento
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
      v_qid := (v_item ->> 'question_id')::uuid;
      v_score := (v_item ->> 'score')::integer;

      IF v_qid IS NULL THEN
        RAISE EXCEPTION 'Identificador da pergunta ausente no voto.' USING ERRCODE = '22023';
      END IF;

      IF v_score IS NULL OR v_score NOT BETWEEN 1 AND 5 THEN
        RAISE EXCEPTION 'Nota inválida para a pergunta %. A nota deve ser um inteiro entre 1 e 5.', v_qid
          USING ERRCODE = '22023';
      END IF;

      -- Verifica se a pergunta pertence ao evento
      IF NOT EXISTS (
        SELECT 1 FROM public.event_questions
        WHERE id = v_qid AND event_id = p_event_id
      ) THEN
        RAISE EXCEPTION 'A pergunta % não pertence a este evento.', v_qid
          USING ERRCODE = '23514';
      END IF;

      v_sum_scores := v_sum_scores + v_score;
      v_count_answers := v_count_answers + 1;
    END LOOP;

    -- Confirma se todas as perguntas ativas/obrigatórias do evento foram respondidas
    SELECT count(*) INTO v_required_count
    FROM public.event_questions
    WHERE event_id = p_event_id AND active = true AND required = true;

    IF v_required_count > 0 AND v_count_answers < v_required_count THEN
      RAISE EXCEPTION 'Voto incompleto: você deve responder todas as % perguntas obrigatórias.', v_required_count
        USING ERRCODE = '23514';
    END IF;

    -- Médias para preenchimento de compatibilidade
    v_avg_vote := round(v_sum_scores / v_count_answers::numeric, 2);
    v_inno := round(v_avg_vote);
    v_imp := round(v_avg_vote);
    v_dev := round(v_avg_vote);

  ELSE
    -- Modo Legado (3 notas clássicas)
    IF p_innovation IS NULL
       OR p_impact IS NULL
       OR p_development IS NULL
       OR p_innovation NOT BETWEEN 1 AND 5
       OR p_impact NOT BETWEEN 1 AND 5
       OR p_development NOT BETWEEN 1 AND 5 THEN
      RAISE EXCEPTION 'Notas inválidas. Cada critério deve receber uma nota inteira entre 1 e 5.'
        USING ERRCODE = '22023';
    END IF;

    v_inno := p_innovation;
    v_imp := p_impact;
    v_dev := p_development;
    v_sum_scores := p_innovation + p_impact + p_development;
    v_count_answers := 3;
    v_avg_vote := round(v_sum_scores / 3.0, 2);
  END IF;

  -- 4. Gravação atômica do voto principal
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
      v_inno,
      v_imp,
      v_dev,
      v_inno,
      v_imp,
      v_dev
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Voto duplicado: você já avaliou este projeto neste evento.'
        USING ERRCODE = '23505';
  END;

  -- 5. Gravação atômica das respostas dinâmicas em public.vote_answers
  IF p_answers IS NOT NULL AND jsonb_array_length(p_answers) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
      v_qid := (v_item ->> 'question_id')::uuid;
      v_score := (v_item ->> 'score')::integer;

      INSERT INTO public.vote_answers (
        vote_id,
        question_id,
        score,
        created_at
      )
      VALUES (
        v_vote_id,
        v_qid,
        v_score,
        now()
      );
    END LOOP;
  END IF;

  -- 6. Atualização atômica dos resultados consolidados em public.results
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
    v_inno,
    v_imp,
    v_dev,
    v_inno,
    v_imp,
    v_dev,
    v_avg_vote,
    round((v_avg_vote / 5.0) * 100.0, 2),
    round((v_avg_vote / 5.0) * 20.0, 2),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_votes = public.results.total_votes + 1,
    sum_innovation = public.results.sum_innovation + EXCLUDED.sum_innovation,
    sum_impact = public.results.sum_impact + EXCLUDED.sum_impact,
    sum_development = public.results.sum_development + EXCLUDED.sum_development,
    average_general = round(
      (
        (public.results.average_general * public.results.total_votes) + EXCLUDED.average_general
      ) / (public.results.total_votes + 1),
      2
    ),
    percentage = round(
      (
        (
          (public.results.average_general * public.results.total_votes) + EXCLUDED.average_general
        ) / (public.results.total_votes + 1) / 5.0
      ) * 100.0,
      2
    ),
    popular_points = round(
      (
        (
          (public.results.average_general * public.results.total_votes) + EXCLUDED.average_general
        ) / (public.results.total_votes + 1) / 5.0
      ) * 20.0,
      2
    ),
    updated_at = now();

  RETURN json_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'average_score', v_avg_vote
  );
END;
$$;

-- =============================================================================
-- 10. ATUALIZAÇÃO DA RPC reconcile_results() COM APURAÇÃO DINÂMICA
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
  v_q_metrics jsonb;
  v_has_dynamic_answers boolean;
  v_avg_general numeric;
  v_percentage numeric;
  v_popular_pts numeric;
BEGIN
  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (public.is_admin() AND public.has_event_access(p_event_id)) THEN
    RAISE EXCEPTION 'Acesso negado à conciliação.' USING ERRCODE = '42501';
  END IF;

  -- Itera sobre os projetos do evento
  FOR v_rec IN
    SELECT
      p.event_id,
      p.id AS project_id,
      count(v.id) AS total_votes,
      COALESCE(sum(COALESCE(v.innovation_score, v.innovation)), 0) AS sum_inno,
      COALESCE(sum(COALESCE(v.cptm_impact_score, v.impact)), 0) AS sum_imp,
      COALESCE(sum(COALESCE(v.development_score, v.development)), 0) AS sum_dev
    FROM public.projects p
    LEFT JOIN public.votes v
      ON v.event_id = p.event_id
     AND v.project_id = p.id
    WHERE p.event_id = p_event_id
      AND (p_project_id IS NULL OR p.id = p_project_id)
    GROUP BY p.event_id, p.id
  LOOP

    -- Salvaguarda de dados históricos
    IF v_rec.total_votes = 0 AND EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = v_rec.event_id || '_' || v_rec.project_id
        AND r.total_votes > 0
    ) THEN
      CONTINUE;
    END IF;

    -- Verifica se o projeto possui respostas dinâmicas em vote_answers
    SELECT EXISTS (
      SELECT 1
      FROM public.vote_answers va
      JOIN public.votes v ON v.id = va.vote_id
      WHERE v.event_id = p_event_id AND v.project_id = v_rec.project_id
    ) INTO v_has_dynamic_answers;

    IF v_has_dynamic_answers THEN
      -- Calcula médias por pergunta específica
      SELECT jsonb_agg(
        jsonb_build_object(
          'question_id', q.id,
          'title', q.title,
          'position', q.position,
          'total_answers', count(va.id),
          'sum_score', COALESCE(sum(va.score), 0),
          'average_score', CASE WHEN count(va.id) > 0 THEN round(avg(va.score)::numeric, 2) ELSE 0 END
        ) ORDER BY q.position ASC
      )
      INTO v_q_metrics
      FROM public.event_questions q
      LEFT JOIN public.vote_answers va ON va.question_id = q.id
      LEFT JOIN public.votes v ON v.id = va.vote_id AND v.project_id = v_rec.project_id
      WHERE q.event_id = p_event_id
      GROUP BY q.id, q.title, q.position;

      -- Média geral = soma de todas as notas / total de respostas
      SELECT
        CASE WHEN count(va.id) > 0 THEN round(avg(va.score)::numeric, 2) ELSE 0 END
      INTO v_avg_general
      FROM public.vote_answers va
      JOIN public.votes v ON v.id = va.vote_id
      WHERE v.event_id = p_event_id AND v.project_id = v_rec.project_id;

    ELSE
      -- Modo clássico (3 critérios)
      v_q_metrics := '[]'::jsonb;
      IF v_rec.total_votes > 0 THEN
        v_avg_general := round(
          ((v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)::numeric / 3.0) / v_rec.total_votes,
          2
        );
      ELSE
        v_avg_general := 0;
      END IF;
    END IF;

    v_percentage := round((v_avg_general / 5.0) * 100.0, 2);
    v_popular_pts := round((v_avg_general / 5.0) * 20.0, 2);

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
      CASE WHEN v_rec.total_votes > 0 THEN round(v_rec.sum_inno::numeric / v_rec.total_votes, 2) ELSE 0 END,
      CASE WHEN v_rec.total_votes > 0 THEN round(v_rec.sum_imp::numeric / v_rec.total_votes, 2) ELSE 0 END,
      CASE WHEN v_rec.total_votes > 0 THEN round(v_rec.sum_dev::numeric / v_rec.total_votes, 2) ELSE 0 END,
      v_avg_general,
      v_percentage,
      v_popular_pts,
      COALESCE(v_q_metrics, '[]'::jsonb),
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
      questions_metrics = EXCLUDED.questions_metrics,
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
-- 11. ATUALIZAÇÃO DA RPC get_admin_results() COM MÉTRICAS DINÂMICAS
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
-- 12. ROW LEVEL SECURITY (RLS) PARA AS NOVAS TABELAS
-- =============================================================================

ALTER TABLE public.event_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_answers ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas anteriores
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('event_questions', 'vote_answers')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END;
$$;

-- Políticas para event_questions
CREATE POLICY event_questions_select_policy
ON public.event_questions
FOR SELECT
TO public
USING (
  CASE
    WHEN public.is_admin()
      THEN public.has_event_access(event_id)
    ELSE (
      active = true
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_questions.event_id
          AND e.status IN ('active', 'finished')
      )
    )
  END
);

CREATE POLICY event_questions_admin_mutation
ON public.event_questions
FOR ALL
TO authenticated
USING (
  public.has_event_access(event_id)
  AND EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid() AND active = true AND role IN ('superadmin', 'admin')
  )
)
WITH CHECK (
  public.has_event_access(event_id)
  AND EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid() AND active = true AND role IN ('superadmin', 'admin')
  )
);

-- Políticas para vote_answers (SIGILO TOTAL DOS VOTOS)
-- Apenas o eleitor que gravou o voto pode consultar suas próprias respostas
CREATE POLICY vote_answers_select_own
ON public.vote_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.votes v
    WHERE v.id = vote_answers.vote_id
      AND (v.voter_id::text = auth.uid()::text OR v.voter_uid::text = auth.uid()::text)
  )
);

-- Nenhum administrador tem acesso de SELECT direto em vote_answers
REVOKE ALL ON TABLE public.vote_answers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.vote_answers TO authenticated;

-- Privilégios para event_questions
REVOKE ALL ON TABLE public.event_questions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.event_questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.event_questions TO authenticated;

-- =============================================================================
-- 13. PRIVILÉGIOS DE EXECUÇÃO (DCL)
-- =============================================================================

REVOKE ALL ON FUNCTION public.get_event_questions(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_questions(text, boolean) TO authenticated, anon;

REVOKE ALL ON FUNCTION public.manage_event_question(text, text, uuid, text, text, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_event_question(text, text, uuid, text, text, integer, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.reorder_event_questions(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_event_questions(text, uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_vote(text, uuid, text, int, int, int, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_vote(text, uuid, text, int, int, int, jsonb) TO authenticated;

-- =============================================================================
-- 14. SEED INICIAL: PRESERVAÇÃO DOS 3 CRITÉRIOS PARA arena-voice-2026
-- =============================================================================

INSERT INTO public.event_questions (event_id, title, description, position, active, required, min_score, max_score)
VALUES
  ('arena-voice-2026', 'Nível de Inovação', 'Avalia a originalidade e a inovação da solução.', 1, true, true, 1, 5),
  ('arena-voice-2026', 'Impacto do Projeto na CPTM', 'Avalia a contribuição do projeto para a companhia.', 2, true, true, 1, 5),
  ('arena-voice-2026', 'Salto de Desenvolvimento do Projeto', 'Avalia a evolução apresentada pelo projeto.', 3, true, true, 1, 5)
ON CONFLICT (event_id, title) DO UPDATE SET
  description = EXCLUDED.description,
  position = EXCLUDED.position,
  active = true;

-- =============================================================================
-- 15. AUDITORIA FINAL ANTES DO COMMIT
-- =============================================================================

DO $$
DECLARE
  v_bad integer;
BEGIN
  -- Confirma que todas as funções são SECURITY DEFINER e têm search_path seguro
  SELECT count(*)
  INTO v_bad
  FROM pg_proc p
  WHERE p.oid IN (
    'public.get_event_questions(text,boolean)'::regprocedure,
    'public.manage_event_question(text,text,uuid,text,text,integer,boolean)'::regprocedure,
    'public.reorder_event_questions(text,uuid[])'::regprocedure,
    'public.open_round(text,text)'::regprocedure,
    'public.submit_vote(text,uuid,text,integer,integer,integer,jsonb)'::regprocedure,
    'public.reconcile_results(text,text)'::regprocedure,
    'public.get_admin_results(text)'::regprocedure
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
    RAISE EXCEPTION 'Auditoria final Etapa 3 falhou: % funções sem SECURITY DEFINER ou search_path seguro.', v_bad;
  END IF;

  -- Confirma que RLS está habilitado nas novas tabelas
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('event_questions', 'vote_answers')
      AND c.relrowsecurity IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION 'Auditoria final Etapa 3 falhou: RLS não ativado em event_questions ou vote_answers.';
  END IF;

  RAISE NOTICE 'Auditoria interna da Etapa 3 concluída com sucesso.';
END;
$$;

-- Notificação transacional para recarga do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- 16. CONSULTAS DE AUDITORIA PÓS-APLICAÇÃO
-- =============================================================================

-- A. Conferência das perguntas cadastradas
SELECT event_id, id, title, position, active, min_score, max_score
FROM public.event_questions
ORDER BY event_id, position;

-- B. Conferência das políticas ativas
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('event_questions', 'vote_answers');

