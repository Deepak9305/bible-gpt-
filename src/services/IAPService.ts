import { Capacitor } from '@capacitor/core';
import { upgradeToPremium } from './statsService';

// Track whether the store has finished initializing
let storeReady = false;
// Track if initialization failed (for UI feedback)
export let storeInitError = false;

const setupStore = () => {
  const CdvPurchase = (window as any).CdvPurchase;

  // Bug fix: CdvPurchase may not be injected immediately when deviceready fires
  // in a Capacitor/Cordova hybrid. Poll with backoff rather than silently returning.
  if (!CdvPurchase?.store) {
    let attempts = 0;
    const MAX_ATTEMPTS = 75; // 75 × 200ms = 15s total wait
    const poll = setInterval(() => {
      attempts++;
      const cdv = (window as any).CdvPurchase;
      if (cdv?.store) {
        clearInterval(poll);
        runSetup(cdv);
      } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(poll);
        storeInitError = true;
        console.error('IAP: CdvPurchase never became available after 15s. IAP disabled.');
      }
    }, 200);
    return;
  }

  runSetup(CdvPurchase);
};

const runSetup = (CdvPurchase: any) => {
  const store = CdvPurchase.store;
  const Platform = CdvPurchase.Platform;
  const ProductType = CdvPurchase.ProductType;

  // Register the product with explicit platform (required in CdvPurchase v13)
  const platform = Capacitor.getPlatform() === 'ios'
    ? Platform.APPLE_APPSTORE
    : Platform.GOOGLE_PLAY;

  store.register([{
    type: ProductType.PAID_SUBSCRIPTION,
    id: 'biblenova',
    platform,
  }]);

  // Global lifecycle handlers:
  // - approved: finish the transaction immediately (no server validator configured)
  // - finished: transaction is done - unlock premium
  store.when()
    .approved((transaction: any) => {
      transaction.finish();
    })
    .finished((_transaction: any) => {
      upgradeToPremium();
    })
    .error((_err: any) => { });

  // Only call store.update() after the store is ready — not before
  store.ready(() => {
    storeReady = true;
    storeInitError = false;
    console.log('IAP: Store is ready. Products:', store.products.map((p: any) => `${p.id} (${p.type})`));
    store.update();
  });

  store.when().updated((product: any) => {
    console.log(`IAP: Product updated: ${product.id}`, { state: product.state, offers: product.offers?.length });
  });

  // Initialize the store with RSA key for Google Play receipt validation
  store.initialize([
    {
      platform: Platform.GOOGLE_PLAY,
      options: {
        key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA09wkUpHpqHNL5WvGehhonKAz6bQfDqTpDcjtR8/jGPmhJRxb+UlA5ZbqnoWwpwl8P261/79JJbNSNFdF5U85K3YOVoTdFZ7B0sJhJeIzn0ZagpXMA3yyKI6QLNEzxom6px7cFsI7hD0pSvjs7ZfJzwEHokm1m4+olkkMdP0Yfb9x4uiO1lgOpbJNXLC4H3gXNA0AXvoHJcnC+fm0++R5f9eMAQtHrKxpUYAZm9TyTA7d1z+wCHq6i6pp6aCCbaZSDxIro9iAsYitV366B4u796Ppcz2Gh+hFS8tAI+Iy267OHdp9L5fsllxvTgim4QcWZvwqvr4FW+t+XK9RDn1XtwIDAQAB'
      }
    },
    {
      platform: Platform.APPLE_APPSTORE,
    }
  ]);
};

export const initPurchases = () => {
  // Only run on native — CdvPurchase is injected by Cordova bridge
  if (!Capacitor.isNativePlatform()) return;

  // Cordova plugins are guaranteed available after 'deviceready'.
  // If it already fired, run immediately; otherwise wait for it.
  if ((document as any).__cordovaReady) {
    setupStore();
  } else {
    document.addEventListener('deviceready', () => {
      (document as any).__cordovaReady = true;
      setupStore();
    }, { once: true });
  }
};


export interface ProductPricing {
  yearly: string | null;
  monthly: string | null;
}

export const getProductPricing = (productId: string): ProductPricing => {
  const CdvPurchase = (window as any).CdvPurchase;
  if (!CdvPurchase?.store) return { yearly: null, monthly: null };

  const store = CdvPurchase.store;
  const product = store.get(productId);
  if (!product?.offers) return { yearly: null, monthly: null };

  const findPrice = (basePlanId: string): string | null => {
    const offer = product.offers.find((o: any) => o.id === basePlanId);
    if (!offer?.pricingPhases?.length) return null;
    return offer.pricingPhases[0]?.price || null;
  };

  return {
    yearly: findPrice('yearly'),
    monthly: findPrice('monthly'),
  };
};

export const purchaseProduct = (productId: string, basePlanId?: string): Promise<void> => {
  const CdvPurchase = (window as any).CdvPurchase;

  if (!CdvPurchase?.store) {
    if (Capacitor.isNativePlatform()) {
      return Promise.reject(new Error('Purchasing service is not available. Please restart the app.'));
    }
    return Promise.reject(new Error('In-app purchases are only available in the mobile app.'));
  }

  if (!storeReady) {
    return Promise.reject(new Error('Store is still initializing. Please wait a moment and try again.'));
  }

  const store = CdvPurchase.store;
  const product = store.get(productId);

  if (!product) {
    console.error(`IAP: Product ${productId} not found. Current products in store:`, store.products.map((p: any) => p.id));
    return Promise.reject(new Error('Product not found. Please ensure your app is published and the product is approved in the Play Console.'));
  }

  let offerToOrder: any = product;
  if (basePlanId && product.offers?.length > 0) {
    const offer = product.offers.find((o: any) => o.id === basePlanId);
    if (offer) offerToOrder = offer;
  }

  return new Promise<void>((resolve, reject) => {
    let resolved = false;
    let pendingTransactionId: string | null = null;

    const subscriber = store.when()
      .productId(productId)
      .approved((transaction: any) => {
        if (!resolved) {
          resolved = true;
          try { subscriber.cancel?.(); } catch (_) { }
          resolve();
        }
      })
      .owned((product: any) => {
        if (!resolved) {
          resolved = true;
          try { subscriber.cancel?.(); } catch (_) { }
          resolve();
        }
      })
      .cancelled(() => {
        if (!resolved) {
          resolved = true;
          try { subscriber.cancel?.(); } catch (_) { }
          reject(new Error('Purchase was cancelled.'));
        }
      })
      .error((err: any) => {
        if (!resolved) {
          resolved = true;
          try { subscriber.cancel?.(); } catch (_) { }
          reject(new Error(err?.message || 'Purchase failed.'));
        }
      });

    store.order(offerToOrder)
      .then((error: any) => {
        if (error && !resolved) {
          resolved = true;
          try { subscriber.cancel?.(); } catch (_) { }
          reject(new Error(error?.message || 'Failed to initiate purchase.'));
        }
      })
      .catch((e: any) => {
        if (!resolved) {
          resolved = true;
          try { subscriber.cancel?.(); } catch (_) { }
          reject(e);
        }
      });
  });
};

export const restorePurchases = (): Promise<void> => {
  const CdvPurchase = (window as any).CdvPurchase;

  if (!CdvPurchase?.store) {
    return Promise.reject(new Error('In-app purchases are only available in the mobile app.'));
  }

  if (!storeReady) {
    return Promise.reject(new Error('Store is still initializing. Please wait a moment and try again.'));
  }

  return CdvPurchase.store.restorePurchases();
};
