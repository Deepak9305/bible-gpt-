import 'cordova-plugin-purchase';

// We use the global CdvPurchase object provided by the plugin
declare const CdvPurchase: any;

export const initPurchases = () => {
  if (!window.CdvPurchase) {
    console.warn("CdvPurchase not available. Running in web?");
    return;
  }

  const store = CdvPurchase.store;
  
  // Register products
  store.register([{
    type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
    id: 'test_subscription_yearly',
    platform: CdvPurchase.Platform.TEST, // Use TEST platform for now
  }, {
    type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
    id: 'test_subscription_monthly',
    platform: CdvPurchase.Platform.TEST,
  }]);

  store.when()
    .approved((transaction: any) => {
      transaction.verify();
    })
    .verified((receipt: any) => {
      receipt.finish();
      // Here we would call upgradeToPremium()
    });

  store.initialize();
};

export const purchaseProduct = (productId: string) => {
  if (!window.CdvPurchase) {
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
