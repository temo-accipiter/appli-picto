-- =========================================================
-- Table user_prefs : stockage du fuseau horaire par user
-- =========================================================
begin;

create table if not exists public.user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Europe/Paris', -- ex: 'Europe/Paris', 'America/New_York'
  updated_at timestamptz not null default now()
);

-- Index
create index if not exists idx_user_prefs_tz on public.user_prefs(timezone);

-- RLS
alter table public.user_prefs enable row level security;

-- L'utilisateur peut voir sa propre ligne
drop policy if exists user_prefs_select_self on public.user_prefs;
create policy user_prefs_select_self
on public.user_prefs
for select
to authenticated
using (auth.uid() = user_id);

-- L'utilisateur peut insérer/mettre à jour sa propre ligne
drop policy if exists user_prefs_upsert_self on public.user_prefs;
create policy user_prefs_upsert_self
on public.user_prefs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_prefs_update_self on public.user_prefs;
create policy user_prefs_update_self
on public.user_prefs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

commit;
