import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
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
  // Track whether the initial session check has completed to prevent
  // onAuthStateChange from overriding the initial load result.
  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      loadLocalUser();
      return;
    }

    const initializeAuth = async () => {
      try {
        // 1. Manually handle PKCE code exchange for Web (prevent React Router race condition)
        if (!Capacitor.isNativePlatform()) {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (code) {
            console.log('Exchanging OAuth code for session...');
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) console.error('OAuth code exchange failed:', exchangeError);

            // Clean up the URL to prevent re-exchanging
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        // 2. Check for existing Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        setSession(session);
        if (session?.user) {
          await syncUserFromSupabase(session);
        } else {
          await loadLocalUser();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        await loadLocalUser();
      } finally {
        initialCheckDone.current = true;
      }
    };

    initializeAuth();

    // 2. Listen for auth changes (handles OAuth callback redirect)
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const res = supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          // User just signed in (e.g. OAuth redirect landed)
          syncUserFromSupabase(newSession);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Silently update session
          syncUserFromSupabase(newSession);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          // Fired before getSession resolves; wait for getSession instead
          // so we don't duplicate the logic.
        }
        // Do NOT call setUser(null) for every null session — it would clear guests
      });
      subscription = res.data.subscription;
    } catch (err) {
      console.error('Supabase auth change listener error:', err);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // 3. Handle deep links for Capacitor (native only)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handleDeepLink = async (urlStr: string) => {
        try {
          const url = new URL(urlStr.replace('#', '?'));
          const params = new URLSearchParams(url.search);

          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) console.error('Error setting session from deep link:', error);
          }
        } catch (err) {
          console.error('Failed to parse deep link URL:', err);
        }
      };

      const listenerPromise = App.addListener('appUrlOpen', (event) => {
        handleDeepLink(event.url);
      });

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
        console.error('Failed to parse local user', e);
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
        // Load any persisted user (guest or otherwise) that was stored locally
        if (parsed && parsed.id) {
          setUser(parsed.isGuest ? parsed : null);
        }
      } catch (e) {
        console.error('Failed to parse user session', e);
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
    const isNative = Capacitor.isNativePlatform();
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // For native apps, use custom scheme. For web, force production URL to ignore preview URL issues.
    // Localhost still uses origin to allow local testing.
    const redirectTo = isNative
      ? 'com.biblenova.app://google-auth'
      : (isLocal ? `${window.location.origin}/auth/callback` : 'https://bible-gpt-ebon.vercel.app/auth/callback');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: false,
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
