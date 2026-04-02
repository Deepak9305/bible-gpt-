import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { setUserIdForStats } from '../services/statsService';

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
  loginEmail: (email: string, password?: string) => Promise<void>;
  signUpEmail: (email: string, password?: string) => Promise<void>;
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

    // HARD-CAP: If auth initialization hangs (e.g. getSession() never resolves
    // due to network issues), force isLoading=false after 8s so the splash screen
    // is never permanently stuck. Native services already have a 5s race in App.tsx.
    const authHardCapTimer = setTimeout(() => {
      setIsLoading(prev => {
        if (prev) {
          console.warn('[AuthContext] Auth init timed out after 8s — forcing isLoading=false');
        }
        return false;
      });
    }, 8000);

    const initializeAuth = async () => {
      try {
        // Supabase v2 client with detectSessionInUrl: true automatically handles PKCE code
        // exchanges. Manually handling it here causes a double-exchange race condition that throws
        // invalid_grant and breaks caching on second logins.

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
        // Guarantee loading clears even if syncUserFromSupabase/loadLocalUser
        // forgot to call setIsLoading(false) — prevents the splash screen from
        // getting permanently stuck.
        setIsLoading(false);
      }
    };

    initializeAuth();

    // 2. Listen for auth changes (handles OAuth callback redirect)
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const res = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          // User just signed in (e.g. OAuth redirect landed)
          await syncUserFromSupabase(newSession);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Silently update session
          await syncUserFromSupabase(newSession);
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
      clearTimeout(authHardCapTimer);
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
    await setUserIdForStats(newUser.id);
    await StorageService.set('auth_user', JSON.stringify(newUser));
    setIsLoading(false);
  };

  const loadLocalUser = async () => {
    const storedUser = await StorageService.get('auth_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // BUG FIX: Restore ALL valid persisted users (guests AND email users),
        // not just guests. Previously, non-guest users stored locally were
        // cleared on startup when Supabase had no active session.
        if (parsed && parsed.id) {
          setUser(parsed);
          // BUG FIX: await setUserIdForStats to prevent stats race condition on startup
          await setUserIdForStats(parsed.id);
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
    // BUG FIX: await setUserIdForStats to prevent stats race condition
    await setUserIdForStats(guestUser.id);
    await StorageService.set('auth_user', JSON.stringify(guestUser));
  };

  const loginEmail = async (email: string, password?: string) => {
    // Standard Supabase Email + Password Login
    if (isSupabaseConfigured) {
      if (!password) throw new Error('Password is required');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) await syncUserFromSupabase(data.session);
      return;
    }
    // Fallback: offline/dev mode — create a local email user
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
    // BUG FIX: await setUserIdForStats to prevent stats race condition
    await setUserIdForStats(emailUser.id);
    await StorageService.set('auth_user', JSON.stringify(emailUser));
  };

  const signUpEmail = async (email: string, password?: string) => {
    if (isSupabaseConfigured) {
      if (!password) throw new Error('Password is required');
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) await syncUserFromSupabase(data.session);
      return;
    }
    // Fallback: just login in dev mode
    return loginEmail(email, password);
  };

  const signInWithGoogle = async () => {
    const isNative = Capacitor.isNativePlatform();

    // For native apps, use custom scheme. For web, always use the current origin
    // This dynamically handles local, preview, and production web environments
    const redirectTo = isNative
      ? 'com.biblenova.app://google-auth'
      : `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: false,
        queryParams: {
          prompt: 'select_account'
        }
      }
    });
    if (error) throw error;
  };

  const logout = async () => {
    // BUG FIX: Explicitly clear the native Google credential cache so that on the next
    // login attempt, it triggers the account selection prompt again.
    // MUST initialize first or it natively crashes the app on Android.
    if (Capacitor.isNativePlatform()) {
      try {
        // Timeout prevents hanging if not logged in via Google
        await Promise.race([
          GoogleAuth.signOut().catch(e => console.warn('GoogleAuth signOut ignorable:', e)),
          new Promise(resolve => setTimeout(resolve, 1000))
        ]);
      } catch (e) {
        console.warn('GoogleAuth native signOut error:', e);
      }
    }

    // BUG FIX: Only call supabase.auth.signOut() when Supabase is configured.
    // Calling it against the placeholder URL causes a silent network error.
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(e => console.warn('Supabase signOut error:', e));
    }
    setUser(null);
    setSession(null);
    // BUG FIX: await setUserIdForStats(null) for reliable cleanup
    await setUserIdForStats(null);
    await StorageService.remove('auth_user');
  };

  const deleteAccount = async () => {
    // First remove from Supabase (if configured) so the local token is still valid
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('delete_user');
      if (error) console.warn('Supabase delete_user error:', error);

      await supabase.auth.signOut().catch(e => console.warn('Supabase signOut error on delete:', e));
    }
    await StorageService.clear();

    setUser(null);
    setSession(null);
    // BUG FIX: await setUserIdForStats(null) for reliable cleanup
    await setUserIdForStats(null);
    // BUG FIX: window.location.reload() is broken inside Capacitor native.
    // Setting state to null is sufficient — the router will redirect to /login.
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
      signUpEmail,
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
