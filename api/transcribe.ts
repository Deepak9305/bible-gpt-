import Groq, { toFile } from 'groq-sdk';

const TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo';
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const ALLOWED_ORIGINS = new Set([
  'https://biblenova.vercel.app',
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
]);

export const config = {
  api: {
    bodyParser: { sizeLimit: '5mb' },
  },
};

const setCorsHeaders = (req: any, res: any) => {
  const origin = req.headers?.origin;
  if (typeof origin === 'string' && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
};

const getBody = (body: unknown): Record<string, unknown> | null => {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }

  return body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : null;
};

const getAudioExtension = (mimeType: string) => {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'webm';
};

export default async function handler(req: any, res: any) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Groq API Key missing on server' });

  const body = getBody(req.body);
  const audioBase64 = typeof body?.audioBase64 === 'string' ? body.audioBase64.trim() : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : 'audio/webm';

  if (!audioBase64 || !/^[a-z0-9+/=]+$/i.test(audioBase64)) {
    return res.status(400).json({ error: 'A valid audio recording is required.' });
  }

  // Keep the JSON request comfortably below Vercel's request body limit.
  if (audioBase64.length > 4_100_000) {
    return res.status(413).json({ error: 'That recording is too large. Please speak for a shorter time.' });
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  if (!audioBuffer.length || audioBuffer.length > MAX_AUDIO_BYTES) {
    return res.status(413).json({ error: 'That recording is too large. Please speak for a shorter time.' });
  }

  try {
    const groq = new Groq({ apiKey });
    const audioFile = await toFile(audioBuffer, `bible-nova-voice.${getAudioExtension(mimeType)}`, { type: mimeType });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: TRANSCRIPTION_MODEL,
      language: 'en',
      prompt: 'Bible Nova, Bible, Jesus, God, prayer, scripture, verse, faith.',
      temperature: 0,
      response_format: 'json',
    });

    const text = transcription.text?.trim() || '';
    if (!text) return res.status(422).json({ error: 'No speech was detected. Please try again.' });
    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('[api/transcribe] Groq transcription failed', {
      status: error?.status,
      message: error?.message || String(error),
    });
    return res.status(500).json({ error: 'Voice transcription failed. Please try again.' });
  }
}
