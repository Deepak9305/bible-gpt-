import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Crown, ExternalLink, Loader2, RotateCcw, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePremium, type PremiumPlan } from '../context/PremiumContext';
import { useNavigate } from 'react-router-dom';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BENEFITS = [
  'Unlimited Father AI conversations',
  'Deeper personalized Bible guidance',
  'Premium journeys and prayer support',
  'Weekly spiritual insights and share cards',
];

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    isPremium,
    isReady,
    isAvailable,
    isSupported,
    plans,
    isPurchasing,
    isRestoring,
    actionError,
    purchase,
    restore,
    manageSubscription,
    clearActionError,
  } = usePremium();

  const planDetails = (plan: PremiumPlan) => plans.find((item) => item.id === plan);
  const yearly = planDetails('yearly');
  const monthly = planDetails('monthly');
  const isBusy = isPurchasing || isRestoring;
  const isGuest = user?.isGuest === true;
  const [isRedirectingToLogin, setIsRedirectingToLogin] = React.useState(false);

  const handleLoginToBuy = async () => {
    if (isRedirectingToLogin) return;
    setIsRedirectingToLogin(true);
    try {
      try {
        sessionStorage.setItem('premium_login_notice', 'Log in to buy Bible Nova Plus. Your guest progress will remain on this device.');
      } catch {
        // Continue even if session storage is unavailable.
      }
      onClose();
      await logout();
    } finally {
      navigate('/login', { replace: true });
      setIsRedirectingToLogin(false);
    }
  };

  const handlePurchase = async (plan: PremiumPlan) => {
    if (isGuest) {
      await handleLoginToBuy();
      return;
    }

    try {
      await purchase(plan);
    } catch {
      // The context exposes the readable error inside the modal.
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
    } catch {
      // The context exposes the readable error inside the modal.
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.button
            type="button"
            aria-label="Close premium dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-title"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`relative w-full max-w-md overflow-hidden rounded-[28px] border shadow-2xl ${theme === 'dark'
              ? 'border-blue-300/25 bg-[#071a3a] text-white'
              : 'border-slate-200 bg-white text-slate-900'
              }`}
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 px-6 pb-6 pt-7 text-white">
              <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full p-2 text-white/75 transition hover:bg-white/15 hover:text-white"
              >
                <X size={18} />
              </button>
              <div className="relative flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/25">
                  <Crown size={25} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Bible Nova</p>
                  <h2 id="premium-title" className="mt-1 text-2xl font-bold">{isPremium ? 'Bible Nova Plus' : 'Go deeper in faith'}</h2>
                </div>
              </div>
              <p className="relative mt-4 max-w-sm text-sm leading-relaxed text-blue-100">
                {isPremium
                  ? 'Your premium access is active on this Google Play account.'
                  : 'More thoughtful guidance, more room to reflect, and a deeper daily journey.'}
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="space-y-3">
                {BENEFITS.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check size={15} strokeWidth={2.5} />
                    </span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {isGuest ? (
                <div role="alert" className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-amber-300/30 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  <p className="font-bold">Log in to buy premium</p>
                  <p className="mt-1 text-sm opacity-80">Premium subscriptions must be connected to a Bible Nova account.</p>
                  <button
                    type="button"
                    onClick={() => void handleLoginToBuy()}
                    disabled={isRedirectingToLogin}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isRedirectingToLogin && <Loader2 size={16} className="animate-spin" />}
                    Log in to buy premium
                  </button>
                </div>
              ) : !isSupported ? (
                <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${theme === 'dark' ? 'border-blue-300/20 bg-blue-950/50 text-blue-100/80' : 'border-blue-100 bg-blue-50 text-blue-800'}`}>
                  Subscriptions are available in the Android app through Google Play.
                </div>
              ) : isPremium ? (
                <button
                  type="button"
                  onClick={() => void manageSubscription().catch(() => {})}
                  disabled={isBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-blue-500/10 py-3.5 font-semibold text-blue-500 transition hover:bg-blue-500/20 disabled:opacity-60"
                >
                  <ExternalLink size={17} />
                  Manage subscription in Google Play
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => void handlePurchase('yearly')}
                    disabled={isBusy || !isReady || !isAvailable || !yearly?.available}
                    className="relative flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 text-left text-white shadow-lg shadow-blue-600/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span>
                      <span className="block text-sm font-bold">Yearly plan</span>
                      <span className="mt-0.5 block text-xs text-blue-100">Best value · auto-renews yearly</span>
                    </span>
                    <span className="text-right text-sm font-bold">{isReady ? yearly?.price || 'Unavailable' : 'Loading…'}</span>
                    {isPurchasing && <Loader2 size={16} className="absolute right-2 top-2 animate-spin" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handlePurchase('monthly')}
                    disabled={isBusy || !isReady || !isAvailable || !monthly?.available}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${theme === 'dark' ? 'border-blue-300/25 bg-blue-950/35 hover:bg-blue-900/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <span>
                      <span className="block text-sm font-bold">Monthly plan</span>
                      <span className={`mt-0.5 block text-xs ${theme === 'dark' ? 'text-blue-100/65' : 'text-slate-500'}`}>Auto-renews monthly</span>
                    </span>
                    <span className="text-right text-sm font-bold">{isReady ? monthly?.price || 'Unavailable' : 'Loading…'}</span>
                  </button>
                </div>
              )}

              {actionError && (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-3 text-xs leading-relaxed text-rose-500">
                  <span>{actionError}</span>
                  <button type="button" aria-label="Dismiss error" onClick={clearActionError} className="flex-shrink-0 p-0.5"><X size={14} /></button>
                </div>
              )}

              {isSupported && !isPremium && !isGuest && (
                <button
                  type="button"
                  onClick={() => void handleRestore()}
                  disabled={isBusy || !isReady}
                  className={`flex w-full items-center justify-center gap-2 py-1 text-sm font-semibold transition disabled:opacity-50 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}
                >
                  {isRestoring ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                  Restore purchases
                </button>
              )}

              <p className={`text-center text-[11px] leading-relaxed ${theme === 'dark' ? 'text-blue-100/50' : 'text-slate-500'}`}>
                Auto-renews through Google Play. Cancel anytime in Google Play. Prices are shown by Google Play.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
