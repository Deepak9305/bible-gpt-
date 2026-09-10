import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getPurchaseSnapshot,
  initializePurchases,
  isPremiumPurchaseSupported,
  managePremiumSubscription,
  purchasePremiumPlan,
  refreshPremiumState,
  restorePremiumPurchases,
  subscribePurchaseState,
  type PremiumPlan,
  type PremiumSnapshot,
} from '../services/purchaseService';

export type { PremiumPlan };

interface PremiumContextValue extends PremiumSnapshot {
  isSupported: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  actionError: string | null;
  purchase: (plan: PremiumPlan) => Promise<void>;
  restore: () => Promise<void>;
  manageSubscription: () => Promise<void>;
  refresh: () => Promise<void>;
  clearActionError: () => void;
}

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

const messageForError = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [purchaseState, setPurchaseState] = useState<PremiumSnapshot>(getPurchaseSnapshot());
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribePurchaseState(setPurchaseState);
    void initializePurchases();
    return unsubscribe;
  }, []);

  const purchase = useCallback(async (plan: PremiumPlan) => {
    setActionError(null);
    setIsPurchasing(true);
    try {
      await purchasePremiumPlan(plan);
    } catch (error) {
      const message = messageForError(error);
      setActionError(message);
      throw error;
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setActionError(null);
    setIsRestoring(true);
    try {
      await restorePremiumPurchases();
    } catch (error) {
      const message = messageForError(error);
      setActionError(message);
      throw error;
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const manageSubscription = useCallback(async () => {
    setActionError(null);
    try {
      await managePremiumSubscription();
    } catch (error) {
      const message = messageForError(error);
      setActionError(message);
      throw error;
    }
  }, []);

  const refresh = useCallback(async () => {
    setActionError(null);
    try {
      await refreshPremiumState();
    } catch (error) {
      setActionError(messageForError(error));
    }
  }, []);

  return (
    <PremiumContext.Provider
      value={{
        ...purchaseState,
        isSupported: isPremiumPurchaseSupported(),
        isPurchasing,
        isRestoring,
        actionError,
        purchase,
        restore,
        manageSubscription,
        refresh,
        clearActionError: () => setActionError(null),
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) throw new Error('usePremium must be used within a PremiumProvider');
  return context;
}
