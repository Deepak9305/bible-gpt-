import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Sparkles, Heart, Infinity, Loader2 } from 'lucide-react';
import { upgradeToPremium } from '../services/statsService';
import { purchaseProduct } from '../services/purchaseService';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function PremiumModal({ isOpen, onClose, onUpgrade }: PremiumModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (productId: string) => {
    setIsLoading(true);
    try {
      await purchaseProduct(productId);
      upgradeToPremium();
      onUpgrade();
      onClose();
      alert("Blessings! You now have unlimited access.");
    } catch (e) {
      console.error("Purchase failed", e);
      alert("Purchase failed or was cancelled.");
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
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden border border-stone-100 dark:border-stone-800"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors z-10"
            >
              <X size={18} />
            </button>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 mb-3 shadow-sm">
                  <Sparkles size={24} strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-serif font-medium text-stone-800 dark:text-stone-100 mb-1">
                  Abide in Wisdom
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed px-4">
                  Unlock unlimited conversations and support our ministry.
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {[
                  { icon: Infinity, text: 'Unlimited conversations' },
                  { icon: Heart, text: 'Support the ministry' },
                  { icon: Check, text: 'Future deep-study tools' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
                    <div className="text-amber-500 dark:text-amber-400">
                      <item.icon size={16} />
                    </div>
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { id: 'monthly', name: 'Monthly', price: '$9.99', period: 'mo' },
                  { id: 'yearly', name: 'Yearly', price: '$79.99', period: 'yr', savings: 'Save 33%' },
                ].map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 flex flex-col items-center opacity-60 relative overflow-hidden"
                  >
                    {plan.savings && (
                      <div className="absolute top-0 right-0 bg-sacred-amber text-[8px] font-black text-white px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                        {plan.savings}
                      </div>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">{plan.name}</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-bold">{plan.price}</span>
                      <span className="text-[10px] opacity-40">/{plan.period}</span>
                    </div>
                    <div className="mt-3 w-full py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-[9px] font-black text-center text-stone-500 dark:text-stone-400 uppercase tracking-widest border border-stone-100 dark:border-stone-600">
                      Unavailable
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-sacred-amber/5 dark:bg-sacred-amber/10 rounded-2xl p-5 border border-sacred-amber/20 mb-6 text-center">
                <h3 className="font-serif text-base font-medium text-stone-800 dark:text-stone-100 mb-1.5 leading-tight">
                  Ministry Expanding
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed mb-4">
                  We're currently enhancing our sanctuary infrastructure. Subscriptions are temporarily paused, so please enjoy unlimited access on us during this time.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-sacred-amber text-white rounded-xl text-sm font-bold shadow-lg shadow-sacred-amber/20 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                >
                  Continue Journey
                </button>
              </div>

              <p className="text-center text-[10px] text-stone-400 dark:text-stone-600">
                Secure payment. Cancel anytime.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
