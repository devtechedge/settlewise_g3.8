'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { formatMoney } from '@/domain/money/decimal.ts';
import { PieChart, Download, ArrowLeft, BarChart3, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const params = useParams();
  const groupId = params?.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    Promise.all([
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}/expenses`).then((r) => r.json()),
    ])
      .then(([grp, exps]) => {
        setGroup(grp);
        if (Array.isArray(exps)) setExpenses(exps);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [groupId]);

  // Aggregate by Category (only ACTIVE expenses)
  const categoryTotals: Record<string, bigint> = {};
  let totalSpending = 0n;

  // Aggregate by Participant
  const participantPaidTotals: Record<string, bigint> = {};

  expenses.forEach((e) => {
    if (e.status !== 'ACTIVE') return;
    const amount = BigInt(e.amountMinorUnits);
    totalSpending += amount;

    // Category
    categoryTotals[e.category] = (categoryTotals[e.category] || 0n) + amount;

    // Payer
    participantPaidTotals[e.payerName] = (participantPaidTotals[e.payerName] || 0n) + amount;
  });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => (b[1] > a[1] ? 1 : -1));
  const sortedPayers = Object.entries(participantPaidTotals).sort((a, b) => (b[1] > a[1] ? 1 : -1));

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sw-bg)]">
      <DisclaimerBanner />
      <Navbar groupId={groupId} />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:px-6 w-full space-y-6">
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
              Spending Reports & Analytics
            </h1>
            <p className="text-xs text-[var(--sw-muted)] mt-0.5">
              Derived from verified PostgreSQL ledger records for {group?.name || 'Group'}.
            </p>
          </div>

          <a
            href={`/api/groups/${groupId}/export`}
            download
            className="px-4 py-2 bg-[var(--sw-accent)] hover:bg-[var(--sw-accent-strong)] text-[var(--sw-on-ink)] rounded-md text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Download Verified CSV Export</span>
          </a>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--sw-muted)]">
            Compiling ledger analytics...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-xl p-6 shadow-xs space-y-4">
              <h2 className="font-serif font-bold text-sm text-[var(--sw-ink)] pb-2 border-b border-[var(--sw-border-soft)] flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[var(--sw-accent)]" />
                <span>Spending by Category</span>
              </h2>

              {sortedCategories.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--sw-muted)]">
                  No active expenses recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedCategories.map(([cat, amount]) => {
                    const pct = totalSpending > 0n ? Number((amount * 100n) / totalSpending) : 0;
                    return (
                      <div key={cat} className="space-y-1 text-xs">
                        <div className="flex justify-between items-baseline">
                          <span className="font-medium text-[var(--sw-ink)]">{cat}</span>
                          <span className="font-mono tabular-nums text-[var(--sw-body)]">
                            {formatMoney(amount, group?.canonicalCurrency)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-[var(--sw-warm)] rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[var(--sw-accent)] h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payer Contributions */}
            <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-xl p-6 shadow-xs space-y-4">
              <h2 className="font-serif font-bold text-sm text-[var(--sw-ink)] pb-2 border-b border-[var(--sw-border-soft)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--sw-blue)]" />
                <span>Contributions by Payer</span>
              </h2>

              {sortedPayers.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--sw-muted)]">
                  No active expenses recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedPayers.map(([payer, amount]) => {
                    const pct = totalSpending > 0n ? Number((amount * 100n) / totalSpending) : 0;
                    return (
                      <div key={payer} className="space-y-1 text-xs">
                        <div className="flex justify-between items-baseline">
                          <span className="font-medium text-[var(--sw-ink)]">{payer}</span>
                          <span className="font-mono tabular-nums text-[var(--sw-body)]">
                            {formatMoney(amount, group?.canonicalCurrency)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-[var(--sw-warm)] rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[var(--sw-blue)] h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
