-- Bible Nova account schema for Supabase project biblenova1.
-- Safe to run more than once.

begin;

create table if not exists public.user_stats (
  id uuid primary key references auth.users(id) on delete cascade,
  streak integer not null default 0 check (streak >= 0),
  last_visit text not null default '',
  total_verses_read integer not null default 0 check (total_verses_read >= 0),
  total_prayers integer not null default 0 check (total_prayers >= 0),
  user_name text not null default '',
  onboarding_completed boolean not null default false,
  daily_usage_count integer not null default 0 check (daily_usage_count >= 0),
  last_usage_date text not null default '',
  is_premium boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_stats enable row level security;

revoke all on table public.user_stats from anon, authenticated;
grant select, insert, update, delete on table public.user_stats to authenticated;

drop policy if exists "Users can view their own stats" on public.user_stats;
create policy "Users can view their own stats"
  on public.user_stats for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own stats" on public.user_stats;
create policy "Users can insert their own stats"
  on public.user_stats for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own stats" on public.user_stats;
create policy "Users can update their own stats"
  on public.user_stats for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can delete their own stats" on public.user_stats;
create policy "Users can delete their own stats"
  on public.user_stats for delete
  to authenticated
  using ((select auth.uid()) = id);

-- Keep the privileged delete implementation out of the exposed API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.delete_user()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  invoking_user uuid := auth.uid();
begin
  if invoking_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from auth.users where id = invoking_user;
end;
$$;

revoke all on function private.delete_user() from public, anon, authenticated;
grant execute on function private.delete_user() to authenticated;

-- The client calls this exposed, non-definer wrapper.
drop function if exists public.delete_user();
create function public.delete_user()
returns void
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select private.delete_user();
$$;

revoke all on function public.delete_user() from public, anon, authenticated;
grant execute on function public.delete_user() to authenticated;

commit;
