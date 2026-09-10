import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { StorageService } from '../services/storageService';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  avatar?: string;
  preferences?: {
    isPersonalizationEnabled: boolean;
    lifeStage?: string;
    spiritualFocus?: string;
    tone?: 'pastoral' | 'gentle' | 'direct' | string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  loginGuest: () => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AUTH_USER_KEY = 'auth_user';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseStoredUser = (value: string | null): AuthUser | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<AuthUser>;
    if (!parsed.id || !parsed.name || typeof parsed.isGuest !== 'boolean') return null;
    return parsed as AuthUser;
  } catch {
    return null;
  }
};

const getUrlParam = (url: URL, key: string) => {
  const queryValue = url.searchParams.get(key);
  if (queryValue) return queryValue;
  return new URLSearchParams(url.hash.replace(/^#/, '')).get(key);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialCheckDone = useRef(false);

  const syncUserFromSession = async (nextSession: Session) => {
    const supabaseUser = nextSession.user;
    const storedUser = parseStoredUser(await StorageService.get(AUTH_USER_KEY));

    const nextUser: AuthUser = {
      id: supabaseUser.id,
      name:
        storedUser?.name ||
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.email?.split('@')[0] ||
        'Beloved',
      email: supabaseUser.email,
      isGuest: false,
      avatar: storedUser?.avatar || supabaseUser.user_metadata?.avatar_url || '👤',
      preferences: storedUser?.preferences || { isPersonalizationEnabled: true },
    };

    setSession(nextSession);
    setUser(nextUser);
    await StorageService.set(AUTH_USER_KEY, JSON.stringify(nextUser));
  };

  const loadStoredGuest = async () => {
    const storedValue = await StorageService.get(AUTH_USER_KEY);
    const storedUser = parseStoredUser(storedValue);

    // A persisted guest is safe to restore without a network session. A
    // persisted account user is deliberately not treated as authenticated.
    if (storedUser?.isGuest) {
      setUser(storedUser);
    } else if (storedValue && !storedUser) {
      await StorageService.remove(AUTH_USER_KEY);
    }
  };

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;
    const timeoutId = window.setTimeout(() => {
      if (active) setIsLoading(false);
    }, 8000);

    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const {
            data: { session: existingSession },
            error,
          } = await supabase.auth.getSession();

          if (error) throw error;

          if (existingSession?.user) {
            await syncUserFromSession(existingSession);
          } else {
            await loadStoredGuest();
          }
        } else {
          await loadStoredGuest();
        }
      } catch (error) {
        console.warn('Auth initialization failed; continuing with local guest access.', error);
        await loadStoredGuest();
      } finally {
        initialCheckDone.current = true;
        if (active) setIsLoading(false);
      }
    };

    initializeAuth();

    if (isSupabaseConfigured) {
      const authListener = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, nextSession: Session | null) => {
          setSession(nextSession);

          if (
            (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
            nextSession?.user &&
            initialCheckDone.current
          ) {
            void syncUserFromSession(nextSession);
          }

          if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
          }
        },
      );
      subscription = authListener.data.subscription;
    }

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isSupabaseConfigured) return;

    const handleAuthUrl = async (urlString: string) => {
      try {
        const url = new URL(urlString);
        const authError = getUrlParam(url, 'error_description') || getUrlParam(url, 'error');
        if (authError) throw new Error(authError);

        const code = getUrlParam(url, 'code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const accessToken = getUrlParam(url, 'access_token');
          const refreshToken = getUrlParam(url, 'refresh_token');
          if (!accessToken || !refreshToken) return;

          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        await Browser.close().catch(() => {});
      } catch (error) {
        console.error('Native auth callback failed:', error);
      }
    };

    const listenerPromise = App.addListener('appUrlOpen', ({ url }) => {
      void handleAuthUrl(url);
    });

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) void handleAuthUrl(launch.url);
    });

    return () => {
      void listenerPromise.then((listener) => listener.remove());
    };
  }, []);

  const loginGuest = async () => {
    const currentGuest = parseStoredUser(await StorageService.get(AUTH_USER_KEY));
    if (currentGuest?.isGuest) {
      setUser(currentGuest);
      return;
    }

    const storedProfile = await StorageService.get('local_profile');
    let profile: { id?: string; name?: string; avatar?: string } | null = null;
    try {
      profile = storedProfile ? JSON.parse(storedProfile) : null;
    } catch {
      profile = null;
    }

    const guestUser: AuthUser = {
      id: profile?.id || `guest-${Date.now()}`,
      name: profile?.name || 'Guest',
      isGuest: true,
      avatar: profile?.avatar || '✝️',
      preferences: { isPersonalizationEnabled: true },
    };

    setSession(null);
    setUser(guestUser);
    await StorageService.set(AUTH_USER_KEY, JSON.stringify(guestUser));
  };

  const loginEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Account login is not configured. Use guest access or add the Supabase environment variables.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('Sign-in completed without an active session. Please try again.');
    await syncUserFromSession(data.session);
  };

  const signUpEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Account registration is not configured. Use guest access or add the Supabase environment variables.');
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) await syncUserFromSession(data.session);
    return { needsEmailConfirmation: !data.session };
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Google sign-in is not configured. Use guest access or add the Supabase environment variables.');
    }

    const isNative = Capacitor.isNativePlatform();
    const redirectTo = isNative
      ? 'com.biblenova.app://auth/callback'
      : `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: isNative,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) throw error;
    if (isNative && data.url) await Browser.open({ url: data.url });
  };

  const logout = async () => {
    setUser(null);
    setSession(null);
    await StorageService.remove(AUTH_USER_KEY).catch(() => {});
    if (isSupabaseConfigured) await supabase.auth.signOut().catch(() => {});
  };

  const deleteAccount = async () => {
    if (isSupabaseConfigured && session) {
      try {
        await supabase.rpc('delete_user');
      } catch (error) {
        console.warn('Account deletion RPC unavailable:', error);
      }
      await supabase.auth.signOut().catch(() => {});
    }

    setUser(null);
    setSession(null);
    await StorageService.clear().catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
