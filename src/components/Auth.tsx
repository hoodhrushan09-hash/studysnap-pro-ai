import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Mail, Lock, User, ArrowRight, Github, ChevronLeft, AlertCircle } from 'lucide-react';
import { 
  signInWithGoogle, 
  signInWithApple, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  auth
} from '../firebase';
import { FirebaseError } from 'firebase/app';

interface Props {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent! Check your inbox.');
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err: any) {
      console.error(err);
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/user-not-found': setError('No account found with this email.'); break;
          case 'auth/wrong-password': setError('Incorrect password.'); break;
          case 'auth/email-already-in-use': setError('This email is already in use.'); break;
          case 'auth/password-short': setError('Password should be at least 6 characters.'); break;
          case 'auth/popup-closed-by-user': 
            setError('Login cancelled.');
            setTimeout(() => setError(''), 3000);
            break;
          default: setError(err.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProviderLogin = async (provider: 'google' | 'apple') => {
    setError('');
    setLoading(true);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200 items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-10 text-white"
      >
        <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-500/20">
          <Zap className="w-8 h-8 fill-none" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">StudySnap <span className="text-indigo-400">AI</span></h1>
      </motion.div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-x" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                {mode === 'login' ? 'Log In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Join the StudySnap AI community
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => handleProviderLogin('google')} 
                disabled={loading}
                className="w-full bg-white text-slate-900 font-bold py-4 px-6 rounded-2xl hover:bg-slate-100 transition flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
                Continue with Google
              </button>
              <button 
                onClick={() => handleProviderLogin('apple')} 
                disabled={loading}
                className="w-full bg-black text-white font-bold py-4 px-6 rounded-2xl border border-slate-800 hover:bg-slate-900 transition flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/apple.svg" className="w-5 h-5 invert" alt="" />
                Continue with Apple
              </button>
            </div>

            <div className="flex items-center gap-4 text-slate-600 text-xs font-bold uppercase tracking-widest px-2">
              <div className="h-px bg-slate-800 flex-1" />
              <span>Or use email</span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email Address" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  />
                </div>
                {mode !== 'forgot' && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold py-4 px-4 rounded-2xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In with Email' : mode === 'signup' ? 'Sign Up with Email' : 'Send Reset Link'}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>

            <div className="flex flex-col gap-3 text-center pt-2">
              <button 
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-slate-400 hover:text-white transition"
              >
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <span className="text-indigo-400 font-bold underline underline-offset-4">
                  {mode === 'login' ? 'Sign Up' : 'Log In'}
                </span>
              </button>
              {mode === 'login' && (
                <button 
                  onClick={() => setMode('forgot')}
                  className="text-xs text-slate-500 hover:text-slate-300 transition uppercase tracking-wider font-bold"
                >
                  Forgot Password?
                </button>
              )}
            </div>

            {mode === 'forgot' && (
              <button 
                onClick={() => setMode('login')}
                className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 transition text-sm pt-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Login
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-8 text-slate-500 text-xs">
        By continuing, you agree to StudySnap's Terms & Privacy Policy.
      </p>
    </div>
  );
}
