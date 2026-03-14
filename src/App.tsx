import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { getStats } from './services/statsService';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence, motion } from 'motion/react';
import { initializeNativeServices } from './services/nativeService';
import { Loader2 } from 'lucide-react';

// Lazy load screens for performance
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const ChatScreen = lazy(() => import('./screens/ChatScreen'));
const LibraryScreen = lazy(() => import('./screens/LibraryScreen'));
const BookmarksScreen = lazy(() => import('./screens/BookmarksScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const PrayerJournalScreen = lazy(() => import('./screens/PrayerJournalScreen'));
const DigitalDetoxScreen = lazy(() => import('./screens/DigitalDetoxScreen'));
const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen'));
const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const PrivacyPolicyScreen = lazy(() => import('./screens/PrivacyPolicyScreen'));
const TermsOfServiceScreen = lazy(() => import('./screens/TermsOfServiceScreen'));

function LoadingFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-stone-50 dark:bg-stone-950">
      <Loader2 className="animate-spin text-amber-500" size={32} />
    </div>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [isNativeReady, setIsNativeReady] = useState(false);
  const { user, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    initializeNativeServices().then(() => {
      setIsNativeReady(true);
      if (user) {
        setShowOnboarding(!getStats().onboardingCompleted);
      }
    });
  }, []);

  useEffect(() => {
    if (isNativeReady && user) {
      setShowOnboarding(!getStats().onboardingCompleted);
    }
  }, [user, isNativeReady]);

  if (isLoading || !isNativeReady) return null;

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
      ) : !user ? (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full w-full">
          <LoginScreen />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full">
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/onboarding" element={showOnboarding ? <OnboardingScreen onComplete={() => setShowOnboarding(false)} /> : <Navigate to="/" replace />} />
                <Route path="/" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <Layout />}>
                  <Route index element={<HomeScreen />} />
                  <Route path="chat" element={<ChatScreen />} />
                  <Route path="library" element={<LibraryScreen />} />
                  <Route path="bookmarks" element={<BookmarksScreen />} />
                  <Route path="journal" element={<PrayerJournalScreen />} />
                  <Route path="settings" element={<SettingsScreen />} />
                  <Route path="detox" element={<DigitalDetoxScreen />} />
                  <Route path="privacy" element={<PrivacyPolicyScreen />} />
                  <Route path="terms" element={<TermsOfServiceScreen />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
