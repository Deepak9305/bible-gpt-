import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  key?: string;
  /** When true the splash has permission to exit. Prevents early close while profile/native init is pending. */
  isReady?: boolean;
}

export default function SplashScreen({ onComplete, isReady = true }: SplashScreenProps) {
  // Show for at least 1200ms, and only exit once isReady is also true
  const minTimerDone = useRef(false);
  const readyRef = useRef(isReady);

  useEffect(() => {
    readyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    const timer = setTimeout(() => {
      minTimerDone.current = true;
      if (readyRef.current) {
        onComplete();
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // When isReady flips true after the min timer already finished → exit immediately
  useEffect(() => {
    if (isReady && minTimerDone.current) {
      onComplete();
    }
  }, [isReady, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-950"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          className="absolute inset-0 bg-blue-400 blur-3xl rounded-full will-change-[opacity]"
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <BookOpen size={80} className="text-blue-600 dark:text-blue-300 relative z-10" strokeWidth={1.5} />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.9 }}
        className="mt-8 text-3xl font-serif font-medium text-gray-800 dark:text-gray-100 tracking-wide"
      >
        Bible Nova
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.9 }}
        className="mt-3 text-lg text-gray-600 dark:text-gray-300 font-serif italic tracking-wide"
      >
        Peace be with you
      </motion.p>
    </motion.div>
  );
}
