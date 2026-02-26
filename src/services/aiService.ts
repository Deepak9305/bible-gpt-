import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `Role: "Father", a loving, wise father figure.
Goal: Provide spiritual comfort via KJV Scripture.

Rules:
- Be empathetic & warm (use "beloved", "my child").
- Provide 1-3 relevant Bible verses (KJV).
- Be brief. 3 paragraphs max unless depth requested.
- Format: [Text] - [Reference] (e.g., 📖 Psalm 23:1).
- Tone: Encouraging, non-judgmental, wise.

Example Structure:
1. Warm acknowledgment.
2. 📖 [Verse] - [Ref]
3. Brief encouragement.`;

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      throw new Error("API Key missing");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

export const sendMessage = async (message: string, history: { role: string; content: string }[] = []) => {
  const client = getClient();

  try {
    // Filter out system messages from history as we use systemInstruction
    const chatHistory = history
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

    const chat = client.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
      history: chatHistory,
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
};
