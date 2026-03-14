import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Shield, Sparkles, ArrowRight, Bot } from 'lucide-react';
import { completeOnboarding } from '../services/statsService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  {
    title: "Welcome to Bible Nova",
    description: "A sanctuary for your soul. Find peace, wisdom, and guidance through the word of God.",
    icon: Bot,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20"
  },
  {
    title: "Spiritual Guidance",
    description: "Ask anything. Find comfort and scripture guidance. Note: This offers spiritual guidance and is not a substitute for professional healthcare or therapy.",
    icon: Shield,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20"
  },
  {
    title: "Your Prayer Journal",
    description: "Keep track of your conversations with God. Watch as your prayers are answered over time.",
    icon: Heart,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20"
  }
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const navigate = useNavigate();
  const { updateProfile } = useAuth();

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsFinishing(true);
    }
  };

  const handleFinish = () => {
    if (!name.trim()) return;
    completeOnboarding(name.trim());
    updateProfile(name.trim());
    onComplete();
    navigate('/', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {!isFinishing ? (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md w-full text-center"
          >
            <div className={`w-24 h-24 rounded-[2rem] ${STEPS[currentStep].bg} ${STEPS[currentStep].color} flex items-center justify-center mx-auto mb-8 shadow-inner`}>
              {React.createElement(STEPS[currentStep].icon, { size: 48 })}
            </div>

            <h1 className="text-3xl font-bold mb-4 dark:text-white">
              {STEPS[currentStep].title}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">
              {STEPS[currentStep].description}
            </p>

            <div className="flex justify-center gap-2 mb-12">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200 dark:bg-gray-700'}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {currentStep === STEPS.length - 1 ? "Get Started" : "Continue"}
              <ArrowRight size={20} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="finish"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center"
          >
            <div className="w-20 h-20 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto mb-8">
              <Sparkles size={40} />
            </div>
            <h1 className="text-3xl font-bold mb-4 dark:text-white">
              What should I call you?
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              I'd love to address you by name as we explore the Word together.
            </p>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-white focus:border-blue-500 outline-none mb-8 text-center text-xl font-medium transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleFinish()}
            />

            <button
              onClick={handleFinish}
              disabled={!name.trim()}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              Enter Sanctuary
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
