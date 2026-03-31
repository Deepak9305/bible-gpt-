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
      upgradeToPremium();
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

export const purchaseProduct = (productId: string, basePlanId?: string) => {
  const purchasePlugin = (window as any).CdvPurchase || (window as any).store;

  if (!purchasePlugin) {
    if (Capacitor.isNativePlatform()) {
      return Promise.reject(new Error("Purchasing service is not available on this device. Please check your connection or restart the app."));
    } else {
      console.warn("CdvPurchase not available. Simulating purchase on web.");
      return Promise.resolve(true);
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

    store.order(offerToOrder).then(() => {
      resolve(true);
    }).catch((e: any) => {
      reject(e);
    });
  });
};
