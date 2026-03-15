import { updateRemoteTtsConfig } from "./ttsService";

export const sendMessageStream = async (
  message: string,
  history: { role: string; content: string }[],
  preferences: any,
  onChunk: (chunk: string) => void
) => {
  try {
    // Use relative path so Vite proxy (in dev) or same-domain (in prod) is used.
    const response = await fetch(`/api/chat`, {
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
