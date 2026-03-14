import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import LibraryScreen from './screens/LibraryScreen';
import BookmarksScreen from './screens/BookmarksScreen';
import SettingsScreen from './screens/SettingsScreen';
import PrayerJournalScreen from './screens/PrayerJournalScreen';
import DigitalDetoxScreen from './screens/DigitalDetoxScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import { getStats } from './services/statsService';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence, motion } from 'motion/react';
import { initializeNativeServices } from './services/nativeService';

import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';

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
            <Routes>
              {showOnboarding && <Route path="/onboarding" element={<OnboardingScreen onComplete={() => setShowOnboarding(false)} />} />}
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
