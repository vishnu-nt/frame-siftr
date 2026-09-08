import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { supabase } from './services/supabaseClient';
import { AUTH_ENABLED } from './config/featureFlags';
import './App.css';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(AUTH_ENABLED);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!AUTH_ENABLED) return;

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setLoading(false);
    });

    // Listen to authentication changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">Loading workspace...</span>
        </div>
      </div>
    );
  }

  const hasEnteredApp = AUTH_ENABLED ? !!session : entered;

  if (!hasEnteredApp) {
    return (
      <LandingPage
        onSuccessAuth={(sess) => {
          if (AUTH_ENABLED) {
            setSession(sess);
          } else {
            setEntered(true);
          }
        }}
      />
    );
  }

  return (
    <div className="App">
      <Layout />
    </div>
  );
}

export default App;

