import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart } from 'lucide-react';

interface LimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LimitModal({ isOpen, onClose }: LimitModalProps) {
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
            onClick={onClose}
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
              className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"
            >
              <X size={16} />
            </button>

            {/* Hero */}
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-6 pt-7 pb-6 text-center">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/20 mb-3">
                <Heart size={22} className="text-white" strokeWidth={1.8} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Daily Limit Reached</h2>
              <p className="text-amber-100 text-xs leading-relaxed max-w-[240px] mx-auto">
                To keep this service sustainable for everyone, we limit conversations to 5 messages per day.
              </p>
            </div>

            {/* Content */}
            <div className="px-6 pt-6 pb-6 space-y-4">
              <p className="text-sm text-stone-600 dark:text-stone-300 text-center leading-relaxed">
                Thank you for understanding! Please return tomorrow for more conversations.
              </p>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-[0.98] text-stone-700 dark:text-stone-200 rounded-2xl font-semibold transition-all"
              >
                Peace be with you
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
