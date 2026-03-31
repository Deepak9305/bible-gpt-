import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

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
const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen'));
const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const PrivacyPolicyScreen = lazy(() => import('./screens/PrivacyPolicyScreen'));
const TermsOfServiceScreen = lazy(() => import('./screens/TermsOfServiceScreen'));

function LoadingFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-blue-50 dark:bg-gray-900">
      <Loader2 className="animate-spin text-blue-400 dark:text-blue-300" size={32} />
    </div>
  );
}

// Wrapper to give OnboardingScreen access to the navigate hook (Router context needed)
function OnboardingRouteWrapper() {
  const navigate = useNavigate();
  return <OnboardingScreen onComplete={() => navigate('/')} />;
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

  const handleSplashComplete = () => {
    setShowSplash(false);
    // BUG FIX: onExitComplete is never guaranteed to fire when Suspense is inside
    // AnimatePresence. Set isAppReady here instead, immediately after splash exits.
    setIsAppReady(true);
  };

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
                <Route path="/login" element={<LoginScreen />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              <Route element={<Layout isAppReady={isAppReady} />}>
                <Route index element={<HomeScreen />} />
                <Route path="chat" element={<ChatScreen />} />
                <Route path="library" element={<LibraryScreen />} />
                <Route path="bookmarks" element={<BookmarksScreen />} />
                <Route path="journal" element={<PrayerJournalScreen />} />
                <Route path="settings" element={<SettingsScreen />} />
                <Route path="privacy" element={<PrivacyPolicyScreen />} />
                <Route path="terms" element={<TermsOfServiceScreen />} />
                <Route
                  path="onboarding"
                  element={<OnboardingRouteWrapper />}
                />
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
