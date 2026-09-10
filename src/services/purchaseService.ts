import { Capacitor } from '@capacitor/core';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import {
  Platform,
  ProductType,
  store,
  type IError,
  type Offer,
  type Product,
  type Transaction,
} from 'capacitor-plugin-cdv-purchase';

export const PREMIUM_PRODUCT_ID = 'biblenova';
export const PREMIUM_BASE_PLANS = {
  monthly: 'monthly',
  yearly: 'yearly',
} as const;

export type PremiumPlan = keyof typeof PREMIUM_BASE_PLANS;

export interface PremiumPlanDetails {
  id: PremiumPlan;
  price: string | null;
  available: boolean;
  offerId: string | null;
}

export interface PremiumSnapshot {
  isPremium: boolean;
  isReady: boolean;
  isAvailable: boolean;
  plans: PremiumPlanDetails[];
  error: string | null;
}

const ANDROID_PLATFORM = Platform.GOOGLE_PLAY;
const IS_ANDROID_NATIVE = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

// This is the public Google Play licensing key for Bible Nova. It is safe to
// embed in the app binary; the private signing key must remain in Play Console.
const GOOGLE_PLAY_BASE64_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA09wkUpHpqHNL5WvGehhonKAz6bQfDqTpDcjtR8/jGPmhJRxb+UlA5ZbqnoWwpwl8P261/79JJbNSNFdF5U85K3YOVoTdFZ7B0sJhJeIzn0ZagpXMA3yyKI6QLNEzxom6px7cFsI7hD0pSvjs7ZfJzwEHokm1m4+olkkMdP0Yfb9x4uiO1lgOpbJNXLC4H3gXNA0AXvoHJcnC+fm0++R5f9eMAQtHrKxpUYAZm9TyTA7d1z+wCHq6i6pp6aCCbaZSDxIro9iAsYitV366B4u796Ppcz2Gh+hFS8tAI+Iy267OHdp9L5fsllxvTgim4QcWZvwqvr4FW+t+XK9RDn1XtwIDAQAB';
const GOOGLE_PLAY_SIGNATURE_ALGORITHM: RsaHashedImportParams = {
  name: 'RSASSA-PKCS1-v1_5',
  hash: 'SHA-1',
};

interface GooglePlayNativePurchase {
  receipt?: string;
  signature?: string;
  purchaseToken?: string;
}

type GooglePlayTransaction = Transaction & {
  nativePurchase?: GooglePlayNativePurchase;
};

const emptyPlans = (): PremiumPlanDetails[] =>
  (Object.keys(PREMIUM_BASE_PLANS) as PremiumPlan[]).map((id) => ({
    id,
    price: null,
    available: false,
    offerId: null,
  }));

let snapshot: PremiumSnapshot = {
  isPremium: false,
  isReady: !IS_ANDROID_NATIVE,
  isAvailable: false,
  plans: emptyPlans(),
  error: null,
};

let initializationPromise: Promise<PremiumSnapshot> | null = null;
const listeners = new Set<(value: PremiumSnapshot) => void>();
let listenersRegistered = false;
let pendingPurchaseEntitlement = false;
let googlePlayPublicKeyPromise: Promise<CryptoKey> | null = null;
const purchaseVerificationCache = new Map<string, boolean>();

interface PurchaseWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const purchaseWaiters = new Set<PurchaseWaiter>();

const readableError = (error: unknown, fallback: string): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string' && error.trim()) return new Error(error);

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return new Error(message);
  }

  return new Error(fallback);
};

const errorMessage = (error: IError | undefined, fallback: string) =>
  error?.message?.trim() || fallback;

const publish = (next: Partial<PremiumSnapshot>) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener(snapshot));

  if (snapshot.isPremium) {
    purchaseWaiters.forEach((waiter) => {
      clearTimeout(waiter.timeoutId);
      waiter.resolve();
      purchaseWaiters.delete(waiter);
    });
  }
};

const getRegisteredProduct = (): Product | undefined =>
  store.get(PREMIUM_PRODUCT_ID, ANDROID_PLATFORM);

const getPremiumVerificationUrl = () => {
  const baseUrl = (
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_APP_URL ||
    'https://biblenova.vercel.app'
  ).replace(/\/$/, '');
  return `${baseUrl}/api/premium/verify`;
};

const getPlanOffer = (product: Product, plan: PremiumPlan): Offer | undefined => {
  const basePlanId = PREMIUM_BASE_PLANS[plan];
  const exactOfferId = `${PREMIUM_PRODUCT_ID}@${basePlanId}`;

  return product.offers.find((offer) => offer.id === exactOfferId)
    ?? product.offers.find((offer) => offer.id.endsWith(`@${basePlanId}`));
};

const getRecurringPrice = (offer: Offer): string | null => {
  const phase = offer.pricingPhases.find((item) => item.paymentMode !== 'FreeTrial')
    ?? offer.pricingPhases[0];
  return phase?.price || null;
};

