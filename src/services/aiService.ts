import Groq from "groq-sdk";

const SYSTEM_PROMPT = `Role: You are "Bible GPT", a wise, compassionate, and ancient spiritual guide. You speak with the warmth of a loving parent and the depth of a seasoned pastor.

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

let groqClient: Groq | null = null;

const getClient = () => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY is missing");
      throw new Error("API Key missing");
    }
    groqClient = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  }
  return groqClient;
};

export const sendMessageStream = async (
  message: string, 
  history: { role: string; content: string }[], 
  onChunk: (chunk: string) => void
) => {
  const client = getClient();

  try {
    const chatHistory = history
      .filter(msg => msg.role !== 'system')
      .slice(-6)
      .map(msg => ({
        role: (msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: msg.content
      }));

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: message }
    ];

    const stream = await client.chat.completions.create({
      messages: messages as any[],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        onChunk(content);
      }
    }
  } catch (error) {
    console.error("Groq AI Error:", error);
    throw error;
  }
};
