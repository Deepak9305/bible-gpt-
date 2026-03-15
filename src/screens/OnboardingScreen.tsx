import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { completeOnboarding } from '../services/statsService';
import { useAuth } from '../context/AuthContext';
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
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Identity Setup</span>
        </div>
        <button
          onClick={handleFinish}
          className="px-6 py-2 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          Done <CheckCircle2 size={14} />
        </button>
      </div>

      {/* Web Onboarding Content */}
      <div className="flex-1 w-full h-full relative bg-gray-50 dark:bg-gray-950">
        <iframe
          src="https://bible-gpt-ebon.vercel.app/onboarding"
          className="absolute inset-0 w-full h-full border-0"
          title="Bible Nova Onboarding"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        />

        {/* Loading Indicator Overlay (Hidden when iframe loads) */}
        <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center opacity-40">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium">Connecting to sanctuary...</p>
        </div>
      </div>

      {/* Footer hint */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-800 text-center safe-area-bottom">
        <p className="text-[10px] text-gray-400 font-medium">Click "Done" when you've finished the setup above</p>
      </div>
    </div>
  );
}
