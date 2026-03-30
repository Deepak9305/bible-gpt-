import { Capacitor } from '@capacitor/core';
import { upgradeToPremium } from './statsService';

// We use the global CdvPurchase object provided by the plugin
declare const CdvPurchase: any;

export const initPurchases = () => {
  if (typeof CdvPurchase === 'undefined') {
    console.warn("CdvPurchase not available. Running in web?");
    return;
  }

  const store = CdvPurchase.store;
  const platform = Capacitor.getPlatform() === 'ios' ? CdvPurchase.Platform.APPLE_APPSTORE : CdvPurchase.Platform.GOOGLE_PLAY;

  // Register products
  store.register([{
    type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
    id: 'biblenova:yearly',
    platform: platform,
  }, {
    type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
    id: 'biblenova:monthly',
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
      platform: CdvPurchase.Platform.GOOGLE_PLAY,
      options: {
        key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA09wkUpHpqHNL5WvGehhonKAz6bQfDqTpDcjtR8/jGPmhJRxb+UlA5ZbqnoWwpwl8P261/79JJbNSNFdF5U85K3YOVoTdFZ7B0sJhJeIzn0ZagpXMA3yyKI6QLNEzxom6px7cFsI7hD0pSvjs7ZfJzwEHokm1m4+olkkMdP0Yfb9x4uiO1lgOpbJNXLC4H3gXNA0AXvoHJcnC+fm0++R5f9eMAQtHrKxpUYAZm9TyTA7d1z+wCHq6i6pp6aCCbaZSDxIro9iAsYitV366B4u796Ppcz2Gh+hFS8tAI+Iy267OHdp9L5fsllxvTgim4QcWZvwqvr4FW+t+XK9RDn1XtwIDAQAB'
      }
    },
    {
      platform: CdvPurchase.Platform.APPLE_APPSTORE
    }
  ]);
};

export const purchaseProduct = (productId: string) => {
  if (typeof CdvPurchase === 'undefined') {
    console.warn("CdvPurchase not available. Simulating purchase.");
    return Promise.resolve(true);
  }

  return new Promise((resolve, reject) => {
    const store = CdvPurchase.store;
    const product = store.get(productId);
    if (!product) {
      reject(new Error("Product not found"));
      return;
    }

    store.order(product).then(() => {
      resolve(true);
    }).catch((e: any) => {
      reject(e);
    });
  });
};
