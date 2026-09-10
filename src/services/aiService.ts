import { Capacitor } from "@capacitor/core";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const getApiUrl = () => {
  const baseUrl = (
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_SITE_URL ||
    'https://biblenova.vercel.app'
  ).replace(/\/$/, '');
  if (Capacitor.isNativePlatform()) {
    return `${baseUrl}/api/chat`;
  }
  return '/api/chat';
};

export const sendMessageStream = async (
  message: string,
  history: { role: string; content: string }[],
  preferences: any,
  onChunk: (chunk: string) => void
) => {
  try {
    const { data: { session } } = isSupabaseConfigured
      ? await supabase.auth.getSession()
      : { data: { session: null } };

    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ message, history, preferences }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = 'Failed to fetch AI response';
      let errorData: { error?: string; retryAfterSeconds?: number } | null = null;
      try {
        errorData = JSON.parse(errorBody) as { error?: string; retryAfterSeconds?: number };
        errorMessage = errorData.error || errorMessage;
      } catch {
        if (errorBody) errorMessage = errorBody;
      }
      const requestError = new Error(errorMessage) as Error & {
        status?: number;
        retryAfterSeconds?: number;
      };
      requestError.status = response.status;
      requestError.retryAfterSeconds = errorData?.retryAfterSeconds;
      throw requestError;
    }

    const data = await response.json();

    if (data.text) {
      onChunk(data.text);
    }
  } catch (error) {
    console.error("AI Proxy Error:", error);
    throw error;
  }
};
