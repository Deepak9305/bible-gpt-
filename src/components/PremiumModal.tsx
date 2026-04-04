import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Infinity, Loader2, Zap, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { purchaseProduct, getProductPricing, restorePurchases, storeInitError } from '../services/IAPService';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function PremiumModal({ isOpen, onClose, onUpgrade }: PremiumModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricing, setPricing] = useState<{ yearly: string | null; monthly: string | null }>({
    yearly: '$89.99',
    monthly: '$9.99',
  });
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && Capacitor.isNativePlatform()) {
      // Reset state when modal opens
      setIsPricingLoading(true);
      setPurchaseError(null);
      setRestoreMessage(null);
      setStoreError(null);
      setPricing({ yearly: null, monthly: null });
      let isMounted = true;
      let attempts = 0;
      const MAX_ATTEMPTS = 10; // poll for up to 15s (10 × 1500ms)

      const fetchPricing = async () => {
        try {
          const p = await getProductPricing();
          if (!isMounted) return;

          if (p.yearly || p.monthly || attempts >= MAX_ATTEMPTS) {
            setPricing(p);
            setIsPricingLoading(false);
            if (attempts >= MAX_ATTEMPTS && !p.yearly && !p.monthly) {
              if (storeInitError) {
                setStoreError('Store unavailable. Please check your Play Store account and restart the app.');
              } else {
                setStoreError('Products not loaded. Ensure the app is published and products are approved in Play Console.');
              }
            }
          } else {
            attempts++;
            retryTimerRef.current = setTimeout(fetchPricing, 1500);
          }
        } catch (error) {
          if (!isMounted) return;
          attempts++;
          retryTimerRef.current = setTimeout(fetchPricing, 1500);
        }
      };

      fetchPricing();

      return () => {
        isMounted = false;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      };
    }
  }, [isOpen]);

  const handleSubscribe = async (productType: 'yearly' | 'monthly') => {
    setIsLoading(true);
    setPurchaseError(null);
    try {
      await purchaseProduct(productType);
      onUpgrade();
      onClose();
    } catch (e: any) {
      setPurchaseError(e?.message || 'Purchase failed or was cancelled.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setRestoreMessage(null);
    setPurchaseError(null);
    try {
      await restorePurchases();
      setRestoreMessage('Purchases restored successfully!');
      onUpgrade();
    } catch (e: any) {
      setRestoreMessage(e?.message || 'Could not restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  };

  const priceSpinner = <Loader2 size={14} className="animate-spin inline-block" />;

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="modal" className="fixed inset-0 z-50 flex items-center justify-center p-5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={isLoading ? undefined : onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-100 dark:border-stone-800 overflow-hidden"
          >
            {/* Close */}
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X size={16} />
            </button>

            {/* Hero */}
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-6 pt-7 pb-6 text-center">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/20 mb-3">
                <Sparkles size={22} className="text-white" strokeWidth={1.8} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Abide in Wisdom</h2>
              <p className="text-amber-100 text-xs leading-relaxed max-w-[240px] mx-auto">
                Unlock unlimited AI conversations and deepen your walk with God.
              </p>
            </div>

            {/* Features */}
            <div className="px-6 pt-4 pb-3">
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { icon: Infinity, label: 'Unlimited\nConversations' },
                  { icon: Zap, label: 'Deep Study\nTools' },
                  { icon: ShieldCheck, label: 'Support the\nMinistry' },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 text-center"
                  >
                    <f.icon size={18} className="text-amber-500" strokeWidth={1.8} />
                    <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400 leading-tight whitespace-pre-line">
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {Capacitor.isNativePlatform() ? (
                <div className="space-y-2.5">
                  {/* Yearly */}
                  <button
                    onClick={() => handleSubscribe('yearly')}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-2xl transition-all disabled:opacity-60 shadow-lg shadow-amber-400/30"
                  >
                    <div className="text-left">
                      <div className="font-semibold text-sm">Annual Blessing</div>
                      <div className="text-[10px] opacity-80 font-normal">Best value · Save ~25%</div>
                    </div>
                    <div className="font-bold text-sm min-w-[48px] text-right">
                      {isLoading ? <Loader2 size={16} className="animate-spin ml-auto" /> :
                        isPricingLoading ? priceSpinner :
                          pricing.yearly ?? '—'}
                    </div>
                  </button>

                  {/* Monthly */}
                  <button
                    onClick={() => handleSubscribe('monthly')}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between px-4 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-[0.98] text-stone-700 dark:text-stone-200 rounded-2xl transition-all disabled:opacity-60 border border-stone-200 dark:border-stone-700"
                  >
                    <div className="font-medium text-sm">Monthly Support</div>
                    <div className="font-semibold text-sm min-w-[48px] text-right">
                      {isLoading ? <Loader2 size={16} className="animate-spin ml-auto" /> :
                        isPricingLoading ? priceSpinner :
                          pricing.monthly ?? '—'}
                    </div>
                  </button>

                  {purchaseError && (
                    <p className="text-xs text-red-400 text-center pb-1">{purchaseError}</p>
                  )}
                  {storeError && (
                    <p className="text-xs text-orange-400 text-center pb-1">{storeError}</p>
                  )}
                  {restoreMessage && (
                    <p className={`text-xs text-center pb-1 ${restoreMessage.includes('success') ? 'text-green-500' : 'text-red-400'}`}>
                      {restoreMessage}
                    </p>
                  )}
                  {/* Footer row */}
                  <div className="flex items-center justify-between pt-1 pb-2">
                    <button
                      onClick={handleRestore}
                      disabled={isLoading || isRestoring}
                      className="text-[11px] text-amber-500 hover:text-amber-600 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isRestoring ? <Loader2 size={10} className="animate-spin" /> : null}
                      Restore purchases
                    </button>
                    <button
                      onClick={onClose}
                      disabled={isLoading || isRestoring}
                      className="text-[11px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  <p className="text-xs text-stone-500 dark:text-stone-400 text-center leading-relaxed">
                    Subscriptions are only available in the mobile app.
                    Return tomorrow for another free conversation.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
                  >
                    Peace be with you
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
