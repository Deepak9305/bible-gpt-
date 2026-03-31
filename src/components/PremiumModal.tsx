import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Infinity, Loader2, Zap } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { purchaseProduct, getProductPricing } from '../services/purchaseService';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function PremiumModal({ isOpen, onClose, onUpgrade }: PremiumModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricing, setPricing] = useState<{ yearly: string | null; monthly: string | null }>({
    yearly: null,
    monthly: null,
  });

  useEffect(() => {
    if (isOpen && Capacitor.isNativePlatform()) {
      setIsPricingLoading(true);
      // Prices are available after store.update() runs; try after a short delay
      const timer = setTimeout(() => {
        setPricing(getProductPricing('biblenova'));
        setIsPricingLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubscribe = async (productId: string, basePlanId?: string) => {
    setIsLoading(true);
    try {
      await purchaseProduct(productId, basePlanId);
      onUpgrade();
      onClose();
      setTimeout(() => alert('Blessings! You now have unlimited access.'), 300);
    } catch (e: any) {
      console.error('Purchase failed', e);
      alert(`Purchase failed or was cancelled.\n\n${e?.message || JSON.stringify(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={isLoading ? undefined : onClose}
          />

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-100 dark:border-stone-800 overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Header Strip */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles size={18} strokeWidth={2} />
                <span className="font-semibold text-sm tracking-wide">Abide in Wisdom</span>
              </div>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="text-white/70 hover:text-white transition-colors disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              {/* Benefit pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Infinity, label: 'Unlimited AI' },
                  { icon: Zap, label: 'Deep Study' },
                  { icon: Sparkles, label: 'Ministry Support' },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 text-xs font-medium"
                  >
                    <b.icon size={12} />
                    {b.label}
                  </div>
                ))}
              </div>

              {Capacitor.isNativePlatform() ? (
                <>
                  {/* Subscription options */}
                  <div className="space-y-2">
                    {/* Yearly */}
                    <button
                      onClick={() => handleSubscribe('biblenova', 'yearly')}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between px-4 py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-2xl font-semibold text-sm transition-all disabled:opacity-60 shadow-md shadow-amber-400/30"
                    >
                      <div className="flex flex-col items-start">
                        <span>Annual Blessing</span>
                        <span className="text-[10px] font-normal opacity-80">Best value · Save ~60%</span>
                      </div>
                      <span className="text-sm font-bold">
                        {isLoading || isPricingLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          pricing.yearly ?? '—'
                        )}
                      </span>
                    </button>

                    {/* Monthly */}
                    <button
                      onClick={() => handleSubscribe('biblenova', 'monthly')}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between px-4 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-[0.98] text-stone-700 dark:text-stone-200 rounded-2xl font-medium text-sm transition-all disabled:opacity-60 border border-stone-200 dark:border-stone-700"
                    >
                      <span>Monthly Support</span>
                      <span className="text-sm font-semibold">
                        {isLoading || isPricingLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          pricing.monthly ?? '—'
                        )}
                      </span>
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-stone-400 dark:text-stone-600">
                      Secure · Cancel anytime
                    </p>
                    <button
                      onClick={onClose}
                      disabled={isLoading}
                      className="text-[11px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 font-medium transition-colors disabled:opacity-30"
                    >
                      Maybe later
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Subscriptions are only available in the mobile app. Return tomorrow for another free conversation.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl text-sm font-medium"
                  >
                    Peace be with you
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
