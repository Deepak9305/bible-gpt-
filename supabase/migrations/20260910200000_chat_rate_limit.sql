begin;

create schema if not exists private;

create table if not exists private.chat_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default timezone('utc', now()),
  message_count integer not null default 0 check (message_count >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

revoke all on table private.chat_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table private.chat_rate_limits to service_role;

create or replace function public.consume_chat_rate_limit(
  p_user_id uuid,
  p_limit integer default 35
)
returns table (
  allowed boolean,
  messages_used integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  now_utc timestamptz := timezone('utc', now());
  current_window timestamptz;
  current_count integer;
  retry_seconds integer;
begin
  if p_user_id is null or p_limit < 1 then
    return query select false, 0, 60;
    return;
  end if;

  insert into private.chat_rate_limits (user_id, window_started_at, message_count, updated_at)
  values (p_user_id, now_utc, 0, now_utc)
  on conflict (user_id) do nothing;

  select window_started_at, message_count
    into current_window, current_count
    from private.chat_rate_limits
   where user_id = p_user_id
   for update;

  if current_window <= now_utc - interval '1 minute' then
    update private.chat_rate_limits
       set window_started_at = now_utc,
           message_count = 1,
           updated_at = now_utc
     where user_id = p_user_id;
    return query select true, 1, 60;
  end if;

  if current_count >= p_limit then
    retry_seconds := greatest(
      1,
      ceil(extract(epoch from (current_window + interval '1 minute' - now_utc)))::integer
    );
    return query select false, current_count, retry_seconds;
  end if;

  update private.chat_rate_limits
     set message_count = current_count + 1,
         updated_at = now_utc
   where user_id = p_user_id;

  return query select true, current_count + 1, 60;
end;
$$;

revoke all on function public.consume_chat_rate_limit(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_chat_rate_limit(uuid, integer) to service_role;

commit;
