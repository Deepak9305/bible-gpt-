import { Capacitor } from '@capacitor/core';
import { upgradeToPremium } from './statsService';


// Store the CdvPurchase reference once it's ready
let storeReady = false;

export const initPurchases = () => {
  // CdvPurchase v13 attaches to window.CdvPurchase (not window.store)
  const CdvPurchase = (window as any).CdvPurchase;

  if (!CdvPurchase?.store) {
    console.warn('[PurchaseService] CdvPurchase not available. Running in web?');
    return;
  }

  const store = CdvPurchase.store;
  const Platform = CdvPurchase.Platform;
  const ProductType = CdvPurchase.ProductType;

  // BUG FIX #2: Register with explicit platform — required in CdvPurchase v13
  const platform = Capacitor.getPlatform() === 'ios'
    ? Platform.APPLE_APPSTORE
    : Platform.GOOGLE_PLAY;

  // BUG FIX #1 & #2: Use correct ProductType from CdvPurchase namespace + include platform
  store.register([{
    type: ProductType.PAID_SUBSCRIPTION,
    id: 'biblenova',
    platform,
  }]);

  // BUG FIX #3: No receipt validator is configured, so call finish() directly
  // instead of verify() which would auto-reject without a server endpoint.
  store.when()
    .approved((transaction: any) => {
      console.log('[PurchaseService] Transaction approved, finishing:', transaction.transactionId);
      transaction.finish();
    })
    .finished((transaction: any) => {
      console.log('[PurchaseService] Transaction finished, unlocking premium:', transaction.transactionId);
      upgradeToPremium();
    })
    .productUpdated(() => {
      console.log('[PurchaseService] Product updated');
    })
    .error((err: any) => {
      console.error('[PurchaseService] Store error:', err?.code, err?.message);
    });

  // BUG FIX #4: Call store.update() only after the store signals it is ready
  store.ready(() => {
    storeReady = true;
    console.log('[PurchaseService] Store is ready, fetching products...');
    store.update();
  });

  // Initialize the store — this triggers the ready() callback above when done
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
    const phase = offer.pricingPhases[0];
    return phase?.price || null;
  };

  return {
    yearly: findPrice('yearly'),
    monthly: findPrice('monthly'),
  };
};

export const purchaseProduct = (productId: string, basePlanId?: string) => {
  const CdvPurchase = (window as any).CdvPurchase;

  if (!CdvPurchase?.store) {
    if (Capacitor.isNativePlatform()) {
      return Promise.reject(new Error('Purchasing service is not available. Please restart the app.'));
    } else {
      return Promise.reject(new Error('In-app purchases are only available in the mobile app.'));
    }
  }

  return new Promise((resolve, reject) => {
    const store = CdvPurchase.store;

    if (!storeReady) {
      return reject(new Error('Store is still initializing. Please wait a moment and try again.'));
    }

    const product = store.get(productId);
    if (!product) {
      console.error(`[PurchaseService] Product '${productId}' not found.`);
      return reject(new Error(`Product not found. Please ensure your Google Play app is published and the product is approved.`));
    }

    let offerToOrder: any = product;
    if (basePlanId && product.offers?.length > 0) {
      const offer = product.offers.find((o: any) => o.id === basePlanId);
      if (offer) offerToOrder = offer;
    }

    let resolved = false;

    // Listen for the finished event (called after approved > finish())
    const finishedUnsub = store.when()
      .productId(productId)
      .finished((_transaction: any) => {
        if (!resolved) {
          resolved = true;
          finishedUnsub?.();
          cancelledUnsub?.();
          resolve(true);
        }
      });

    const cancelledUnsub = store.when()
      .productId(productId)
      .cancelled(() => {
        if (!resolved) {
          resolved = true;
          finishedUnsub?.();
          cancelledUnsub?.();
          reject(new Error('Purchase was cancelled.'));
        }
      });

    store.order(offerToOrder).then((error: any) => {
      if (error && !resolved) {
        resolved = true;
        finishedUnsub?.();
        cancelledUnsub?.();
        reject(new Error(error?.message || 'Failed to initiate purchase.'));
      }
    }).catch((e: any) => {
      if (!resolved) {
        resolved = true;
        finishedUnsub?.();
        cancelledUnsub?.();
        reject(e);
      }
    });
  });
};

