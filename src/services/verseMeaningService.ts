import { Capacitor } from '@capacitor/core';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const getApiUrl = () => {
  const baseUrl = (
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_SITE_URL ||
    'https://biblenova.vercel.app'
  ).replace(/\/$/, '');

  return Capacitor.isNativePlatform() ? `${baseUrl}/api/verse-meaning` : '/api/verse-meaning';
};

export class VerseMeaningError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'VerseMeaningError';
    this.status = status;
    this.code = code;
  }
}

export const getVerseMeaning = async (verse: string, reference: string) => {
  const { data: { session } } = isSupabaseConfigured
    ? await supabase.auth.getSession()
    : { data: { session: null } };

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ verse, reference }),
  });

  const body = await response.json().catch(() => ({})) as {
    text?: string;
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    throw new VerseMeaningError(
      body.error || 'Failed to generate verse meaning.',
      response.status,
      body.code,
    );
  }

  if (!body.text) throw new VerseMeaningError('The verse meaning was empty. Please try again.');
  return body.text;
};
