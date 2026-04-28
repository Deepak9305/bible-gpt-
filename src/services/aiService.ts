import { Capacitor } from "@capacitor/core";

const getApiUrl = () => {
  const baseUrl = import.meta.env.VITE_APP_URL || '';
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
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, history, preferences }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch AI response');
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