const readPlans = (product: Product | undefined): PremiumPlanDetails[] =>
  (Object.keys(PREMIUM_BASE_PLANS) as PremiumPlan[]).map((id) => {
    const offer = product ? getPlanOffer(product, id) : undefined;
    return {
      id,
      price: offer ? getRecurringPrice(offer) : null,
      available: Boolean(offer?.canPurchase),
      offerId: offer?.id || null,
    };
  });

const base64ToBytes = (value: string) => {
  const binary = atob(value.replace(/\s+/g, ''));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const getGooglePlayPublicKey = async (): Promise<CryptoKey> => {
  if (!googlePlayPublicKeyPromise) {
    googlePlayPublicKeyPromise = crypto.subtle.importKey(
      'spki',
      base64ToBytes(GOOGLE_PLAY_BASE64_PUBLIC_KEY),
      GOOGLE_PLAY_SIGNATURE_ALGORITHM,
      false,
      ['verify'],
    );
  }

  return googlePlayPublicKeyPromise;
};

const verifyGooglePlayTransaction = async (transaction: Transaction) => {
  const nativePurchase = (transaction as GooglePlayTransaction).nativePurchase;
  const receipt = nativePurchase?.receipt;
  const signature = nativePurchase?.signature;

  if (!receipt || !signature) return false;

  const cacheKey = `${transaction.transactionId}:${receipt}:${signature}`;
  const cachedResult = purchaseVerificationCache.get(cacheKey);
  if (cachedResult !== undefined) return cachedResult;

  try {
    const publicKey = await getGooglePlayPublicKey();
    const verified = await crypto.subtle.verify(
      GOOGLE_PLAY_SIGNATURE_ALGORITHM,
      publicKey,
      base64ToBytes(signature),
      new TextEncoder().encode(receipt),
    );
    purchaseVerificationCache.set(cacheKey, verified);
    return verified;
  } catch (error) {
    console.warn('Google Play purchase signature verification failed.', error);
    purchaseVerificationCache.set(cacheKey, false);
    return false;
  }
};

const syncPurchaseWithServer = async (transaction: Transaction) => {
  if (!isSupabaseConfigured) return;

  const purchaseToken = (transaction as GooglePlayTransaction).nativePurchase?.purchaseToken;
  if (!purchaseToken) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  try {
    const response = await fetch(getPremiumVerificationUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: PREMIUM_PRODUCT_ID,
        purchaseToken,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      console.warn('Premium server sync unavailable:', body?.error || response.statusText);
    }
  } catch (error) {
    console.warn('Premium server sync failed:', error);
  }
};

const hasVerifiedActivePremiumPurchase = async () => {
  const owned = store.owned({ id: PREMIUM_PRODUCT_ID, platform: ANDROID_PLATFORM });
  if (!owned) return false;

  const transactions = store.localTransactions.filter((transaction) =>
    transaction.products.some((product) => product.id === PREMIUM_PRODUCT_ID),
  );

  for (const transaction of transactions) {
    const isActive =
      !transaction.isPending &&
      !transaction.isConsumed &&
      transaction.state !== 'cancelled' &&
      (!transaction.expirationDate || transaction.expirationDate.getTime() > Date.now());

    if (isActive && await verifyGooglePlayTransaction(transaction)) {
      void syncPurchaseWithServer(transaction);
      return true;
    }
  }

  return false;
};

const refreshSnapshot = async () => {
  if (!IS_ANDROID_NATIVE) return snapshot;

  const product = getRegisteredProduct();
  const verifiedOwned = await hasVerifiedActivePremiumPurchase();
  publish({
    isPremium: pendingPurchaseEntitlement || verifiedOwned,
    isReady: store.isReady,
    isAvailable: Boolean(product),
    plans: readPlans(product),
  });

  return snapshot;
};

const rejectPurchaseWaiters = (error: Error) => {
  purchaseWaiters.forEach((waiter) => {
    clearTimeout(waiter.timeoutId);
    waiter.reject(error);
    purchaseWaiters.delete(waiter);
  });
};

const handleApprovedTransaction = async (transaction: Transaction) => {
  if (!transaction.products.some((product) => product.id === PREMIUM_PRODUCT_ID)) return;

  const verified = await verifyGooglePlayTransaction(transaction);
  if (!verified) {
    const error = new Error('Google Play purchase signature could not be verified.');
    publish({ error: error.message });
    rejectPurchaseWaiters(error);
    return;
  }

  pendingPurchaseEntitlement = true;
  void syncPurchaseWithServer(transaction);
  await refreshSnapshot();

  try {
    await transaction.finish();
  } catch (error) {
    publish({ error: readableError(error, 'The subscription could not be acknowledged.').message });
  } finally {
    pendingPurchaseEntitlement = false;
    await refreshSnapshot();
  }
};

const waitForPremium = () => {
  if (snapshot.isPremium) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      purchaseWaiters.delete(waiter);
      reject(new Error('Google Play did not confirm the subscription. If you completed payment, use Restore purchases.'));
    }, 120_000);
    const waiter: PurchaseWaiter = { resolve, reject, timeoutId };
    purchaseWaiters.add(waiter);
  });
};

const registerStoreListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  store.when()
    .productUpdated(() => { void refreshSnapshot(); }, 'bibleNovaPremiumProductUpdated')
    .receiptUpdated(() => { void refreshSnapshot(); }, 'bibleNovaPremiumReceiptUpdated')
    .receiptsReady(() => { void refreshSnapshot(); }, 'bibleNovaPremiumReceiptsReady')
    .finished(() => { void refreshSnapshot(); }, 'bibleNovaPremiumFinished')
    .approved((transaction) => { void handleApprovedTransaction(transaction); }, 'bibleNovaPremiumApproved')
    .pending((transaction) => {
      if (transaction.products.some((product) => product.id === PREMIUM_PRODUCT_ID)) {
        publish({ error: 'The payment is pending in Google Play.' });
      }
    }, 'bibleNovaPremiumPending');

  store.error((error) => {
    if (error.platform === ANDROID_PLATFORM || error.productId === PREMIUM_PRODUCT_ID) {
      const message = errorMessage(error, 'Google Play could not complete the subscription.');
      publish({ error: message });
      rejectPurchaseWaiters(new Error(message));
    }
  });
};

export const isPremiumPurchaseSupported = () => IS_ANDROID_NATIVE;

export const subscribePurchaseState = (listener: (value: PremiumSnapshot) => void) => {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
};

export const getPurchaseSnapshot = () => snapshot;

export const initializePurchases = async (): Promise<PremiumSnapshot> => {
  if (!IS_ANDROID_NATIVE) return snapshot;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      store.verbosity = 1;
      store.register({
        id: PREMIUM_PRODUCT_ID,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: ANDROID_PLATFORM,
        group: PREMIUM_PRODUCT_ID,
      });
      registerStoreListeners();

      const errors = await store.initialize([ANDROID_PLATFORM]);
      const initializationError = errors.find(Boolean);
      if (initializationError) {
        publish({
          isReady: true,
          isAvailable: false,
          plans: emptyPlans(),
          error: errorMessage(initializationError, 'Google Play subscriptions are unavailable on this device.'),
        });
      } else {
        publish({ isReady: true, error: null });
        await refreshSnapshot();
      }

      return snapshot;
    } catch (error) {
      const normalized = readableError(error, 'Google Play subscriptions are unavailable.');
      publish({ isReady: true, isAvailable: false, plans: emptyPlans(), error: normalized.message });
      return snapshot;
    }
  })();

  return initializationPromise;
};

export const refreshPremiumState = async () => {
  if (!IS_ANDROID_NATIVE) return snapshot;
  await initializePurchases();
  await store.update();
  return refreshSnapshot();
};

export const purchasePremiumPlan = async (plan: PremiumPlan) => {
  if (!IS_ANDROID_NATIVE) {
    throw new Error('Subscriptions are available in the Android app.');
  }

  await initializePurchases();
  const product = getRegisteredProduct();
  const offer = product ? getPlanOffer(product, plan) : undefined;

  if (!offer) {
    throw new Error(`Google Play did not return the ${plan} subscription. Check that this base plan is active.`);
  }
  if (!offer.canPurchase) {
    throw new Error('This subscription is not available for purchase right now.');
  }

  publish({ error: null });
  const completion = waitForPremium();
  let error: IError | undefined;
  try {
    error = await offer.order();
  } catch (orderError) {
    const normalized = readableError(orderError, 'Google Play could not start the subscription.');
    rejectPurchaseWaiters(normalized);
    throw normalized;
  }
  if (error) {
    const normalized = new Error(errorMessage(error, 'Google Play could not start the subscription.'));
    rejectPurchaseWaiters(normalized);
    throw normalized;
  }

  await completion;
  await refreshSnapshot();
};

export const restorePremiumPurchases = async () => {
  if (!IS_ANDROID_NATIVE) {
    throw new Error('Subscriptions are available in the Android app.');
  }

  await initializePurchases();
  const error = await store.restorePurchases();
  if (error) throw new Error(errorMessage(error, 'Google Play could not restore purchases.'));
  await store.update();
  const next = await refreshSnapshot();
  if (!next.isPremium) throw new Error('No active Bible Nova subscription was found for this Google Play account.');
};

export const managePremiumSubscription = async () => {
  if (!IS_ANDROID_NATIVE) {
    throw new Error('Subscriptions are managed in Google Play on Android.');
  }

  await initializePurchases();
  const error = await store.manageSubscriptions(ANDROID_PLATFORM);
  if (error) throw new Error(errorMessage(error, 'Google Play could not open subscription management.'));
};
