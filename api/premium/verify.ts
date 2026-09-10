import { createSign } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const PREMIUM_PRODUCT_ID = 'biblenova';
const DEFAULT_PACKAGE_NAME = 'com.biblenova.app';
const GOOGLE_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SUBSCRIPTION_URL = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

type GoogleServiceAccount = {
  client_email?: unknown;
  private_key?: unknown;
  token_uri?: unknown;
};

type GoogleSubscription = {
  subscriptionState?: string;
  acknowledgementState?: string;
  latestOrderId?: string;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
    offerDetails?: { basePlanId?: string; offerId?: string };
  }>;
};

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const ALLOWED_ORIGINS = new Set([
  'https://biblenova.vercel.app',
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
]);

const jsonError = (res: ApiResponse, status: number, error: string) => {
  res.status(status).json({ error });
};

const base64UrlEncode = (value: string | Buffer) =>
  Buffer.from(value).toString('base64url');

const getBearerToken = (req: ApiRequest) => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
};

const getJsonBody = (body: unknown): Record<string, unknown> | null => {
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

const getServiceAccount = (): GoogleServiceAccount | null => {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GoogleServiceAccount;
    if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};

const getGoogleAccessToken = async (serviceAccount: GoogleServiceAccount) => {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = typeof serviceAccount.token_uri === 'string' && serviceAccount.token_uri.startsWith('https://')
    ? serviceAccount.token_uri
    : GOOGLE_TOKEN_URL;
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64UrlEncode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: GOOGLE_PUBLISHER_SCOPE,
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${signer.sign(serviceAccount.private_key as string, 'base64url')}`;

  const tokenResponse = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenResponse.ok) {
    console.error('[api/premium/verify] Google OAuth failed', { status: tokenResponse.status });
    throw new Error('Google Play authorization failed.');
  }

  const tokenBody = await tokenResponse.json() as { access_token?: string };
  if (!tokenBody.access_token) throw new Error('Google Play authorization returned no access token.');
  return tokenBody.access_token;
};

const hasPremiumAccess = (subscription: GoogleSubscription, expiresAt: Date | null) => {
  if (!expiresAt || expiresAt.getTime() <= Date.now()) return false;
  return ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED']
    .includes(subscription.subscriptionState || '');
};

const toDatabaseStatus = (state: string | undefined) =>
  ({
    SUBSCRIPTION_STATE_PENDING: 'pending',
    SUBSCRIPTION_STATE_ACTIVE: 'active',
    SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'in_grace_period',
    SUBSCRIPTION_STATE_ON_HOLD: 'on_hold',
    SUBSCRIPTION_STATE_PAUSED: 'paused',
    SUBSCRIPTION_STATE_CANCELED: 'canceled',
    SUBSCRIPTION_STATE_EXPIRED: 'expired',
    SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'revoked',
  } as Record<string, string>)[state || ''] || 'revoked';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers?.origin;
  if (typeof origin === 'string' && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).json({});
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  const accessToken = getBearerToken(req);
  if (!accessToken) return jsonError(res, 401, 'Authentication required');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceAccount = getServiceAccount();
  if (!supabaseUrl || !serviceRoleKey || !serviceAccount) {
    return jsonError(res, 503, 'Premium verification is not configured on the server yet.');
  }

  const body = getJsonBody(req.body);
  const purchaseToken = typeof body?.purchaseToken === 'string' ? body.purchaseToken.trim() : '';
  const productId = typeof body?.productId === 'string' ? body.productId.trim() : '';
  if (!purchaseToken || purchaseToken.length > 4096 || productId !== PREMIUM_PRODUCT_ID) {
    return jsonError(res, 400, 'A valid Bible Nova purchase is required.');
  }

  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || DEFAULT_PACKAGE_NAME;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return jsonError(res, 401, 'Invalid authentication session.');

  try {
    const googleAccessToken = await getGoogleAccessToken(serviceAccount);
    const purchaseUrl = `${GOOGLE_SUBSCRIPTION_URL}/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const googleResponse = await fetch(purchaseUrl, {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });

    if (!googleResponse.ok) {
      console.warn('[api/premium/verify] Google Play rejected purchase', { status: googleResponse.status });
      return jsonError(res, googleResponse.status === 404 ? 400 : 502, 'Google Play could not verify this purchase.');
    }

    const subscription = await googleResponse.json() as GoogleSubscription;
    const lineItem = subscription.lineItems?.find((item) => item.productId === PREMIUM_PRODUCT_ID);
    if (!lineItem) return jsonError(res, 400, 'This purchase does not belong to Bible Nova.');

    const expiresAt = lineItem.expiryTime ? new Date(lineItem.expiryTime) : null;
    const isPremium = hasPremiumAccess(subscription, expiresAt);
    const status = toDatabaseStatus(subscription.subscriptionState);
    const now = new Date().toISOString();

    // Insert first and ignore an existing token. This prevents two accounts
    // racing to claim the same Play purchase from overwriting its owner.
    const { error: tokenInsertError } = await admin.from('premium_purchase_tokens').insert({
      purchase_token: purchaseToken,
      user_id: userData.user.id,
      product_id: PREMIUM_PRODUCT_ID,
      package_name: packageName,
    });
    if (tokenInsertError && tokenInsertError.code !== '23505') throw tokenInsertError;

    const { data: storedToken, error: storedTokenError } = await admin
      .from('premium_purchase_tokens')
      .select('user_id')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();
    if (storedTokenError) throw storedTokenError;
    if (storedToken?.user_id !== userData.user.id) {
      return jsonError(res, 409, 'This Google Play purchase is linked to another account.');
    }

    const { error: tokenUpdateError } = await admin.from('premium_purchase_tokens')
      .update({ latest_order_id: subscription.latestOrderId || null, updated_at: now })
      .eq('purchase_token', purchaseToken);
    if (tokenUpdateError) throw tokenUpdateError;

    const { error: entitlementError } = await admin.from('premium_entitlements').upsert({
      user_id: userData.user.id,
      product_id: PREMIUM_PRODUCT_ID,
      base_plan_id: lineItem.offerDetails?.basePlanId || null,
      status,
      expires_at: expiresAt?.toISOString() || null,
      auto_renewing: lineItem.autoRenewingPlan?.autoRenewEnabled === true,
      latest_order_id: subscription.latestOrderId || null,
      last_verified_at: now,
      source: 'google_play',
      updated_at: now,
    }, { onConflict: 'user_id' });
    if (entitlementError) throw entitlementError;

    const { error: statsError } = await admin.from('user_stats').upsert({
      id: userData.user.id,
      is_premium: isPremium,
      updated_at: now,
    }, { onConflict: 'id' });
    if (statsError) throw statsError;

    return res.status(200).json({
      isPremium,
      status,
      expiresAt: expiresAt?.toISOString() || null,
      basePlanId: lineItem.offerDetails?.basePlanId || null,
    });
  } catch (error) {
    console.error('[api/premium/verify] verification failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonError(res, 500, 'Premium verification failed.');
  }
}
