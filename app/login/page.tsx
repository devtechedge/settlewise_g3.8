'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { auth, googleAuthProvider } from '@/lib/firebase.ts';
import { signInWithPopup } from 'firebase/auth';
import { DEMO_USERS } from '@/lib/auth-types.ts';
import { ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const user = cred.user;

      // Register session with backend
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoUrl: user.photoURL,
        }),
      });

      if (!res.ok) throw new Error('Failed to create server session');
      router.push('/groups');
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setErrorMsg(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (uid: string) => {
    setLoading(true);
    setErrorMsg(null);
    const demoUser = DEMO_USERS[uid];
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoUser),
      });

      if (!res.ok) throw new Error('Failed to set demo session');
      router.push('/groups');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-md bg-[#1c2826] text-white flex items-center justify-center font-bold text-lg mx-auto mb-3">
              SW
            </div>
            <h1 className="text-xl font-serif font-bold text-[#1c2826]">
              Sign In to Settlewise
            </h1>
            <p className="text-xs text-[#70695b]">
              Access your auditable shared expense ledgers
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-[#fdf2ee] border border-[#f3cbbd] rounded-md text-xs text-[#8c4b2d] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign In */}
          <div>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-[#faf7ee] text-[#1c2826] border border-[#cfc6b5] rounded-md text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e5ded0]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-[#fcfbf7] px-2 text-[#70695b]">
                Or Instant Evaluator Access
              </span>
            </div>
          </div>

          {/* Quick Evaluator Access */}
          <div className="space-y-2">
            {[
              { id: 'usr_alice', name: 'Alice Vance', role: 'Owner Role (Full Permissions)' },
              { id: 'usr_bob', name: 'Bob Chen', role: 'Editor Role (Record & Edit)' },
              { id: 'usr_charlie', name: 'Charlie Miller', role: 'Member Role (View & Settle)' },
            ].map((ev) => (
              <button
                key={ev.id}
                type="button"
                disabled={loading}
                onClick={() => handleDemoSignIn(ev.id)}
                className="w-full text-left p-2.5 rounded-md border border-[#dfd7c8] bg-[#f7f4eb] hover:bg-[#ede7da] transition-all flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-[#1c2826]">{ev.name}</div>
                  <div className="text-[10px] text-[#70695b]">{ev.role}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#554e42]" />
              </button>
            ))}
          </div>

          <div className="text-center text-xs text-[#70695b] pt-2">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#2a5c4d] font-semibold hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
