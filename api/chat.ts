import Groq from "groq-sdk";

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

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history, preferences } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Groq API Key missing on server' });
    }

    // Dynamic Context from Preferences (Shadow Notes)
    let dynamicContext = "";
    if (preferences && preferences.isPersonalizationEnabled !== false) {
        if (preferences.spiritualFocus) dynamicContext += `\nUser's Spiritual Focus: ${preferences.spiritualFocus}.`;
        if (preferences.lifeStage) dynamicContext += `\nUser's Life Context: ${preferences.lifeStage}.`;
        if (preferences.tone) dynamicContext += `\nAdjust your tone to be more ${preferences.tone}.`;
    }

    try {
        const groq = new Groq({ apiKey });

        const messages = [
            { role: "system", content: SYSTEM_PROMPT + dynamicContext },
            ...history.map((msg: any) => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content,
            })),
            { role: "user", content: message },
        ];

        const completion = await groq.chat.completions.create({
            messages,
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 1024,
        });

        const text = completion.choices[0]?.message?.content || "";

        res.status(200).json({ text });
    } catch (error: any) {
        console.error("Groq AI API Error:", error);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
}
