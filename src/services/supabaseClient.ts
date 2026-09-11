import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const containsPlaceholder = (value?: string) => Boolean(value && /YOUR_|MY_|PLACEHOLDER/i.test(value));

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !containsPlaceholder(supabaseUrl) &&
    !containsPlaceholder(supabaseAnonKey),
);

// Supabase sessions need to survive an Android process restart. Capacitor
// Preferences provides that persistence on native while localStorage keeps the
// web build lightweight.
const capacitorStorage = {
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
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      storage: Capacitor.isNativePlatform() ? capacitorStorage : localStorage,
      autoRefreshToken: true,
      persistSession: true,
      // The AuthProvider explicitly exchanges the browser PKCE callback before
      // routing. This prevents HashRouter and Supabase initialization from
      // racing over the one-time OAuth code.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);
