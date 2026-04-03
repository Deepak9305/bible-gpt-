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
  loginGuest: () => Promise<void>;
  loginEmail: (email: string, password?: string) => Promise<void>;
  signUpEmail: (email: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
    let authHardCapTimerFired = false;
    const authHardCapTimer = setTimeout(() => {
      authHardCapTimerFired = true;
      setIsLoading(false);
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
        // Clear the hard-cap timer since init completed normally.
        // Only fire setIsLoading(false) here as a guarantee if the timer hasn't already done so.
        clearTimeout(authHardCapTimer);
        if (!authHardCapTimerFired) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Listen for auth changes (handles OAuth callback redirect)
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const res = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          // Bug fix: only handle SIGNED_IN after the initial getSession() check
          // has completed, to avoid a race condition where both initializeAuth()
          // and the listener call syncUserFromSupabase concurrently on cold start.
          if (initialCheckDone.current) {
            await syncUserFromSupabase(newSession);
          }
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Silently update session — this only fires after initial load is done
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
          // Bug fix: use URL API properly. Tokens may appear in either the query
          // string (?access_token=) or hash fragment (#access_token=). The old
          // naive replace('#','?') would corrupt URLs containing both.
          const url = new URL(urlStr);
          // Merge query params and hash params into one searchable object
          const queryParams = new URLSearchParams(url.search);
          const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
          const get = (k: string) => queryParams.get(k) || hashParams.get(k);

          const accessToken = get('access_token');
          const refreshToken = get('refresh_token');

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
        // Restore all valid persisted users (guests and email users)
        if (parsed && parsed.id) {
          setUser(parsed);
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
    // Bug fix: reuse existing guest identity so the user doesn't lose stats/data
    // if they tap "Continue as Guest" more than once (e.g. after a session check).
    const existing = await StorageService.get('auth_user');
    if (existing) {
      try {
        const parsed: User = JSON.parse(existing);
        if (parsed?.isGuest && parsed?.id) {
          setUser(parsed);
          await setUserIdForStats(parsed.id);
          return;
        }
      } catch (_) { /* fall through to create new guest */ }
    }

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
    setUser(null);
    setSession(null);

    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await Promise.race([
            GoogleAuth.signOut().catch(() => { }),
            new Promise(resolve => setTimeout(resolve, 1000))
          ]);
        } catch (e) {
          console.warn('GoogleAuth native signOut error:', e);
        }
      }

      if (isSupabaseConfigured) {
        await supabase.auth.signOut().catch(() => { });
      }
    } catch (err) {
      console.error('Error during logout process:', err);
    } finally {
      await setUserIdForStats(null).catch(() => { });
      await StorageService.remove('auth_user').catch(() => { });
    }
  };

  const deleteAccount = async () => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.rpc('delete_user');
        if (error) console.warn('Supabase delete_user error:', error);

        await supabase.auth.signOut().catch(() => { });
      }
    } catch (err) {
      console.error('deleteAccount RPC or SignOut failed:', err);
    } finally {
      setUser(null);
      setSession(null);
      await StorageService.clear().catch(() => { });
      await setUserIdForStats(null).catch(() => { });
    }
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
