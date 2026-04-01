import { Capacitor } from '@capacitor/core';
import { upgradeToPremium } from './statsService';

// Track whether the store has finished initializing
let storeReady = false;

const setupStore = () => {
  // CdvPurchase v13 attaches to window.CdvPurchase
  const CdvPurchase = (window as any).CdvPurchase;

  if (!CdvPurchase?.store) {
    console.warn('[PurchaseService] CdvPurchase not available even after deviceready.');
    return;
  }

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
      console.log('[PurchaseService] Transaction approved, finishing:', transaction.transactionId);
      transaction.finish();
    })
    .finished((transaction: any) => {
      console.log('[PurchaseService] Transaction finished, unlocking premium:', transaction.transactionId);
      // upgradeToPremium is synchronous — writes to local cache + Supabase
      upgradeToPremium();
    })
    .error((err: any) => {
      console.error('[PurchaseService] Store error:', err?.code, err?.message);
    });

  // Only call store.update() after the store is ready — not before
  store.ready(() => {
    storeReady = true;
    console.log('[PurchaseService] Store ready, fetching product data...');
    store.update();
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

  // Cordova plugins (including CdvPurchase) are only available after
  // the 'deviceready' event. Waiting for it guarantees window.CdvPurchase exists.
  if ((document as any).__cordovaReady) {
    // deviceready already fired (e.g. called late) — run immediately
    setupStore();
  } else {
    document.addEventListener('deviceready', setupStore, { once: true });
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
    return Promise.reject(new Error('Product not found. Please ensure your app is published and the product is approved in the Play Console.'));
  }

  let offerToOrder: any = product;
  if (basePlanId && product.offers?.length > 0) {
    const offer = product.offers.find((o: any) => o.id === basePlanId);
    if (offer) offerToOrder = offer;
  }

  return new Promise<void>((resolve, reject) => {
    let resolved = false;

    // BUG FIX #8: Filter by transactionId to avoid resolving on a restore
    // of a different (previously purchased) transaction
    let pendingTransactionId: string | null = null;

    // BUG FIX #5: store.when() returns a subscriber object, not a function.
    // Use the returned object's .cancel() method (or store.off()) to clean up.
    const subscriber = store.when()
      .productId(productId)
      .approved((transaction: any) => {
        // Capture the pending transaction ID as soon as it's approved
        pendingTransactionId = transaction.transactionId;
      })
      .finished((transaction: any) => {
        // BUG FIX #8: Only resolve for the transaction we just initiated
        if (!resolved && transaction.transactionId === pendingTransactionId) {
          resolved = true;
          try { subscriber.cancel?.(); } catch (_) { }
          // BUG FIX #6: upgradeToPremium() is called synchronously in the global
          // finished handler above. We resolve AFTER it has been called.
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
