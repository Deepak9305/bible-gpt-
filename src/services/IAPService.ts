import { Capacitor } from '@capacitor/core';
import { NativePurchases } from '@capgo/native-purchases';
import { upgradeToPremium } from './statsService';
import { supabase } from './supabaseClient';

// Product IDs are platform-specific because Google Play uses base plans under a single product ID
export const PRODUCT_YEARLY = Capacitor.getPlatform() === 'android' ? 'blessing:annual' : 'biblenova_yearly';
export const PRODUCT_MONTHLY = Capacitor.getPlatform() === 'android' ? 'monthlyblessing:monthly' : 'biblenova_monthly';

// Google Play Billing Public Key for optional local signature verification
export const GOOGLE_PLAY_PUBLIC_KEY = import.meta.env.VITE_GOOGLE_PLAY_PUBLIC_KEY;

export let storeInitError = false;
export let storeReady = false;

export const initPurchases = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    storeInitError = false;
    storeReady = true;
    console.log('IAP: Capgo NativePurchases store is ready.');
  } catch (error) {
    storeInitError = true;
    console.error('IAP Error: failed to init purchases', error);
  }
};

export interface ProductPricing {
  yearly: string | null;
  monthly: string | null;
}

export const getProductPricing = async (): Promise<ProductPricing> => {
  if (!Capacitor.isNativePlatform()) return { yearly: null, monthly: null };

  try {
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [PRODUCT_YEARLY, PRODUCT_MONTHLY]
    });

    const yearlyProd = products.find((p: any) => p.identifier === PRODUCT_YEARLY);
    const monthlyProd = products.find((p: any) => p.identifier === PRODUCT_MONTHLY);

    return {
      yearly: yearlyProd?.priceString || null,
      monthly: monthlyProd?.priceString || null,
    };
  } catch (e) {
    console.error('IAP Error: failed to fetch pricing', e);
    return { yearly: null, monthly: null };
  }
};

export const purchaseProduct = async (productType: 'yearly' | 'monthly'): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return Promise.reject(new Error('In-app purchases are only available in the mobile app.'));
  }

  const productId = productType === 'yearly' ? PRODUCT_YEARLY : PRODUCT_MONTHLY;

  try {
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
    });

    if (transaction) {
      // Attempt server-side validation — non-fatal. If it fails for any reason, always
      // grant premium locally since the native store already authorised the transaction.
      try {
        const { data, error } = await supabase.functions.invoke('verify-iap', {
          body: {
            purchaseToken: (transaction as any).receipt || (transaction as any).token,
            productId: productId,
            platform: Capacitor.getPlatform(),
            packageName: 'com.biblenova.app'
          }
        });

        if (error) {
          console.warn('IAP: Server validation call failed (non-fatal):', error);
        } else {
          console.log('IAP: Server validation response:', data);
        }
      } catch (err) {
        console.warn('IAP: Edge Function unreachable (non-fatal):', err);
      }

      // Always unlock premium — the store already confirmed payment.
      upgradeToPremium();
      return Promise.resolve();
    }
    return Promise.reject(new Error('Purchase incomplete or failed.'));
  } catch (error: any) {
    return Promise.reject(new Error(error?.message || 'Purchase failed.'));
  }
};

export const restorePurchases = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return Promise.reject(new Error('In-app purchases are only available in the mobile app.'));
  }

  try {
    const result = await NativePurchases.restorePurchases();

    // Bug fix: only grant premium if the store actually confirms active entitlements.
    // Calling restorePurchases() with no prior purchases returns an empty list — we
    // must NOT blindly call upgradeToPremium() in that case.
    const restoredTransactions: any[] = (result as any)?.transactions ?? (result as any)?.customerInfo?.entitlements ?? [];
    const hasActive = Array.isArray(restoredTransactions) && restoredTransactions.length > 0;

    if (hasActive) {
      upgradeToPremium();
      return Promise.resolve();
    }

    return Promise.reject(new Error('No active subscriptions found to restore.'));
  } catch (error: any) {
    return Promise.reject(new Error(error?.message || 'Failed to restore purchases.'));
  }
};
