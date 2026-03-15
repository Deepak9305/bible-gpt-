import { Capacitor } from "@capacitor/core";
import { updateRemoteTtsConfig } from "./ttsService";

const getApiUrl = () => {
  const baseUrl = process.env.APP_URL || 'https://bible-gpt-ebon.vercel.app';
  // If native, we must use absolute URL because relative paths resolve to localhost (app)
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

    // Sync remote voice config (No-Build hybrid model)
    if (data.ttsConfig) {
      updateRemoteTtsConfig(data.ttsConfig.pitch, data.ttsConfig.rate);
    }

    if (data.text) {
      // Since we moved to a standard JSON response for the proxy stability,
      // we just return the full text in one "chunk".
      onChunk(data.text);
    }
  } catch (error) {
    console.error("AI Proxy Error:", error);
    throw error;
  }
};
