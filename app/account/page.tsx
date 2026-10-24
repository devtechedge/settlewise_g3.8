'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { User, Shield, Key, History, Database, Trash2 } from 'lucide-react';

export default function AccountPage() {
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => setSessionData(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 sm:px-6 w-full space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1c2826]">
            Account & Session Security
          </h1>
          <p className="text-xs text-[#70695b] mt-0.5">
            Manage your participant profile, active sessions, and privacy settings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User profile card */}
          <div className="md:col-span-1 bg-[#fcfbf7] border border-[#e5ded0] rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-[#1c2826] text-white flex items-center justify-center font-bold text-xl uppercase">
                {sessionData?.user?.displayName?.[0] || 'U'}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[#1c2826]">
                  {sessionData?.user?.displayName || 'Loading...'}
                </h3>
                <p className="text-xs text-[#70695b] font-mono">
                  {sessionData?.user?.email}
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#ede7da] text-[#554e42] font-mono">
                UID: {sessionData?.user?.uid}
              </span>
            </div>

            <div className="border-t border-[#ece6d9] pt-3 text-xs space-y-2 text-[#554e42]">
              <div className="flex justify-between">
                <span>Account Type:</span>
                <span className="font-semibold text-[#1c2826]">
                  {sessionData?.user?.uid?.startsWith('usr_') ? 'Demo Evaluator' : 'Google Account'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-[#2a5c4d] font-semibold">Active</span>
              </div>
            </div>
          </div>

          {/* Settings & Retention Controls */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-lg p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-serif font-bold text-[#1c2826] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2a5c4d]" />
                <span>Session & Audit Invariants</span>
              </h3>
              <p className="text-xs text-[#554e42] leading-relaxed">
                All ledger mutations performed during this session are recorded with your actor identifier and timestamp. Stale write prevention ensures concurrent group edits are resolved deterministically.
              </p>
            </div>

            <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-lg p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-serif font-bold text-[#8c4b2d] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#8c4b2d]" />
                <span>Data Retention & Deletion</span>
              </h3>
              <p className="text-xs text-[#554e42] leading-relaxed">
                Because shared ledgers involve multi-party financial obligations, deleting an individual account preserves historical transaction balances through participant anonymization.
              </p>
              <div className="pt-2">
                <Link
                  href="/groups"
                  className="px-4 py-2 bg-[#f2ede2] hover:bg-[#eae3d5] text-[#1c2826] border border-[#d8d0bf] rounded text-xs font-semibold inline-block"
                >
                  Return to Group Ledgers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
