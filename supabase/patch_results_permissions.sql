-- =============================================================================
-- ARENA VOICE — VOTO POPULAR
-- PATCH DE SEGURANÇA E PRIVILÉGIOS: RESULTADOS CONSOLIDADOS (public.results)
-- =============================================================================
-- Finalidade:
-- Permite que clientes PostgREST (anon e authenticated) executem consultas
-- na tabela public.results mesmo com adição de novas colunas dinâmicas
-- (como questions_metrics da Etapa 3 e popular_vote_weight da Etapa 4).
--
-- Garantias de Segurança e Sigilo:
-- 1. A tabela public.results contém exclusivamente somatórios matemáticos e médias
--    agregadas (sem identificador de eleitor, IP ou dados pessoais).
-- 2. A visibilidade pública dos resultados permanece estritamente bloqueada
--    pela política RLS (results_select_policy) até que:
--      a) O administrador publique os resultados no telão (results_published = true), OU
--      b) A rodada de votação daquele projeto esteja ativamente aberta, OU
--      c) O usuário autenticado seja um administrador com acesso ao evento.
-- =============================================================================

-- 1. Concede permissão de SELECT a nível de tabela para anon e authenticated
GRANT SELECT ON TABLE public.results TO anon, authenticated;

-- 2. Assegura que a tabela public.results continue com RLS ativo
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- 3. Atualiza o cache de esquema do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';

