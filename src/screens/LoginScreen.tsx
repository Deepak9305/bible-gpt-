import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { loginGuest, loginEmail, signUpEmail, signInWithGoogle, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [premiumNotice] = useState(() => {
    try {
      const notice = sessionStorage.getItem('premium_login_notice') || '';
      sessionStorage.removeItem('premium_login_notice');
      return notice;
    } catch {
      return '';
    }
  });
  const isMounted = useRef(true);

  useEffect(() => () => {
    isMounted.current = false;
  }, []);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError('');
    setConfirmationSent(false);

    try {
      if (isSignUp) {
        const result = await signUpEmail(cleanEmail, password);
        if (result.needsEmailConfirmation && isMounted.current) setConfirmationSent(true);
      } else {
        await loginEmail(cleanEmail, password);
      }
    } catch (submissionError) {
      if (isMounted.current) {
        setError(submissionError instanceof Error ? submissionError.message : 'Unable to sign in. Please try again.');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (signInError) {
      if (isMounted.current) {
        setError(signInError instanceof Error ? signInError.message : 'Unable to sign in with Google.');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginGuest();
    } catch {
      if (isMounted.current) setError('Unable to start guest access. Please try again.');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden safe-area-top safe-area-bottom">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-[120px]" />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="text-center mb-10">
              <img src="/logo.png" alt="Bible Nova" className="mx-auto mb-6 h-20 w-20 object-contain" />
              <h1 className="text-3xl font-serif font-medium text-slate-800 dark:text-slate-100 mb-2 tracking-tight">Welcome Back</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Continue your journey of faith</p>
            </div>

            {premiumNotice && (
              <div role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center shadow-sm dark:border-amber-500/40 dark:bg-amber-900/20">
                <p className="font-bold text-amber-900 dark:text-amber-200">Log in to buy premium</p>
                <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-100/75">Sign in or create an account to continue to Bible Nova Plus.</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3.5 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all duration-200 mb-8 text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin text-slate-400" /> : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              )}
              Continue with Google
            </button>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800" /></div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="px-4 bg-white dark:bg-slate-900 text-slate-400">Or with email</span></div>
            </div>

            {confirmationSent ? (
              <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl flex flex-col items-center gap-2 text-center">
                <CheckCircle size={32} className="text-green-500" />
                <p className="font-medium text-green-700 dark:text-green-300">Check your email</p>
                <p className="text-sm text-green-600 dark:text-green-400">Confirm your address, then return here to log in.</p>
                <button type="button" onClick={() => setConfirmationSent(false)} className="text-xs text-slate-500 mt-1 underline">Back to sign in</button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4 mb-8">
                {error && <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-xl text-center">{error}</div>}

                <label className="relative group block">
                  <span className="sr-only">Email address</span>
                  <Mail size={18} className="absolute inset-y-0 left-4 my-auto text-slate-400 group-focus-within:text-blue-600 transition-colors" aria-hidden="true" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm" placeholder="Email address" />
                </label>

                <label className="relative group block">
                  <span className="sr-only">Password</span>
                  <Lock size={18} className="absolute inset-y-0 left-4 my-auto text-slate-400 group-focus-within:text-blue-600 transition-colors" aria-hidden="true" />
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignUp ? 'new-password' : 'current-password'} className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm" placeholder="Password" />
                </label>

                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 text-sm">
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Log In')}
                </button>

                <div className="text-center mt-4">
                  <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">{isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}</button>
                </div>
              </form>
            )}

            <button type="button" onClick={handleGuestLogin} disabled={isLoading} className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 text-sm font-medium transition-colors group disabled:opacity-60">
              Continue as Guest <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
