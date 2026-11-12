-- ============================================================================
-- ARENA VOICE — VOTO POPULAR
-- ETAPA 4: PATCH DE CORREÇÃO DO MOTOR DE VOTAÇÃO E SINCRONIZAÇÃO REALTIME
-- ============================================================================

-- 1. Habilita REPLICA IDENTITY FULL para garantir que o Supabase Realtime
-- transmita todas as colunas atualizadas em eventos postgres_changes.
alter table public.events replica identity full;
alter table public.projects replica identity full;
alter table public.rounds replica identity full;
alter table public.results replica identity full;

-- 2. Atualiza a política de leitura em public.results
-- Permite leitura de contadores agregados para o Telão e Painel em tempo real.
-- (A tabela individual votes continua estritamente privada).
drop policy if exists "results_select_public" on public.results;
create policy "results_select_public" on public.results for select using (true);

-- 3. Atualiza procedure close_round para suportar p_round_id opcional
create or replace function public.close_round(
  p_event_id text,
  p_round_id uuid default null
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_event record;
  v_closed_round_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: Apenas administradores podem encerrar rodadas.';
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

-- 4. Atualiza procedure prepare_next_round com avanço automático por ordem
create or replace function public.prepare_next_round(
  p_event_id text,
  p_next_project_id text default null
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_proj record;
  v_current_proj_id text;
  v_current_order int;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: Apenas administradores podem preparar rodadas.';
  end if;

  -- Se p_next_project_id for omitido, busca o próximo projeto automaticamente pela ordem
  if p_next_project_id is null or trim(p_next_project_id) = '' then
    select current_project_id into v_current_proj_id from public.events where id = p_event_id;
    if v_current_proj_id is not null then
      select "order" into v_current_order from public.projects where id = v_current_proj_id and event_id = p_event_id;
    end if;

    select * into v_proj from public.projects
    where event_id = p_event_id and active = true and ("order" > coalesce(v_current_order, 0))
    order by "order" asc limit 1;

    if not found then
      -- Se for o último, reinicia no primeiro projeto ativo
      select * into v_proj from public.projects
      where event_id = p_event_id and active = true
      order by "order" asc limit 1;
    end if;
  else
    select * into v_proj from public.projects where id = p_next_project_id and event_id = p_event_id;
  end if;

  if not found or not v_proj.active then
    raise exception 'Nenhum projeto ativo disponível para a próxima rodada.';
  end if;

  -- Fecha qualquer rodada aberta anterior
  update public.rounds
  set status = 'closed', ended_at = now(), closed_at = now(), updated_at = now()
  where event_id = p_event_id and status = 'open';

  -- Posiciona o evento no próximo projeto em espera
  update public.events
  set current_round_id = null, current_project_id = v_proj.id, updated_at = now()
  where id = p_event_id;

  return json_build_object('success', true, 'project_id', v_proj.id);
end;
$$;

-- 5. Garante permissão de execução
grant execute on function public.close_round to authenticated;
grant execute on function public.prepare_next_round to authenticated;
grant execute on function public.open_round to authenticated;
grant execute on function public.submit_vote to authenticated, anon;

