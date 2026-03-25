import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL' &&
    supabaseUrl.startsWith('https://')
);

if (!isSupabaseConfigured) {
    console.warn('Supabase is not correctly configured. Auth features will be disabled.');
}

export const supabase = createClient(
    isSupabaseConfigured ? supabaseUrl : 'http://localhost:54321',
    isSupabaseConfigured ? supabaseAnonKey : 'placeholder'
);
