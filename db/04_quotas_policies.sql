-- =========================================================
-- Quotas FREE (total + mensuel) – par fuseau utilisateur
-- Anti course concurrente via RLS WITH CHECK
-- =========================================================
begin;

create extension if not exists pgcrypto;

-- Index COUNT rapides
create index if not exists idx_taches_user on public.taches(user_id);
create index if not exists idx_taches_user_created on public.taches(user_id, created_at);
create index if not exists idx_recompenses_user on public.recompenses(user_id);
create index if not exists idx_recompenses_user_created on public.recompenses(user_id, created_at);
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_categories_user_created on public.categories(user_id, created_at);

-- Fonction utilitaire: bornes de mois en UTC selon TZ utilisateur
create or replace function public.get_user_month_bounds_utc(p_user_id uuid)
returns table (start_utc timestamptz, end_utc timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_now_local timestamp; -- local "naive" dans le TZ de l'user
  v_month_start_local timestamp;
  v_month_end_local   timestamp;
begin
  if p_user_id is null then
    -- default Paris si pas d'ID
    v_tz := 'Europe/Paris';
  else
    select coalesce(up.timezone, 'Europe/Paris') into v_tz
    from user_prefs up
    where up.user_id = p_user_id;
    if v_tz is null then
      v_tz := 'Europe/Paris';
    end if;
  end if;

  -- now() at time zone v_tz => timestamp local (sans tz)
  v_now_local := now() at time zone v_tz;
  v_month_start_local := date_trunc('month', v_now_local);
  v_month_end_local   := v_month_start_local + interval '1 month';

  -- Re-projeter en timestamptz (UTC) avec AT TIME ZONE v_tz
  start_utc := v_month_start_local at time zone v_tz;
  end_utc   := v_month_end_local   at time zone v_tz;
  return next;
end;
$$;

-- Vérification de quota pour FREE uniquement
create or replace function public.check_user_quota_free_only(
  p_user_id uuid,
  p_quota_type text,     -- 'task' | 'reward' | 'category'
  p_period text          -- 'total' | 'monthly'
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_free boolean;
  v_limite int;
  v_count int;
  v_start timestamptz;
  v_end   timestamptz;
begin
  if p_user_id is null then
    return false;
  end if;

  -- rôle FREE actif ?
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = p_user_id
      and ur.is_active = true
      and r.name = 'free'
  ) into v_is_free;

  if not v_is_free then
    return true; -- on ne bloque que FREE ici
  end if;

  -- Limite configurée
  select rq.quota_limit
  into v_limite
  from role_quotas rq
  join roles r on r.id = rq.role_id
  where r.name = 'free'
    and rq.quota_type = p_quota_type
    and rq.quota_period = case when p_period='monthly' then 'monthly' else 'total' end
  limit 1;

  if v_limite is null then
    return true; -- pas de limite => permissif
  end if;

  if p_period = 'monthly' then
    select start_utc, end_utc into v_start, v_end from get_user_month_bounds_utc(p_user_id);

    if p_quota_type = 'task' then
      select count(*) into v_count
      from taches
      where user_id = p_user_id
        and created_at >= v_start
        and created_at <  v_end;

    elsif p_quota_type = 'reward' then
      -- mensuel désactivé par défaut (ajoute la ligne role_quotas si tu veux l'activer)
      select count(*) into v_count
      from recompenses
      where user_id = p_user_id
        and created_at >= v_start
        and created_at <  v_end;

    elsif p_quota_type = 'category' then
      select count(*) into v_count
      from categories
      where user_id = p_user_id
        and created_at >= v_start
        and created_at <  v_end;

    else
      return true;
    end if;

  else
    -- total "en stock"
    if p_quota_type = 'task' then
      select count(*) into v_count from taches where user_id = p_user_id;
    elsif p_quota_type = 'reward' then
      select count(*) into v_count from recompenses where user_id = p_user_id;
    elsif p_quota_type = 'category' then
      select count(*) into v_count from categories where user_id = p_user_id;
    else
      return true;
    end if;
  end if;

  return v_count < v_limite;
end;
$$;

-- Policies INSERT (FREE)
drop policy if exists taches_insert_quota_free on public.taches;
create policy taches_insert_quota_free
on public.taches
for insert
to authenticated
with check (
  check_user_quota_free_only(auth.uid(), 'task', 'total')
  and
  check_user_quota_free_only(auth.uid(), 'task', 'monthly')
);

drop policy if exists recompenses_insert_quota_free on public.recompenses;
create policy recompenses_insert_quota_free
on public.recompenses
for insert
to authenticated
with check (
  check_user_quota_free_only(auth.uid(), 'reward', 'total')
  -- and check_user_quota_free_only(auth.uid(), 'reward', 'monthly') -- active si tu ajoutes le quota mensuel
);

drop policy if exists categories_insert_quota_free on public.categories;
create policy categories_insert_quota_free
on public.categories
for insert
to authenticated
with check (
  check_user_quota_free_only(auth.uid(), 'category', 'total')
);

-- Seed/Upsert quotas FREE (conformes à ton besoin)
with free_role as (
  select id from roles where name = 'free' limit 1
)
insert into role_quotas (role_id, quota_type, quota_period, quota_limit)
select id, 'task', 'total',   5 from free_role
union all
select id, 'task', 'monthly', 5 from free_role
union all
select id, 'reward', 'total', 2 from free_role
union all
select id, 'category', 'total', 2 from free_role
on conflict (role_id, quota_type, quota_period)
do update set quota_limit = excluded.quota_limit;

commit;
