import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export default function LoginScreen() {
  const { loginGuest, loginEmail, signUpEmail, signInWithGoogle, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  // Bug fix: guard setState calls so they don't fire on an unmounted component
  // (e.g. when Google sign-in succeeds and navigation happens before finally runs).
  const isMounted = React.useRef(true);
  React.useEffect(() => { return () => { isMounted.current = false; }; }, []);

  // GoogleAuth.initialize is only needed for native platforms.
  // On web, Supabase handles the full OAuth redirect flow.

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await signUpEmail(email, password);
        // If sign-up requires verification, you'd show a message here instead.
        // Assuming auto-login if email confirmations are disabled for now:
      } else {
        await loginEmail(email, password);
      }
    } catch (e: any) {
      setError(e?.message || (isSignUp ? 'Failed to create account.' : 'Failed to log in. Please check your credentials.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken;
        if (idToken && isSupabaseConfigured) {
          // Proper session via Supabase Google OAuth with idToken
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });
          if (error) throw error;
          // onAuthStateChange will handle SIGNED_IN and sync the user
        } else if (googleUser?.email) {
          // Fallback if Supabase not configured: create local user from Google profile
          await loginEmail(googleUser.email);
        } else {
          setError('Google login failed: No credentials returned.');
        }
      } else {
        // Web: Use Supabase OAuth redirect flow
        if (!isSupabaseConfigured) {
          setError('Supabase is not configured locally. Please fill in your .env file or use guest login.');
          setIsLoading(false);
          return;
        }
        await signInWithGoogle();
      }
    } catch (e: any) {
      if (isMounted.current) setError(e?.message || 'Failed to sign in with Google');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      await loginGuest();
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-serif font-medium text-slate-800 dark:text-slate-100 mb-2 tracking-tight">Welcome Back</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Continue your journey of faith</p>
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium py-3.5 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all duration-200 mb-8 text-sm shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin text-slate-400" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="px-4 bg-white dark:bg-slate-900 text-slate-400">Or with email</span>
              </div>
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4 mb-8">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-xl text-center">
                  {error}
                </div>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-colors duration-200 text-sm"
                  placeholder="Email address"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-colors duration-200 text-sm"
                  placeholder="Password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium py-3.5 px-4 rounded-xl transition-colors transition-transform duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 dark:shadow-none text-sm"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Log In')}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition-all"
                >
                  {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>

            {/* Guest Login */}
            <button
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 text-sm font-medium transition-colors group"
            >
              Continue as Guest <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
