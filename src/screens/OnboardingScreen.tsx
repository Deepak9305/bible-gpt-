import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Loader2, Heart } from 'lucide-react';

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step < 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    // Add a slight artificial delay for the "spiritual" feel
    await new Promise(resolve => setTimeout(resolve, 800));
    await completeOnboarding(name);
    // After completeOnboarding, AuthContext updates `user`, 
    // which automatically redirects to '/' via App.tsx routing
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-100/60 dark:bg-blue-900/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[70%] h-[70%] bg-indigo-100/60 dark:bg-indigo-900/20 rounded-full blur-[140px]" />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full max-w-md relative z-10 text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 mb-8 shadow-inner border border-blue-100 dark:border-blue-800">
              <Sparkles size={28} strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-serif font-medium text-slate-800 dark:text-slate-100 mb-6 tracking-tight">
              Welcome to your Sanctuary
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg leading-relaxed mb-12 max-w-sm mx-auto">
              A quiet space to reflect, pray, and explore the Word. Your journey of faith begins here.
            </p>

            <button
              onClick={handleNext}
              className="group inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-8 rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-xl shadow-blue-500/20 text-lg w-full sm:w-auto"
            >
              Begin Journey
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-md relative z-10 text-center"
          >
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 mb-8 shadow-inner border border-indigo-100 dark:border-indigo-800">
              <Heart size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-serif font-medium text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
              How shall we call you?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed mb-8">
              We want to make this space truly yours. You can use your first name or a nickname.
            </p>

            <div className="relative max-w-sm mx-auto mb-10">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFinish()}
                placeholder="Your name (optional)"
                className="block w-full px-6 py-4 border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors duration-300 text-lg text-center font-medium shadow-sm"
              />
            </div>

            <button
              onClick={handleFinish}
              disabled={isLoading}
              className="w-full max-w-sm mx-auto group flex items-center justify-center gap-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold py-4 px-8 rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-xl text-base disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <>Enter Peace</>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
