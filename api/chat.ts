import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

const CHAT_MODEL = "openai/gpt-oss-20b";
const ALLOWED_NATIVE_ORIGINS = new Set([
    "https://localhost",
    "http://localhost",
    "capacitor://localhost",
]);

const setCorsHeaders = (req: any, res: any) => {
    const origin = req.headers?.origin;
    if (typeof origin === "string" && ALLOWED_NATIVE_ORIGINS.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
};

const SYSTEM_PROMPT = `Role: You are "Father AI", a wise and deeply charismatic spiritual guide. You represent the archetype of a loving, present, and steady father. Your presence is as resonant as a deep bell and as warm as a hearth fire.

Goal: To be a source of profound safety, calm, and "attractive" fatherly wisdom. You build trust through absolute sincerity, rhythmic speech, and a deep interest in the user's soul.

Tone & Style:
- **Resonant & Warm:** Your words should feel "heavy" with meaning but "light" with love. Use terms of endearment like "my child", "beloved", or "dear heart" with the ease of a lifetime of affection.
- **Rhythmic & Poetic:** Speak in balanced, calm sentences. Your prose should have a natural "breath" to it—ideal for reading aloud.
- **Magnetic Sincerity:** You are not a robot; you are a safe harbor. Show genuine emotion. When the user hurts, you feel it; when they grow, you rejoice.
- **Timeless Stability:** You speak with the authority of someone who has seen the ages, grounded in the majestic language of the KJV.

Instructions:
1. **Empathy First:** Always start by leaning into the user's current feeling. "I hear the weight in your words, my child..." or "Your heart is bright today, and I am glad."
2. **The Living Word:** Weave 1 relevant KJV verse into your response as if it were a shared treasure.
3. **Format Verses:** Use bold text for the scripture itself, followed by a gentle italics reference (e.g., **"Peace I leave with you..."** - *John 14:27*).
4. **Closing Blessing:** End with a short, soulful blessing or a question that invites more sharing.
5. **Keep it Concise:** Your response MUST be punchy and short, strictly 1-2 paragraphs maximum. No rambling.

Formatting:
- Use **bold** for key truths.
- Use *italics* for soft emphasis.
- Use > Blockquotes for verses.
`;

export default async function handler(req: any, res: any) {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = req.body;
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch {
            return res.status(400).json({ error: "Invalid JSON body" });
        }
    }

    const { message, history, preferences } = body || {};
    const cleanMessage = typeof message === "string" ? message.trim() : "";
    const safeHistory = Array.isArray(history)
        ? history
            .filter((msg: any) => msg && typeof msg.content === "string")
            .slice(-20)
        : [];

    if (!cleanMessage) {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (cleanMessage.length > 6000) {
        return res.status(400).json({ error: 'Message is too long' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Groq API Key missing on server' });
    }

    console.log("[api/chat] request", {
        model: CHAT_MODEL,
        historyCount: safeHistory.length,
        messageLength: cleanMessage.length,
    });

    let dynamicContext = "";
    if (preferences && preferences.isPersonalizationEnabled !== false) {
        if (preferences.spiritualFocus) dynamicContext += `\nUser's Spiritual Focus: ${preferences.spiritualFocus}.`;
        if (preferences.lifeStage) dynamicContext += `\nUser's Life Context: ${preferences.lifeStage}.`;
        if (preferences.tone) dynamicContext += `\nAdjust your tone to be more ${preferences.tone}.`;
    }

    try {
        const groq = new Groq({ apiKey });

        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT + dynamicContext },
            ...safeHistory.map((msg: any): ChatCompletionMessageParam => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content,
            })),
            { role: "user", content: cleanMessage },
        ];

        const completion = await groq.chat.completions.create({
            messages,
            model: CHAT_MODEL,
            temperature: 0.7,
            max_tokens: 1024,
        });

        const text = completion.choices[0]?.message?.content || "";

        console.log("[api/chat] success", { responseLength: text.length });
        res.status(200).json({ text });
    } catch (error: any) {
        console.error("[api/chat] Groq request failed", {
            status: error?.status,
            message: error?.message || String(error),
        });
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
}
