import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';
import { initializeNativeServices } from './services/nativeService';
import { Loader2 } from 'lucide-react';

// Lazy load screens for performance
const HomeScreen = lazy(() => import('./screens/HomeScreen'));

const LibraryScreen = lazy(() => import('./screens/LibraryScreen'));
const BookmarksScreen = lazy(() => import('./screens/BookmarksScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const PrayerJournalScreen = lazy(() => import('./screens/PrayerJournalScreen'));
const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen'));
const PrivacyPolicyScreen = lazy(() => import('./screens/PrivacyPolicyScreen'));
const TermsOfServiceScreen = lazy(() => import('./screens/TermsOfServiceScreen'));

function LoadingFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-blue-50 dark:bg-gray-900">
      <Loader2 className="animate-spin text-blue-400 dark:text-blue-300" size={32} />
    </div>
  );
}



function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { user, isLoading } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    const bootApp = async () => {
      // Safety timeout for native services (5s)
      const nativeBoot = initializeNativeServices();
      const timeout = new Promise(resolve => setTimeout(resolve, 5000));
      await Promise.race([nativeBoot, timeout]);
      setIsInitializing(false);
    };
    bootApp();
  }, []);

  // Always render splash first — never return null which would show white
  // The splash only exits once BOTH auth and native init are done
  const splashReady = !isLoading && !isInitializing;

  // STABLE reference — must not change on every render or SplashScreen's
  // 2-second timer will be cleared & restarted on each auth/init state update.
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setIsAppReady(true);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen
          key="splash"
          isReady={splashReady}
          onComplete={handleSplashComplete}
        />
      ) : (
        <Suspense key="main-app" fallback={<LoadingFallback />}>
          <Routes>
            {/* Auth Guarded Routes */}
            {!user ? (
              <>
                <Route path="/onboarding" element={<OnboardingScreen />} />
                <Route path="*" element={<Navigate to="/onboarding" replace />} />
              </>
            ) : (
              <Route element={<Layout isAppReady={isAppReady} />}>
                <Route index element={<HomeScreen />} />

                <Route path="library" element={<LibraryScreen />} />
                <Route path="bookmarks" element={<BookmarksScreen />} />
                <Route path="journal" element={<PrayerJournalScreen />} />
                <Route path="settings" element={<SettingsScreen />} />
                <Route path="privacy" element={<PrivacyPolicyScreen />} />
                <Route path="terms" element={<TermsOfServiceScreen />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            )}
          </Routes>
        </Suspense>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
