'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { Users, CheckCircle, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export default function InviteAcceptPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invData, setInvData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invitations/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setErrorMsg(data.error);
        else setInvData(data);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation');
      router.push(`/groups/${data.groupId}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sw-bg)]">
      <DisclaimerBanner />
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-xl p-8 shadow-sm space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--sw-warm)] text-[var(--sw-accent)] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>

          {loading ? (
            <p className="text-xs text-[var(--sw-muted)]">Verifying invitation token...</p>
          ) : errorMsg ? (
            <div className="space-y-4">
              <h2 className="text-lg font-serif font-bold text-[var(--sw-rust)] flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>Invitation Error</span>
              </h2>
              <p className="text-xs text-[var(--sw-body)]">{errorMsg}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--sw-muted)]">
                  Group Invitation
                </span>
                <h2 className="text-xl font-serif font-bold text-[var(--sw-ink)] mt-1">
                  Join “{invData?.groupName}”
                </h2>
                {invData?.groupDescription && (
                  <p className="text-xs text-[var(--sw-body)] mt-1 italic">
                    “{invData.groupDescription}”
                  </p>
                )}
              </div>

              <div className="bg-[var(--sw-surface-soft)] border border-[var(--sw-border-soft)] p-3 rounded-lg text-xs space-y-1.5 text-left">
                <div className="flex justify-between">
                  <span className="text-[var(--sw-muted)]">Invited Role:</span>
                  <span className="font-semibold text-[var(--sw-ink)]">{invData?.invitation?.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--sw-muted)]">Currency:</span>
                  <span className="font-mono text-[var(--sw-ink)]">{invData?.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--sw-muted)]">Status:</span>
                  <span className="text-[var(--sw-accent)] font-semibold">Active & Valid</span>
                </div>
              </div>

              <button
                type="button"
                disabled={accepting}
                onClick={handleAccept}
                className="w-full py-2.5 px-4 bg-[var(--sw-accent)] hover:bg-[var(--sw-accent-strong)] text-[var(--sw-on-ink)] rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <span>{accepting ? 'Joining Group...' : 'Accept Invitation & Open Ledger'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
