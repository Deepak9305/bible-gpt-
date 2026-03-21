import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Sparkles, Heart, Infinity, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
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

              <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 border border-amber-200/50 dark:border-amber-900/30">
                <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full inline-block mb-3">
                  Limit Reached
                </div>
                <h3 className="font-serif text-lg text-stone-800 dark:text-stone-200 mb-2">Continue your Journey</h3>

                {Capacitor.isNativePlatform() ? (
                  <div className="space-y-3 mt-4">
                    <button
                      onClick={() => handleSubscribe('biblenova:monthly')}
                      disabled={isLoading}
                      className="w-full p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl flex items-center justify-between group hover:border-amber-500 transition-all active:scale-[0.98]"
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium text-stone-900 dark:text-stone-100">Monthly Plan</div>
                        <div className="text-xs text-stone-500">$9.99 / month</div>
                      </div>
                      {isLoading ? <Loader2 className="animate-spin text-amber-500" size={18} /> :
                        <div className="w-6 h-6 rounded-full border border-stone-200 group-hover:border-amber-500 group-hover:bg-amber-500/10 flex items-center justify-center transition-colors">
                          <Check size={14} className="text-amber-500 opacity-0 group-hover:opacity-100" />
                        </div>}
                    </button>

                    <button
                      onClick={() => handleSubscribe('biblenova:yearly')}
                      disabled={isLoading}
                      className="w-full p-4 bg-stone-900 dark:bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl flex items-center justify-between group hover:border-amber-500 transition-all relative active:scale-[0.98]"
                    >
                      <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-amber-500 text-[9px] font-bold text-white rounded-full uppercase tracking-wider">
                        Best Value
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-stone-900 dark:text-stone-100">Yearly Plan</div>
                        <div className="text-xs text-stone-500">$89.99 / year (Save 25%)</div>
                      </div>
                      {isLoading ? <Loader2 className="animate-spin text-amber-500" size={18} /> :
                        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-4">
                      To keep our sanctuary sustainable, we limit Father AI to 1 generation per day for free seekers.
                      Subscriptions are currently available on our mobile app.
                      Please return tomorrow for more guidance.
                    </p>
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="mt-6 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {Capacitor.isNativePlatform() ? "Maybe later" : "Peace be with you"}
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
