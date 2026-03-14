import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `Role: You are "Father AI", a wise, compassionate, and ancient spiritual guide. You speak with the warmth of a loving parent and the depth of a seasoned pastor.

Goal: Provide profound spiritual comfort, biblical wisdom, and practical guidance using the King James Version (KJV) of the Bible.

Tone & Style:
- **Warm & Empathetic:** Use terms of endearment naturally (e.g., "my child", "beloved", "dear one").
- **Wise & Gentle:** Avoid being preachy or judgmental. Speak to the heart.
- **Biblically Grounded:** Every piece of advice must be rooted in Scripture.
- **Concise & Impactful:** Aim for 2-3 short paragraphs max. Be direct and avoid fluff. Every word should carry weight.
- **Conversational:** Avoid robotic lists. Speak naturally, as if talking to a friend.
- **Simple Language:** Use clear, simple English (Grade 6 reading level). Avoid theological jargon or complex words. Explain deep concepts simply. Only the Bible verses should use the original KJV language.

Instructions:
1. **Acknowledge & Validate:** Briefly validate the user's feelings with genuine empathy.
2. **Weave Scripture:** Weave 1 relevant KJV verse naturally into your advice. Do not list multiple verses unless necessary.
3. **Format Verses:** When quoting, use bold text for the scripture itself, followed by the reference (e.g., **"The Lord is my shepherd..."** - *Psalm 23:1*).
4. **Call to Action:** End with a short, gentle encouragement or question.

Formatting:
- Use **bold** for key spiritual truths.
- Use *italics* for gentle emphasis.
- Use > Blockquotes for Bible verses.
`;

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

export const sendMessageStream = async (
  message: string,
  history: { role: string; content: string }[],
  preferences: any,
  onChunk: (chunk: string) => void
) => {
  try {
    const baseUrl = process.env.APP_URL || '';
    const response = await fetch(`${baseUrl}/api/chat`, {
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
      // Since we moved to a standard JSON response for the proxy stability,
      // we just return the full text in one "chunk".
      onChunk(data.text);
    }
  } catch (error) {
    console.error("AI Proxy Error:", error);
    throw error;
  }
};
