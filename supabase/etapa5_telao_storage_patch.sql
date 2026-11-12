-- ============================================================================
-- ARENA VOICE — VOTO POPULAR
-- ETAPA 5: PATCH INCREMENTAL PARA TELÃO, BANNER STORAGE E SEQUÊNCIA RÍGIDA
-- ============================================================================

-- 1. CRIAÇÃO DO BUCKET OFICIAL DE BANNERS NO SUPABASE STORAGE
-- Permite armazenamento de imagens até 5MB em formato PNG, JPG, JPEG e WEBP
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-banners',
  'project-banners',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- 2. POLÍTICAS RLS PARA O BUCKET PROJECT-BANNERS

-- 2.1 Leitura pública dos banners (Telão e Celulares)
drop policy if exists "project_banners_public_read" on storage.objects;
create policy "project_banners_public_read"
on storage.objects for select
using (bucket_id = 'project-banners');

-- 2.2 Inserção exclusiva por administradores autenticados
drop policy if exists "project_banners_admin_insert" on storage.objects;
create policy "project_banners_admin_insert"
on storage.objects for insert
with check (
  bucket_id = 'project-banners'
  and (
    public.is_admin()
    or auth.role() = 'service_role'
    or exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  )
);

-- 2.3 Atualização exclusiva por administradores
drop policy if exists "project_banners_admin_update" on storage.objects;
create policy "project_banners_admin_update"
on storage.objects for update
using (
  bucket_id = 'project-banners'
  and (
    public.is_admin()
    or auth.role() = 'service_role'
    or exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  )
);

-- 2.4 Exclusão exclusiva por administradores
drop policy if exists "project_banners_admin_delete" on storage.objects;
create policy "project_banners_admin_delete"
on storage.objects for delete
using (
  bucket_id = 'project-banners'
  and (
    public.is_admin()
    or auth.role() = 'service_role'
    or exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  )
);

-- 3. ATUALIZAÇÃO DA PROCEDURE PREPARE_NEXT_ROUND
-- Elimina o loop automático para o primeiro projeto quando a lista chega ao fim
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

  -- Se o ID do próximo projeto for informado explicitamente
  if p_next_project_id is not null and trim(p_next_project_id) <> '' then
    select * into v_proj from public.projects
    where id = p_next_project_id and event_id = p_event_id and active = true;
  else
    -- Caso contrário, busca o próximo projeto rigorosamente pela ordem sequencial
    select current_project_id into v_current_proj_id from public.events where id = p_event_id;
    if v_current_proj_id is not null then
      select "order" into v_current_order from public.projects
      where id = v_current_proj_id and event_id = p_event_id;
    end if;

    select * into v_proj from public.projects
    where event_id = p_event_id and active = true and ("order" > coalesce(v_current_order, 0))
    order by "order" asc limit 1;
  end if;

  -- Se não encontrou próximo projeto, TODOS já foram apresentados! Não reinicia automaticamente.
  if not found or not v_proj.active then
    return json_build_object(
      'success', false,
      'all_presented', true,
      'message', 'Todos os projetos ativos já foram apresentados.'
    );
  end if;

  -- Fecha qualquer rodada aberta anterior
  update public.rounds
  set status = 'closed', ended_at = now(), closed_at = now(), updated_at = now()
  where event_id = p_event_id and status = 'open';

  -- Posiciona o evento no próximo projeto em espera
  update public.events
  set current_round_id = null, current_project_id = v_proj.id, updated_at = now()
  where id = p_event_id;

  return json_build_object(
    'success', true,
    'project_id', v_proj.id,
    'all_presented', false
  );
end;
$$;

-- 4. Permissões de execução
grant execute on function public.prepare_next_round to authenticated;

