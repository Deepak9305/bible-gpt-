begin;

-- Private, user-owned app data that should follow an authenticated user across
-- web and Android. Premium state is intentionally kept in user_stats and is
-- never writable from this table or the client.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  bookmarks jsonb not null default '[]'::jsonb check (jsonb_typeof(bookmarks) = 'array'),
  prayers jsonb not null default '[]'::jsonb check (jsonb_typeof(prayers) = 'array'),
  insights jsonb not null default '{}'::jsonb check (jsonb_typeof(insights) = 'object'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  voice jsonb not null default '{}'::jsonb check (jsonb_typeof(voice) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_data enable row level security;

revoke all on table public.user_data from anon, authenticated;
grant select, insert, update, delete on table public.user_data to authenticated;

drop policy if exists "Users can view their own app data" on public.user_data;
create policy "Users can view their own app data"
  on public.user_data for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own app data" on public.user_data;
create policy "Users can insert their own app data"
  on public.user_data for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own app data" on public.user_data;
create policy "Users can update their own app data"
  on public.user_data for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own app data" on public.user_data;
create policy "Users can delete their own app data"
  on public.user_data for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Existing user_stats intentionally excludes is_premium from client writes.

commit;
