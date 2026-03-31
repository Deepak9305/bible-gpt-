import { Capacitor } from '@capacitor/core';
import { upgradeToPremium } from './statsService';

// We use the global CdvPurchase object provided by the plugin
export const initPurchases = () => {
  const purchasePlugin = (window as any).CdvPurchase || (window as any).store;

  if (!purchasePlugin) {
    console.warn("CdvPurchase not available. Running in web?");
    return;
  }

  const store = purchasePlugin.store || purchasePlugin;
  const platform = Capacitor.getPlatform() === 'ios' ? purchasePlugin.Platform.APPLE_APPSTORE : purchasePlugin.Platform.GOOGLE_PLAY;

  // Register products
  store.register([{
    type: purchasePlugin.ProductType.PAID_SUBSCRIPTION,
    id: 'biblenova',
    platform: platform,
  }]);

  store.when()
    .approved((transaction: any) => {
      transaction.verify();
    })
    .verified((receipt: any) => {
      receipt.finish();
      // Automatically unlock premium features upon verification
      // This is the ONLY place upgradeToPremium() is called — the per-purchase
      // listener in purchaseProduct() intentionally does NOT call it to avoid duplication.
      upgradeToPremium();
    })
    .error((err: any) => {
      console.error('[PurchaseService] Store error:', err?.code, err?.message);
    });

  // Initialize with the RSA key for Google Play (Android)
  store.initialize([
    {
      platform: purchasePlugin.Platform.GOOGLE_PLAY,
      options: {
        key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA09wkUpHpqHNL5WvGehhonKAz6bQfDqTpDcjtR8/jGPmhJRxb+UlA5ZbqnoWwpwl8P261/79JJbNSNFdF5U85K3YOVoTdFZ7B0sJhJeIzn0ZagpXMA3yyKI6QLNEzxom6px7cFsI7hD0pSvjs7ZfJzwEHokm1m4+olkkMdP0Yfb9x4uiO1lgOpbJNXLC4H3gXNA0AXvoHJcnC+fm0++R5f9eMAQtHrKxpUYAZm9TyTA7d1z+wCHq6i6pp6aCCbaZSDxIro9iAsYitV366B4u796Ppcz2Gh+hFS8tAI+Iy267OHdp9L5fsllxvTgim4QcWZvwqvr4FW+t+XK9RDn1XtwIDAQAB'
      }
    },
    {
      platform: purchasePlugin.Platform.APPLE_APPSTORE
    }
  ]);

  // BUG FIX: Actually connect to the stores and fetch the product data
  store.update();
};

export interface ProductPricing {
  yearly: string | null;
  monthly: string | null;
}

export const getProductPricing = (productId: string): ProductPricing => {
  const purchasePlugin = (window as any).CdvPurchase || (window as any).store;
  if (!purchasePlugin) return { yearly: null, monthly: null };

  const store = purchasePlugin.store || purchasePlugin;
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
  const purchasePlugin = (window as any).CdvPurchase || (window as any).store;

  if (!purchasePlugin) {
    if (Capacitor.isNativePlatform()) {
      return Promise.reject(new Error("Purchasing service is not available on this device. Please check your connection or restart the app."));
    } else {
      // On web there is no real payment flow — reject so the UI shows an error
      // instead of silently granting free premium.
      return Promise.reject(new Error("In-app purchases are not available on the web. Please use the mobile app."));
    }
  }

  return new Promise((resolve, reject) => {
    const store = purchasePlugin.store || purchasePlugin;
    const product = store.get(productId);
    if (!product) {
      reject(new Error("Product not found"));
      return;
    }

    let offerToOrder = product;
    if (basePlanId && product.offers && product.offers.length > 0) {
      // Find the specific base plan offer
      const offer = product.offers.find((o: any) => o.id === basePlanId);
      if (offer) {
        offerToOrder = offer;
      }
    }

    let resolved = false;
    let unsubscribe: (() => void) | null = null;

    const cleanup = () => {
      if (unsubscribe) unsubscribe();
    };

    const productEvents = store.when().productId(productId);

    // Store the unsubscribe function if the plugin provides one 
    // or use the standard pattern to offload the listeners.
    const vHandler = productEvents.verified((_receipt: any) => {
      if (!resolved) {
        resolved = true;
        // NOTE: Do NOT call receipt.finish() or upgradeToPremium() here.
        // The global store.when().verified() listener in initPurchases() is
        // solely responsible for both — doing it here causes a double-finish
        // which can trigger a plugin error and a duplicate Supabase upsert.
        cleanup();
        resolve(true);
      }
    });

    const cHandler = productEvents.cancelled(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error("Purchase was cancelled by the user."));
      }
    });

    // In most Cordova purchase plugin versions, store.when() returns an object 
    // where you can't easily 'off' individual listeners without the event bus.
    // However, we can use the 'un' or similar if available, or just manage the flag.
    // For v13, the standard way is to use the global store.off().
    unsubscribe = () => {
      // @ts-ignore - plugin internal API for cleanup
      if (vHandler && typeof vHandler.un === 'function') vHandler.un();
      // @ts-ignore
      if (cHandler && typeof cHandler.un === 'function') cHandler.un();
    };

    store.order(offerToOrder).then((error: any) => {
      if (error && !resolved) {
        resolved = true;
        cleanup();
        reject(new Error(error?.message || "Failed to initiate purchase."));
      }
    }).catch((e: any) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(e);
      }
    });
  });
};
