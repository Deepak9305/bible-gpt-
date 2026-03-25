import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_PROJECT_URL') {
    console.warn('Supabase credentials are not configured in .env. Auth will not work correctly.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
