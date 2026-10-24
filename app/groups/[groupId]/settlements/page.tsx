'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { SettlementFlow } from '@/components/SettlementFlow.tsx';
import { formatMoney } from '@/domain/money/decimal.ts';
import { Scale, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SettlementsPage() {
  const params = useParams();
  const groupId = params?.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [settlementState, setSettlementState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettlements = useCallback(() => {
    if (!groupId) return;
    Promise.all([
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}/settlements`).then((r) => r.json()),
    ])
      .then(([grp, settl]) => {
        setGroup(grp);
        setSettlementState(settl);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sw-bg)]">
      <DisclaimerBanner />
      <Navbar groupId={groupId} />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--sw-border)]">
          <div>
            <Link
              href={`/groups/${groupId}`}
              className="text-xs text-[var(--sw-muted)] hover:text-[var(--sw-ink)] flex items-center gap-1 font-medium mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--sw-ink)]">
              Settlement Plan & Balances
            </h1>
            <p className="text-xs text-[var(--sw-muted)] mt-0.5">
              Deterministic consolidation of all active expenses and recorded reimbursements in {group?.name || 'Group'}.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSettlements}
            className="px-3 py-1.5 bg-[var(--sw-surface-muted)] hover:bg-[var(--sw-warm)] text-[var(--sw-ink)] border border-[var(--sw-border-strong)] rounded text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--sw-muted)]">
            Computing deterministic settlement matrix...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Participant Balance Summaries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {settlementState?.balances?.map((b: any) => {
                const net = BigInt(b.netBalance);
                const isPositive = net > 0n;
                const isNegative = net < 0n;
                return (
                  <div
                    key={b.participantId}
                    className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg p-4 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: b.color || '#4a6b6c' }}
                        />
                        <span className="font-semibold text-xs text-[var(--sw-ink)]">{b.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isPositive
                            ? 'bg-[var(--sw-positive-bg)] text-[var(--sw-accent)]'
                            : isNegative
                            ? 'bg-[#f3cbbd] text-[var(--sw-rust)]'
                            : 'bg-[var(--sw-warm)] text-[var(--sw-body)]'
                        }`}
                      >
                        {isPositive ? 'Creditor (+)' : isNegative ? 'Debtor (-)' : 'Zero Balance'}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-[var(--sw-muted)] pt-1">
                      <div className="flex justify-between">
                        <span>Paid for group:</span>
                        <span className="font-mono text-[var(--sw-ink)]">
                          {formatMoney(BigInt(b.totalPaid), group?.canonicalCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allocated share:</span>
                        <span className="font-mono text-[var(--sw-ink)]">
                          {formatMoney(BigInt(b.totalAllocated), group?.canonicalCurrency)}
                        </span>
                      </div>
                      {BigInt(b.paymentsSent) > 0n && (
                        <div className="flex justify-between">
                          <span>Reimbursements sent:</span>
                          <span className="font-mono text-[var(--sw-accent)]">
                            +{formatMoney(BigInt(b.paymentsSent), group?.canonicalCurrency)}
                          </span>
                        </div>
                      )}
                      {BigInt(b.paymentsReceived) > 0n && (
                        <div className="flex justify-between">
                          <span>Reimbursements received:</span>
                          <span className="font-mono text-[var(--sw-rust)]">
                            -{formatMoney(BigInt(b.paymentsReceived), group?.canonicalCurrency)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-[var(--sw-border-soft)] pt-2 flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-[var(--sw-ink)]">Effective Net:</span>
                      <span
                        className={`font-mono font-bold text-sm tabular-nums ${
                          isPositive
                            ? 'text-[var(--sw-accent)]'
                            : isNegative
                            ? 'text-[var(--sw-rust)]'
                            : 'text-[var(--sw-body)]'
                        }`}
                      >
                        {formatMoney(net, group?.canonicalCurrency, { showPlusSign: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Settlement Plan & History */}
            <SettlementFlow
              groupId={groupId}
              currency={group?.canonicalCurrency || 'USD'}
              transfers={settlementState?.plan?.transfers || []}
              payments={settlementState?.payments || []}
              onPaymentRecorded={fetchSettlements}
            />
          </div>
        )}
      </main>
    </div>
  );
}
