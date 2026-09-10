import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const MEANING_MODEL = 'openai/gpt-oss-120b';
const MEANING_RATE_LIMIT = 35;
const PREMIUM_STATUSES = new Set(['active', 'in_grace_period', 'canceled']);
const ALLOWED_ORIGINS = new Set([
  'https://biblenova.vercel.app',
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
]);

const setCorsHeaders = (req: any, res: any) => {
  const origin = req.headers?.origin;
  if (typeof origin === 'string' && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
};

const getBearerToken = (req: any) => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
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

const getSupabaseConfig = () => ({
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const hasPremiumAccess = (entitlement: { status?: string | null; expires_at?: string | null } | null) => {
  if (!entitlement || !PREMIUM_STATUSES.has(entitlement.status || '')) return false;
  if (!entitlement.expires_at) return false;
  return Date.parse(entitlement.expires_at) > Date.now();
};

const consumeRateLimit = async (admin: any, userId: string) => {
  const { data, error } = await admin.rpc('consume_chat_rate_limit', {
    p_user_id: userId,
    p_limit: MEANING_RATE_LIMIT,
  });

  if (error) {
    console.warn('[api/verse-meaning] Rate-limit check unavailable', error.message);
    return null;
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result.allowed !== 'boolean') return null;

  return {
    allowed: result.allowed,
    messagesUsed: Number(result.messages_used) || 0,
    retryAfterSeconds: Math.max(1, Number(result.retry_after_seconds) || 60),
  };
};

const SYSTEM_PROMPT = `You are a thoughtful Bible study guide. Explain the meaning of one Bible verse in clear, warm, accessible language.

Rules:
- Stay grounded in the exact verse provided and do not invent historical facts.
- Explain the central idea, spiritual encouragement, and one practical reflection.
- Acknowledge that interpretation can vary when appropriate.
- Keep the answer short: 2 concise paragraphs or a few short bullet points.
- Do not quote a long passage beyond the verse provided.`;

export default async function handler(req: any, res: any) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const accessToken = getBearerToken(req);
  if (!accessToken) return res.status(401).json({ error: 'Sign in with a premium account to use verse meanings.' });

  const { url, serviceRoleKey } = getSupabaseConfig();
  const apiKey = process.env.GROQ_API_KEY;
  if (!url || !serviceRoleKey || !apiKey) {
    return res.status(503).json({ error: 'Verse meaning is not configured on the server yet.' });
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return res.status(401).json({ error: 'Invalid authentication session.' });

  const { data: entitlement, error: entitlementError } = await admin
    .from('premium_entitlements')
    .select('status, expires_at')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (entitlementError) {
    console.error('[api/verse-meaning] Entitlement lookup failed', entitlementError.message);
    return res.status(503).json({ error: 'Premium access could not be checked. Please try again.' });
  }

  if (!hasPremiumAccess(entitlement)) {
    return res.status(403).json({
      error: 'Verse meanings are available with Bible Nova Plus.',
      code: 'PREMIUM_REQUIRED',
    });
  }

  const rateLimit = await consumeRateLimit(admin, userData.user.id);
  if (rateLimit) {
    res.setHeader('X-RateLimit-Limit', String(MEANING_RATE_LIMIT));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, MEANING_RATE_LIMIT - rateLimit.messagesUsed)));
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
      return res.status(429).json({
        error: `Verse meanings are limited to ${MEANING_RATE_LIMIT} requests per minute. Please try again shortly.`,
        code: 'MEANING_RATE_LIMITED',
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }
  }

  const body = getBody(req.body);
  const verse = typeof body?.verse === 'string' ? body.verse.trim() : '';
  const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';

  if (!verse || verse.length > 3000) {
    return res.status(400).json({ error: 'A valid Bible verse is required.' });
  }
  if (!reference || reference.length > 160) {
    return res.status(400).json({ error: 'A valid verse reference is required.' });
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: MEANING_MODEL,
      temperature: 0.45,
      max_tokens: 420,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Reference: ${reference}\nVerse: "${verse}"\n\nGive this verse a little meaning for someone reading it today.`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || '';
    if (!text) return res.status(502).json({ error: 'The verse meaning was empty. Please try again.' });
    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('[api/verse-meaning] Groq request failed', {
      status: error?.status,
      message: error?.message || String(error),
    });
    return res.status(500).json({ error: 'Failed to generate verse meaning.' });
  }
}
