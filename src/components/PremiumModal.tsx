import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Sparkles, Heart, Infinity } from 'lucide-react';
import { upgradeToPremium } from '../services/statsService';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function PremiumModal({ isOpen, onClose, onUpgrade }: PremiumModalProps) {
  const handleSubscribe = () => {
    // In a real app, this would trigger a payment flow
    upgradeToPremium();
    onUpgrade();
    onClose();
    alert("Blessings! You now have unlimited access.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

              <div className="grid grid-cols-1 gap-2.5 mb-3">
                <button 
                  onClick={handleSubscribe}
                  className="relative w-full p-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-between px-2">
                    <div className="text-left">
                      <div className="text-[10px] font-medium text-amber-100 uppercase tracking-wider">Yearly Plan</div>
                      <div className="text-lg font-bold leading-none">$99.99 <span className="text-xs font-normal opacity-80">/ year</span></div>
                    </div>
                    <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm">
                      -17%
                    </div>
                  </div>
                </button>
                
                <button 
                  onClick={handleSubscribe}
                  className="w-full p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white hover:bg-stone-50 dark:hover:bg-stone-750 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between px-2">
                    <div className="text-left">
                      <div className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Monthly Plan</div>
                      <div className="text-lg font-bold leading-none">$9.99 <span className="text-xs font-normal text-stone-500">/ month</span></div>
                    </div>
                  </div>
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
