import React, { useState } from 'react';
import { supabase, isMockAuth } from '../services/supabaseClient';
import { Mail, Lock, Eye, EyeOff, Loader2, Info } from 'lucide-react';
import { usePostHog } from '@posthog/react';

interface AuthFormProps {
  onSuccess: (session: any) => void;
  onClose?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, onClose }) => {
  const posthog = usePostHog();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Supabase might require email confirmation, but our mock doesn't
        if (isMockAuth) {
          setSuccessMsg('Registration successful! Logging you in...');
          if (data?.session) {
            setTimeout(() => onSuccess(data.session), 1000);
          }
        } else {
          if (data?.session) {
            const userId = data.session.user?.id;
            posthog?.identify(userId, { email });
            posthog?.capture('user_signed_up', { auth_method: 'email', is_mock_auth: false });
            onSuccess(data.session);
          } else {
            posthog?.capture('user_signed_up', { auth_method: 'email', email_confirmation_required: true });
            setSuccessMsg('Registration successful! Please check your email for the confirmation link.');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data?.session) {
          const userId = data.session.user?.id;
          posthog?.identify(userId, { email });
          posthog?.capture('user_signed_in', { auth_method: 'email' });
          onSuccess(data.session);
        }
      }
    } catch (err: any) {
      posthog?.captureException(err);
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-cursor-sidebar/90 border border-cursor-border rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold bg-linear-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-cursor-text-secondary hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {isMockAuth && (
        <div className="mb-6 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-lg flex gap-2.5 items-start text-xs text-indigo-300">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Mock Local Auth Active</span>
            No external server connection. Accounts are stored locally in your browser cache.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-cursor-border mb-6">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(false);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 mb-[-2px] ${
            !isSignUp 
              ? 'border-indigo-500 text-white font-bold' 
              : 'border-transparent text-cursor-text-secondary hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(true);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 mb-[-2px] ${
            isSignUp 
              ? 'border-indigo-500 text-white font-bold' 
              : 'border-transparent text-cursor-text-secondary hover:text-white'
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-cursor-text-secondary mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cursor-text-secondary pointer-events-none">
              <Mail size={16} />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-cursor-bg border border-cursor-border hover:border-indigo-500/50 focus:border-indigo-500 focus:outline-hidden rounded-lg text-sm text-white placeholder-cursor-text-secondary/50 transition-colors"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-xs font-semibold text-cursor-text-secondary mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cursor-text-secondary pointer-events-none">
              <Lock size={16} />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full pl-10 pr-10 py-2.5 bg-cursor-bg border border-cursor-border hover:border-indigo-500/50 focus:border-indigo-500 focus:outline-hidden rounded-lg text-sm text-white placeholder-cursor-text-secondary/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-cursor-text-secondary hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Please wait...</span>
            </>
          ) : (
            <span>{isSignUp ? 'Create Free Account' : 'Sign In'}</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-cursor-text-secondary leading-relaxed">
          By continuing, you agree to keep your database private and local. All culling computations happen client-side.
        </p>
      </div>
    </div>
  );
};
