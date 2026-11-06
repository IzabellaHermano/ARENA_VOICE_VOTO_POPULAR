-- ============================================================================
-- ARENA VOICE — VOTO POPULAR
-- SCRIPT DDL E CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- ============================================================================
--
-- Compatibilidade: Supabase Free Tier (PostgreSQL 15+)
-- Segurança: Row Level Security (RLS) + SECURITY DEFINER em Funções PL/pgSQL
-- Realtime: Publicação seletiva de eventos, projetos, rodadas e resultados
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSÕES
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 2. CRIAÇÃO DAS TABELAS
-- ----------------------------------------------------------------------------

-- 2.1 Tabela: events
create table if not exists public.events (
  id text primary key,
  name text not null,
  description text default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'finished')),
  current_round_id uuid,
  current_project_id text,
  results_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.2 Tabela: projects
create table if not exists public.projects (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  name text not null,
  category text default '',
  description text default '',
  banner_url text default '',
  image_url text default '',
  "order" int not null default 1,
  active boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.3 Tabela: rounds
create table if not exists public.rounds (
  id uuid primary key default uuid_generate_v4(),
  event_id text not null references public.events(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'open', 'closed')),
  started_at timestamptz,
  ended_at timestamptz,
  released_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Resolução de dependências circulares entre events e rounds/projects
alter table public.events
  drop constraint if exists fk_events_current_round,
  add constraint fk_events_current_round
  foreign key (current_round_id) references public.rounds(id) on delete set null;

alter table public.events
  drop constraint if exists fk_events_current_project,
  add constraint fk_events_current_project
  foreign key (current_project_id) references public.projects(id) on delete set null;

-- 2.4 Tabela: admin_profiles (Perfis Administrativos vinculados a auth.users)
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'operator' check (role in ('superadmin', 'admin', 'operator')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- View para compatibilidade com queries em 'admins'
create or replace view public.admins as
  select * from public.admin_profiles;

-- 2.5 Tabela: votes (Registro de Votos dos Participantes)
create table if not exists public.votes (
  id text primary key, -- Chave determinística: {event_id}_{project_id}_{voter_id}
  event_id text not null references public.events(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  voter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  voter_uid uuid default auth.uid(),
  innovation_score int not null check (innovation_score between 1 and 5),
  cptm_impact_score int not null check (cptm_impact_score between 1 and 5),
  development_score int not null check (development_score between 1 and 5),
  innovation int check (innovation between 1 and 5),
  impact int check (impact between 1 and 5),
  development int check (development between 1 and 5),
  created_at timestamptz not null default now(),
  -- REGRA INEGOCIÁVEL: Voto único por participante por projeto dentro do evento
  constraint uq_votes_event_project_voter unique (event_id, project_id, voter_id)
);

-- 2.6 Tabela: results (Consolidação em O(1) de Métricas e Pontuação de 20%)
create table if not exists public.results (
  id text primary key, -- Chave: {event_id}_{project_id}
  event_id text not null references public.events(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  total_votes int not null default 0,
  sum_innovation int not null default 0,
  sum_impact int not null default 0,
  sum_development int not null default 0,
  average_innovation numeric(4,2),
  average_impact numeric(4,2),
  average_development numeric(4,2),
  average_general numeric(4,2),
  percentage numeric(5,2),
  popular_points numeric(4,2), -- Pontuação oficial até 20 pontos
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. ÍNDICES DE PERFORMANCE
-- ----------------------------------------------------------------------------
create index if not exists idx_projects_event_order on public.projects(event_id, "order" asc);
create index if not exists idx_rounds_event_status on public.rounds(event_id, status);
create index if not exists idx_votes_round on public.votes(round_id);
create index if not exists idx_votes_voter on public.votes(voter_id);
create index if not exists idx_votes_project on public.votes(project_id);
create index if not exists idx_results_event on public.results(event_id);

-- ----------------------------------------------------------------------------
-- 4. FUNÇÕES DE AUTORIZAÇÃO E SEGURANÇA (RBAC)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
      and active = true
      and role in ('superadmin', 'admin', 'operator')
  );
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
      and active = true
      and role = 'superadmin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 5. FUNÇÕES DE NEGÓCIO ATÔMICAS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- 5.1 submit_vote: Votação atômica com validação de identidade pelo auth.uid()
create or replace function public.submit_vote(
  p_event_id text,
  p_round_id uuid,
  p_project_id text,
  p_innovation int,
  p_impact int,
  p_development int
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_voter_id uuid;
  v_round record;
  v_vote_id text;
  v_result_id text;
begin
  -- 1. Obter identidade do usuário autenticado no servidor
  v_voter_id := auth.uid();
  if v_voter_id is null then
    raise exception 'Acesso não autenticado: Sessão do participante inválida ou expirada.';
  end if;

  -- 2. Validar valores das notas (1 a 5)
  if p_innovation not between 1 and 5 or p_impact not between 1 and 5 or p_development not between 1 and 5 then
    raise exception 'Notas inválidas: As notas devem ser valores inteiros entre 1 e 5.';
  end if;

  -- 3. Lock transacional compartilhado na rodada
  select * into v_round from public.rounds where id = p_round_id for share;
  if not found or v_round.status <> 'open' then
    raise exception 'A rodada de votação para este projeto não está aberta.';
  end if;

  if v_round.project_id <> p_project_id or v_round.event_id <> p_event_id then
    raise exception 'Inconsistência de parâmetros: O projeto ou evento informado não corresponde à rodada ativa.';
  end if;

  v_vote_id := p_event_id || '_' || p_project_id || '_' || v_voter_id::text;
  v_result_id := p_event_id || '_' || p_project_id;

  -- 4. Inserir voto individual com chave única
  begin
    insert into public.votes (
      id, event_id, project_id, round_id, voter_id, voter_uid,
      innovation_score, cptm_impact_score, development_score,
      innovation, impact, development
    )
    values (
      v_vote_id, p_event_id, p_project_id, p_round_id, v_voter_id, v_voter_id,
      p_innovation, p_impact, p_development,
      p_innovation, p_impact, p_development
    );
  exception when unique_violation then
    raise exception 'Voto duplicado: Você já avaliou este projeto neste evento.';
  end;

  -- 5. Atualização Atômica na tabela public.results
  insert into public.results (
    id, event_id, project_id, total_votes, sum_innovation, sum_impact, sum_development,
    average_innovation, average_impact, average_development, average_general, percentage, popular_points, updated_at
  )
  values (
    v_result_id, p_event_id, p_project_id, 1, p_innovation, p_impact, p_development,
    p_innovation, p_impact, p_development,
    round(((p_innovation + p_impact + p_development) / 3.0), 2),
    round((((p_innovation + p_impact + p_development) / 3.0) / 5.0) * 100.0, 2),
    round((((p_innovation + p_impact + p_development) / 3.0) / 5.0) * 20.0, 2),
    now()
  )
  on conflict (id) do update set
    total_votes = public.results.total_votes + 1,
    sum_innovation = public.results.sum_innovation + p_innovation,
    sum_impact = public.results.sum_impact + p_impact,
    sum_development = public.results.sum_development + p_development,
    average_innovation = round((public.results.sum_innovation + p_innovation)::numeric / (public.results.total_votes + 1), 2),
    average_impact = round((public.results.sum_impact + p_impact)::numeric / (public.results.total_votes + 1), 2),
    average_development = round((public.results.sum_development + p_development)::numeric / (public.results.total_votes + 1), 2),
    average_general = round((((public.results.sum_innovation + p_innovation + public.results.sum_impact + p_impact + public.results.sum_development + p_development)::numeric / 3.0) / (public.results.total_votes + 1)), 2),
    percentage = round((((((public.results.sum_innovation + p_innovation + public.results.sum_impact + p_impact + public.results.sum_development + p_development)::numeric / 3.0) / (public.results.total_votes + 1)) / 5.0) * 100.0), 2),
    popular_points = round((((((public.results.sum_innovation + p_innovation + public.results.sum_impact + p_impact + public.results.sum_development + p_development)::numeric / 3.0) / (public.results.total_votes + 1)) / 5.0) * 20.0), 2),
    updated_at = now();

  return json_build_object('success', true, 'vote_id', v_vote_id);
end;
$$;

-- 5.2 open_round: Abertura atômica com lock no evento
create or replace function public.open_round(
  p_event_id text,
  p_project_id text
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_new_round_id uuid;
  v_proj record;
  v_event record;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: Apenas administradores podem liberar rodadas.';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Evento % não encontrado.', p_event_id;
  end if;

  select * into v_proj from public.projects where id = p_project_id and event_id = p_event_id for share;
  if not found or not v_proj.active then
    raise exception 'Projeto % inexistente, inativo ou pertencente a outro evento.', p_project_id;
  end if;

  -- Fecha rodadas anteriores
  update public.rounds
  set status = 'closed', ended_at = now(), closed_at = now(), updated_at = now()
  where event_id = p_event_id and status = 'open';

  -- Cria nova rodada
  insert into public.rounds (event_id, project_id, status, started_at, released_at)
  values (p_event_id, p_project_id, 'open', now(), now())
  returning id into v_new_round_id;

  -- Atualiza evento
  update public.events
  set current_round_id = v_new_round_id, current_project_id = p_project_id, updated_at = now()
  where id = p_event_id;

  return json_build_object('success', true, 'round_id', v_new_round_id);
end;
$$;

-- 5.3 close_round: Encerramento atômico
create or replace function public.close_round(
  p_event_id text,
  p_round_id uuid
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_event record;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: Apenas administradores podem encerrar rodadas.';
  end if;

  select * into v_event from public.events where id = p_event_id for update;

  update public.rounds
  set status = 'closed', ended_at = now(), closed_at = now(), updated_at = now()
  where id = p_round_id and event_id = p_event_id and status = 'open';

  update public.events
  set current_round_id = null, updated_at = now()
  where id = p_event_id;

  return json_build_object('success', true, 'round_id', p_round_id);
end;
$$;

-- 5.4 prepare_next_round: Avanço de projeto em modo 'waiting'
create or replace function public.prepare_next_round(
  p_event_id text,
  p_next_project_id text
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_proj record;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: Apenas administradores podem preparar rodadas.';
  end if;

  select * into v_proj from public.projects where id = p_next_project_id and event_id = p_event_id;
  if not found or not v_proj.active then
    raise exception 'Próximo projeto inválido ou inativo.';
  end if;

  update public.rounds
  set status = 'closed', ended_at = now(), closed_at = now(), updated_at = now()
  where event_id = p_event_id and status = 'open';

  update public.events
  set current_round_id = null, current_project_id = p_next_project_id, updated_at = now()
  where id = p_event_id;

  return json_build_object('success', true, 'project_id', p_next_project_id);
end;
$$;

-- 5.5 get_admin_results: Consulta oficial de auditoria
create or replace function public.get_admin_results(
  p_event_id text
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_results json;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: Relatório exclusivo para administradores.';
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

-- 5.6 reconcile_results: Reconciliação dos somatórios e médias
create or replace function public.reconcile_results(
  p_event_id text,
  p_project_id text default null
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_rec record;
  v_count int := 0;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: Privilégios insuficientes para auditoria.';
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
      round((((((v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)::numeric / 3.0) / v_rec.total_votes) / 5.0) * 100.0), 2),
      round((((((v_rec.sum_inno + v_rec.sum_imp + v_rec.sum_dev)::numeric / 3.0) / v_rec.total_votes) / 5.0) * 20.0), 2),
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

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.projects enable row level security;
alter table public.rounds enable row level security;
alter table public.votes enable row level security;
alter table public.results enable row level security;
alter table public.admin_profiles enable row level security;

-- Policies: events
drop policy if exists "events_select_public" on public.events;
create policy "events_select_public" on public.events for select using (true);

drop policy if exists "events_all_admin" on public.events;
create policy "events_all_admin" on public.events for all using (public.is_admin());

-- Policies: projects
drop policy if exists "projects_select_public" on public.projects;
create policy "projects_select_public" on public.projects for select using (active = true or public.is_admin());

drop policy if exists "projects_all_admin" on public.projects;
create policy "projects_all_admin" on public.projects for all using (public.is_admin());

-- Policies: rounds
drop policy if exists "rounds_select_public" on public.rounds;
create policy "rounds_select_public" on public.rounds for select using (true);

drop policy if exists "rounds_all_admin" on public.rounds;
create policy "rounds_all_admin" on public.rounds for all using (public.is_admin());

-- Policies: votes (Escrita direta bloqueada; leitura restrita)
drop policy if exists "votes_select_own" on public.votes;
create policy "votes_select_own" on public.votes for select using (voter_id = auth.uid() or public.is_admin());

-- Policies: results (Público só lê se divulgado)
drop policy if exists "results_select_public" on public.results;
create policy "results_select_public" on public.results for select using (
  public.is_admin() or (
    exists (select 1 from public.events e where e.id = results.event_id and e.results_published = true)
  )
);

-- Policies: admin_profiles
drop policy if exists "admin_profiles_select_auth" on public.admin_profiles;
create policy "admin_profiles_select_auth" on public.admin_profiles for select using (public.is_admin());

drop policy if exists "admin_profiles_all_superadmin" on public.admin_profiles;
create policy "admin_profiles_all_superadmin" on public.admin_profiles for all using (public.is_superadmin());

-- ----------------------------------------------------------------------------
-- 7. PRIVILÉGIOS DE EXECUÇÃO
-- ----------------------------------------------------------------------------
revoke all on function public.submit_vote from public;
revoke all on function public.open_round from public;
revoke all on function public.close_round from public;
revoke all on function public.prepare_next_round from public;
revoke all on function public.get_admin_results from public;
revoke all on function public.reconcile_results from public;

grant execute on function public.submit_vote to authenticated, anon;
grant execute on function public.open_round to authenticated;
grant execute on function public.close_round to authenticated;
grant execute on function public.prepare_next_round to authenticated;
grant execute on function public.get_admin_results to authenticated;
grant execute on function public.reconcile_results to authenticated;

-- ----------------------------------------------------------------------------
-- 8. REALTIME (PUBLICAÇÃO SELETIVA)
-- ----------------------------------------------------------------------------
-- Importante: votes NUNCA é publicada no Realtime para proteger os votantes
alter publication supabase_realtime drop table if exists public.votes;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.results;

-- ----------------------------------------------------------------------------
-- 9. DADOS INICIAIS DE HOMOLOGAÇÃO (EVENTO E PROJETOS DA ARENA)
-- ----------------------------------------------------------------------------
insert into public.events (id, name, description, status, results_published)
values ('arena-voice-2026', 'Arena Voice 2026', 'Competição oficial de inovação com voto popular em tempo real.', 'active', false)
on conflict (id) do update set name = excluded.name;

insert into public.projects (id, event_id, name, category, description, "order", active, status)
values
  ('projeto01', 'arena-voice-2026', 'Projeto 01', 'Plataforma Inteligente de Gestão', 'Solução preditiva e em tempo real para otimização de mobilidade e eficiência energética na malha.', 1, true, 'active'),
  ('projeto02', 'arena-voice-2026', 'Projeto 02', 'Manutenção Preditiva com IoT', 'Sensores inteligentes embarcados para diagnóstico antecipado de falhas em trens e vias permanentes.', 2, true, 'active'),
  ('projeto03', 'arena-voice-2026', 'Projeto 03', 'Acessibilidade Digital', 'Ecossistema inclusivo multicanal com inteligência artificial para orientação de passageiros com deficiência.', 3, true, 'active'),
  ('projeto04', 'arena-voice-2026', 'Projeto 04', 'Sustentabilidade e Economia Circular', 'Reaproveitamento avançado de componentes e gestão inteligente de resíduos industriais da frota.', 4, true, 'active')
on conflict (id) do update set name = excluded.name, category = excluded.category, description = excluded.description;

