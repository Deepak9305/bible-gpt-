import { Capacitor } from '@capacitor/core';
import {
  Platform,
  ProductType,
  store,
  type IError,
  type Offer,
  type Product,
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

const refreshSnapshot = () => {
  if (!IS_ANDROID_NATIVE) return snapshot;

  const product = getRegisteredProduct();
  const owned = store.owned({ id: PREMIUM_PRODUCT_ID, platform: ANDROID_PLATFORM });
  publish({
    isPremium: pendingPurchaseEntitlement || owned,
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
    .productUpdated(() => refreshSnapshot(), 'bibleNovaPremiumProductUpdated')
    .receiptUpdated(() => refreshSnapshot(), 'bibleNovaPremiumReceiptUpdated')
    .receiptsReady(() => refreshSnapshot(), 'bibleNovaPremiumReceiptsReady')
    .finished(() => refreshSnapshot(), 'bibleNovaPremiumFinished')
    .approved((transaction) => {
      if (!transaction.products.some((product) => product.id === PREMIUM_PRODUCT_ID)) return;

      pendingPurchaseEntitlement = true;
      refreshSnapshot();

      // No server validator is configured in this project yet. Finishing acknowledges
      // the Play purchase; a server-side validator should be added before protecting
      // expensive backend resources with this client-only entitlement.
      void transaction.finish().catch((error) => {
        publish({ error: readableError(error, 'The subscription could not be acknowledged.').message });
      });
    }, 'bibleNovaPremiumApproved')
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
        refreshSnapshot();
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
  pendingPurchaseEntitlement = false;
  refreshSnapshot();
};

export const restorePremiumPurchases = async () => {
  if (!IS_ANDROID_NATIVE) {
    throw new Error('Subscriptions are available in the Android app.');
  }

  await initializePurchases();
  const error = await store.restorePurchases();
  if (error) throw new Error(errorMessage(error, 'Google Play could not restore purchases.'));
  await store.update();
  const next = refreshSnapshot();
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
