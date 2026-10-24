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
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-8 shadow-sm space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#ede7da] text-[#2a5c4d] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>

          {loading ? (
            <p className="text-xs text-[#70695b]">Verifying invitation token...</p>
          ) : errorMsg ? (
            <div className="space-y-4">
              <h2 className="text-lg font-serif font-bold text-[#8c4b2d] flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>Invitation Error</span>
              </h2>
              <p className="text-xs text-[#554e42]">{errorMsg}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#70695b]">
                  Group Invitation
                </span>
                <h2 className="text-xl font-serif font-bold text-[#1c2826] mt-1">
                  Join "{invData?.groupName}"
                </h2>
                {invData?.groupDescription && (
                  <p className="text-xs text-[#554e42] mt-1 italic">
                    "{invData.groupDescription}"
                  </p>
                )}
              </div>

              <div className="bg-[#f7f4eb] border border-[#e2dacf] p-3 rounded-lg text-xs space-y-1.5 text-left">
                <div className="flex justify-between">
                  <span className="text-[#70695b]">Invited Role:</span>
                  <span className="font-semibold text-[#1c2826]">{invData?.invitation?.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70695b]">Currency:</span>
                  <span className="font-mono text-[#1c2826]">{invData?.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70695b]">Status:</span>
                  <span className="text-[#2a5c4d] font-semibold">Active & Valid</span>
                </div>
              </div>

              <button
                type="button"
                disabled={accepting}
                onClick={handleAccept}
                className="w-full py-2.5 px-4 bg-[#2a5c4d] hover:bg-[#20473b] text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
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
