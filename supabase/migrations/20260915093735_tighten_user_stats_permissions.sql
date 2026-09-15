-- The client writes only the safe stats fields. updated_at remains server data.
revoke update (updated_at) on table public.user_stats from authenticated;
