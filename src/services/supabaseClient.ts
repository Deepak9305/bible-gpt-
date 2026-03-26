import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

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

// Custom storage for Supabase to use Capacitor Preferences on mobile
const customStorage = {
    getItem: async (key: string) => {
        const { value } = await Preferences.get({ key });
        return value;
    },
    setItem: async (key: string, value: string) => {
        await Preferences.set({ key, value });
    },
    removeItem: async (key: string) => {
        await Preferences.remove({ key });
    },
};

export const supabase = createClient(
    isSupabaseConfigured ? supabaseUrl : 'http://localhost:54321',
    isSupabaseConfigured ? supabaseAnonKey : 'placeholder',
    {
        auth: {
            storage: Capacitor.isNativePlatform() ? customStorage : localStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        }
    }
);

