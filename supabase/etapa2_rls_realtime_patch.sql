-- ============================================================================
-- ARENA VOICE — VOTO POPULAR
-- SCRIPT INCREMENTAL E IDEMPOTENTE: ETAPA 2 (RLS & SUPABASE REALTIME)
-- ============================================================================
-- Este script corrige e homologa:
-- 1. Inclusão das tabelas na publicação supabase_realtime.
-- 2. REPLICA IDENTITY FULL em events, projects, rounds e results.
-- 3. Política de leitura pública irrestrita para resultados agregados (results).
-- 4. Blindagem estrita contra leitura pública de votos individuais (votes).
-- 5. Blindagem estrita de tabelas e funções administrativas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REPLICA IDENTITY FULL (Necessário para payloads completos no Realtime)
-- ----------------------------------------------------------------------------
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.rounds REPLICA IDENTITY FULL;
ALTER TABLE public.results REPLICA IDENTITY FULL;

-- ----------------------------------------------------------------------------
-- 2. PUBLICAÇÃO REALTIME (Adição idempotente das tabelas monitoradas)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- events
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    END IF;

    -- projects
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'projects'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
    END IF;

    -- rounds
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rounds'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
    END IF;

    -- results
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'results'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.results;
    END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. POLÍTICA RLS PARA TABELA RESULTS (Leitura dos agregados matemáticos)
-- ----------------------------------------------------------------------------
-- Permite leitura de agregados numéricos (total de votos, médias) sem expor
-- nenhum dado individual de votantes (não há identificadores nesta tabela).
-- Isso viabiliza o acompanhamento ao vivo no Telão e transmissão Realtime.
DROP POLICY IF EXISTS "results_select_public" ON public.results;
CREATE POLICY "results_select_public" ON public.results
    FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 4. CONFIRMAÇÃO DE BLINDAGEM DA TABELA VOTES (Dados individuais restritos)
-- ----------------------------------------------------------------------------
-- Garante que nenhum usuário anônimo ou público possa listar votos alheios.
-- Cada votante lê somente seu próprio registro (voter_id = auth.uid()).
-- Administradores autenticados podem auditar todos os votos.
DROP POLICY IF EXISTS "votes_select_own" ON public.votes;
CREATE POLICY "votes_select_own" ON public.votes
    FOR SELECT USING (voter_id = auth.uid() OR public.is_admin());

-- Bloqueia qualquer inserção, alteração ou exclusão direta na tabela votes
DROP POLICY IF EXISTS "votes_admin_all" ON public.votes;
CREATE POLICY "votes_admin_all" ON public.votes
    FOR ALL USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. CONFIRMAÇÃO DE BLINDAGEM DAS DEMAIS TABELAS
-- ----------------------------------------------------------------------------
-- events
DROP POLICY IF EXISTS "events_select_public" ON public.events;
CREATE POLICY "events_select_public" ON public.events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "events_all_admin" ON public.events;
CREATE POLICY "events_all_admin" ON public.events
    FOR ALL USING (public.is_admin());

-- projects
DROP POLICY IF EXISTS "projects_select_public" ON public.projects;
CREATE POLICY "projects_select_public" ON public.projects
    FOR SELECT USING (active = true OR public.is_admin());

DROP POLICY IF EXISTS "projects_all_admin" ON public.projects;
CREATE POLICY "projects_all_admin" ON public.projects
    FOR ALL USING (public.is_admin());

-- rounds
DROP POLICY IF EXISTS "rounds_select_public" ON public.rounds;
CREATE POLICY "rounds_select_public" ON public.rounds
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "rounds_all_admin" ON public.rounds;
CREATE POLICY "rounds_all_admin" ON public.rounds
    FOR ALL USING (public.is_admin());

-- admin_profiles (Zero acesso anônimo; leitura apenas admin; escrita superadmin)
DROP POLICY IF EXISTS "admin_profiles_select_auth" ON public.admin_profiles;
CREATE POLICY "admin_profiles_select_auth" ON public.admin_profiles
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_profiles_all_superadmin" ON public.admin_profiles;
CREATE POLICY "admin_profiles_all_superadmin" ON public.admin_profiles
    FOR ALL USING (public.is_superadmin());

