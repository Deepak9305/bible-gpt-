import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

interface User {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  avatar?: string;
  preferences?: {
    isPersonalizationEnabled: boolean;
    lifeStage?: string;
    spiritualFocus?: string;
    tone?: 'pastoral' | 'gentle' | 'direct';
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  loginGuest: () => void;
  loginEmail: (email: string) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
  deleteAccount: () => void;
  updateProfile: (name: string, avatar?: string, preferences?: User['preferences']) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      loadLocalUser();
      return;
    }

    // 1. Check for Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        syncUserFromSupabase(session);
      } else {
        // Fallback to guest session if no Supabase session
        loadLocalUser();
      }
    }).catch(err => {
      console.error("Supabase session error:", err);
      loadLocalUser(); // Fallback to local user
    });

    // 2. Listen for auth changes
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const res = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          syncUserFromSupabase(session);
        } else if (!user?.isGuest) {
          setUser(null);
        }
      });
      subscription = res.data.subscription;
    } catch (err) {
      console.error("Supabase auth change listener error:", err);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // 3. Handle deep links for Capacitor
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handleDeepLink = async (urlStr: string) => {
        try {
          // Parse the URL - Supabase tokens are usually in the fragment (#)
          const url = new URL(urlStr.replace('#', '?'));
          const params = new URLSearchParams(url.search);

          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) console.error("Error setting session from deep link:", error);
          }
        } catch (err) {
          console.error("Failed to parse deep link URL:", err);
        }
      };

      // Listen for app opening from URL
      const listenerPromise = App.addListener('appUrlOpen', (event) => {
        handleDeepLink(event.url);
      });

      // Check if app was launched with a URL
      App.getLaunchUrl().then(res => {
        if (res?.url) handleDeepLink(res.url);
      });

      return () => {
        listenerPromise.then(l => l.remove());
      };
    }
  }, []);

  const syncUserFromSupabase = async (session: Session) => {
    const supabaseUser = session.user;
    const storedUserStr = await StorageService.get('auth_user');
    let localUser: User | null = null;

    if (storedUserStr) {
      try {
        localUser = JSON.parse(storedUserStr);
      } catch (e) {
        console.error("Failed to parse local user", e);
      }
    }

    const newUser: User = {
      id: supabaseUser.id,
      name: localUser?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      email: supabaseUser.email,
      isGuest: false,
      avatar: localUser?.avatar || supabaseUser.user_metadata?.avatar_url || '👤',
      preferences: localUser?.preferences || { isPersonalizationEnabled: true }
    };

    setUser(newUser);
    await StorageService.set('auth_user', JSON.stringify(newUser));
    setIsLoading(false);
  };

  const loadLocalUser = async () => {
    const storedUser = await StorageService.get('auth_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.isGuest) {
          setUser(parsed);
        }
      } catch (e) {
        console.error("Failed to parse user session", e);
        await StorageService.remove('auth_user');
      }
    }
    setIsLoading(false);
  };

  const loginGuest = async () => {
    const guestUser: User = {
      id: 'guest-' + Date.now(),
      name: 'Guest',
      isGuest: true,
      avatar: '✝️',
      preferences: {
        isPersonalizationEnabled: true,
      }
    };
    setUser(guestUser);
    await StorageService.set('auth_user', JSON.stringify(guestUser));
  };

  const loginEmail = async (email: string) => {
    // This is still a mock for now, but we prepare the user object
    const emailUser: User = {
      id: 'user-' + Date.now(),
      name: email.split('@')[0],
      email: email,
      isGuest: false,
      avatar: '👤',
      preferences: {
        isPersonalizationEnabled: true,
      }
    };
    setUser(emailUser);
    await StorageService.set('auth_user', JSON.stringify(emailUser));
  };

  const signInWithGoogle = async () => {
    // Determine the best redirect URL
    const isNative = Capacitor.isNativePlatform();
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const productionUrl = import.meta.env.VITE_SITE_URL || 'https://bible-gpt-ebon.vercel.app/';

    // For native apps, use the custom scheme. For web, use the site URL.
    const redirectTo = isNative
      ? 'com.biblenova.app://google-auth'
      : (isLocal ? window.location.origin : productionUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: false // Always redirect to let Supabase handle the OAuth flow
      }
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    await StorageService.remove('auth_user');
  };

  const deleteAccount = async () => {
    // Note: Supabase user deletion usually requires service_role or a custom function
    await StorageService.clear();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    window.location.reload();
  };

  const updateProfile = async (name: string, avatar?: string, preferences?: User['preferences']) => {
    if (user) {
      const updatedUser = {
        ...user,
        name,
        avatar: avatar || user.avatar,
        preferences: preferences || user.preferences
      };
      setUser(updatedUser);
      await StorageService.set('auth_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isConfigured: isSupabaseConfigured,
      loginGuest,
      loginEmail,
      signInWithGoogle,
      logout,
      deleteAccount,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
