-- 1. Create the user_stats table
CREATE TABLE public.user_stats (
  id uuid references auth.users not null primary key,
  streak integer default 0,
  last_visit text default '',
  total_verses_read integer default 0,
  total_prayers integer default 0,
  user_name text default '',
  onboarding_completed boolean default false,
  daily_usage_count integer default 0,
  last_usage_date text default '',
  is_premium boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats." ON public.user_stats FOR SELECT USING ( auth.uid() = id );
CREATE POLICY "Users can insert their own stats." ON public.user_stats FOR INSERT WITH CHECK ( auth.uid() = id );
CREATE POLICY "Users can update their own stats." ON public.user_stats FOR UPDATE USING ( auth.uid() = id );
CREATE POLICY "Users can delete their own stats." ON public.user_stats FOR DELETE USING ( auth.uid() = id );

-- 2. Create the delete_user RPC function to allow clients to delete their own account
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Delete from public tables that reference auth.users here if they don't have ON DELETE CASCADE
  DELETE FROM public.user_stats WHERE id = auth.uid();
  
  -- Delete the user from the auth system
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
