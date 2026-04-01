import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  key?: string;
  /** When true the splash has permission to exit. Prevents early close while auth/native init is pending. */
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
      if (readyRef.current) onComplete();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  useEffect(() => {
    if (isReady && minTimerDone.current) onComplete();
  }, [isReady, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-950"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: 'easeIn' }}
    >
      {/* Icon — snappy scale-in with spring feel */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }} // spring-like cubic
        className="relative"
      >
        {/* Ambient glow — single pulse, not infinite loop */}
        <motion.div
          className="absolute inset-0 bg-blue-400 blur-2xl rounded-full will-change-[opacity]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
        <BookOpen size={80} className="text-blue-600 dark:text-blue-300 relative z-10" strokeWidth={1.5} />
      </motion.div>

      {/* Title — slides up quickly */}
      <motion.h1
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
        className="mt-8 text-3xl font-serif font-medium text-gray-800 dark:text-gray-100 tracking-wide"
      >
        Bible Nova
      </motion.h1>

      {/* Tagline — fades in right after title */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
        className="mt-3 text-lg text-gray-600 dark:text-gray-300 font-serif italic tracking-wide"
      >
        Peace be with you
      </motion.p>
    </motion.div>
  );
}
