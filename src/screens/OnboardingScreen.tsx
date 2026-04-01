import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { completeOnboarding } from '../services/statsService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();

  const handleFinish = () => {
    // We don't have the name from the iframe easily, 
    // so we'll use a default or let them update it in settings later
    completeOnboarding('Beloved');
    updateProfile('Beloved');
    onComplete();
    navigate('/', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col">
      {/* Header with Exit option */}
      <div className="p-4 flex justify-between items-center border-b dark:border-gray-800 bg-white dark:bg-gray-900 safe-area-top">
        <button
          onClick={handleFinish}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={18} /> Skip
        </button>
        <div className="flex items-center gap-2">
          <motion.span
            className="w-2 h-2 rounded-full bg-blue-500 will-change-[opacity]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Identity Setup</span>
        </div>
        <button
          onClick={handleFinish}
          className="px-6 py-2 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 transition-colors transition-transform duration-200 active:scale-95 shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          Done <CheckCircle2 size={14} />
        </button>
      </div>

      {/* Local Onboarding Content */}
      <div className="flex-1 w-full h-full relative bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="text-blue-600 dark:text-blue-400" size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-4">Welcome to Bible Nova</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
          Your sanctuary is now ready. We've synchronized your local Bible and initialized your spiritual journal.
        </p>
      </div>

      {/* Footer hint */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-800 text-center safe-area-bottom">
        <p className="text-[10px] text-gray-400 font-medium">Click "Done" when you've finished the setup above</p>
      </div>
    </div>
  );
}
