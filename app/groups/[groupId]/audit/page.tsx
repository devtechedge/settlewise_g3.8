'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { History, ArrowLeft, Shield, Clock, User, Tag } from 'lucide-react';

export default function AuditTrailPage() {
  const params = useParams();
  const groupId = params?.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    Promise.all([
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}/audit`).then((r) => r.json()),
    ])
      .then(([grp, evs]) => {
        setGroup(grp);
        if (Array.isArray(evs)) setEvents(evs);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [groupId]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar groupId={groupId} />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:px-6 w-full space-y-6">
        <div>
          <Link
            href={`/groups/${groupId}`}
            className="text-xs text-[#70695b] hover:text-[#1c2826] flex items-center gap-1 font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1c2826]">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-[#70695b] mt-0.5">
            Chronological log of all ledger mutations, expense revisions, payment reversals, and participant additions in {group?.name || 'Group'}.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#70695b]">
            Loading audit records from PostgreSQL...
          </div>
        ) : events.length === 0 ? (
          <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-10 text-center text-xs text-[#70695b]">
            No audit records found.
          </div>
        ) : (
          <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl shadow-xs overflow-hidden">
            <div className="divide-y divide-[#ece6d9]">
              {events.map((ev) => {
                let badgeColor = 'bg-[#ede7da] text-[#554e42]';
                if (ev.action.includes('EXPENSE_CREATED')) badgeColor = 'bg-[#c5d8cb] text-[#2a5c4d]';
                else if (ev.action.includes('EXPENSE_VOIDED') || ev.action.includes('REVERSED'))
                  badgeColor = 'bg-[#f3cbbd] text-[#8c4b2d]';
                else if (ev.action.includes('EDITED')) badgeColor = 'bg-[#f4eee1] text-[#70695b]';

                return (
                  <div key={ev.id} className="p-4 hover:bg-[#faf7ee] transition-colors text-xs space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${badgeColor}`}>
                          {ev.action}
                        </span>
                        <span className="font-semibold text-[#1c2826]">
                          By {ev.actorName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#70695b] font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(ev.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-[#443e33]">
                      <strong>Action Description:</strong> {ev.reason || 'No description provided'}
                    </div>

                    <div className="text-[10px] text-[#70695b] font-mono">
                      Target: {ev.targetType} ({ev.targetId})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
