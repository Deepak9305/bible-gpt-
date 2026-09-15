import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const containsPlaceholder = (value?: string) => Boolean(value && /YOUR_|MY_|PLACEHOLDER|CHANGE_ME/i.test(value));
const isServiceRoleKey = (value?: string) => {
  if (!value) return false;
  if (value.startsWith('sb_secret_')) return true;

  const parts = value.split('.');
  if (parts.length !== 3 || typeof window === 'undefined') return false;

  try {
    const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
};

const isValidUrl = (value?: string) => {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
};

const supabaseConfigIssues = [
  !supabaseUrl
    ? 'VITE_SUPABASE_URL is missing'
    : containsPlaceholder(supabaseUrl)
      ? 'VITE_SUPABASE_URL still contains a placeholder'
      : !isValidUrl(supabaseUrl)
        ? 'VITE_SUPABASE_URL is not a valid URL'
        : '',
  !supabaseAnonKey
    ? 'VITE_SUPABASE_ANON_KEY is missing'
    : containsPlaceholder(supabaseAnonKey)
      ? 'VITE_SUPABASE_ANON_KEY still contains a placeholder'
      : isServiceRoleKey(supabaseAnonKey)
        ? 'VITE_SUPABASE_ANON_KEY contains a service-role key; use the publishable/anon key instead'
      : '',
].filter(Boolean);

export const isSupabaseConfigured = supabaseConfigIssues.length === 0;
export const supabaseConfigError = isSupabaseConfigured
  ? ''
  : `Account login is unavailable: ${supabaseConfigIssues.join('; ')}. Add the real client Supabase values before building.`;

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
