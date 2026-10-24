'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import {
  Scale,
  Receipt,
  Users,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  History,
  CheckCircle2,
} from 'lucide-react';
import { formatMoney } from '@/domain/money/decimal.ts';

export default function GroupOverviewPage() {
  const params = useParams();
  const groupId = params?.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [settlementState, setSettlementState] = useState<any>(null);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!groupId) return;
    Promise.all([
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}/settlements`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}/expenses`).then((r) => r.json()),
    ])
      .then(([grpData, settlData, expData]) => {
        setGroup(grpData);
        setSettlementState(settlData);
        if (Array.isArray(expData)) setRecentExpenses(expData.slice(0, 5));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--sw-bg)]">
        <DisclaimerBanner />
        <Navbar groupId={groupId} />
        <div className="p-12 text-center text-xs text-[var(--sw-muted)]">
          Loading group overview from PostgreSQL...
        </div>
      </div>
    );
  }

  if (!group || group.error) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--sw-bg)]">
        <DisclaimerBanner />
        <Navbar groupId={groupId} />
        <div className="p-12 text-center text-xs text-[var(--sw-rust)]">
          {group?.error || 'Group not found or access denied.'}
        </div>
      </div>
    );
  }

  // Calculate total active spending
  const totalSpendingMinor = recentExpenses.reduce((acc, exp) => {
    if (exp.status === 'ACTIVE') return acc + BigInt(exp.amountMinorUnits);
    return acc;
  }, 0n);

  const budgetMinor = group.budgetMinorUnits ? BigInt(group.budgetMinorUnits) : null;
  const budgetPercent = budgetMinor && budgetMinor > 0n
    ? Number((totalSpendingMinor * 100n) / budgetMinor)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sw-bg)]">
      <DisclaimerBanner />
      <Navbar groupId={groupId} />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--sw-border)] gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--sw-ink)]">
                {group.name}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--sw-warm)] text-[var(--sw-body)]">
                {group.canonicalCurrency}
              </span>
            </div>
            {group.description && (
              <p className="text-xs text-[var(--sw-muted)] mt-1">{group.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href={`/groups/${groupId}/expenses/new`}
              className="px-3.5 py-2 bg-[var(--sw-accent)] hover:bg-[var(--sw-accent-strong)] text-[var(--sw-on-ink)] rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </Link>
            <Link
              href={`/groups/${groupId}/settlements`}
              className="px-3.5 py-2 bg-[var(--sw-surface-muted)] hover:bg-[var(--sw-warm)] text-[var(--sw-ink)] border border-[var(--sw-border-strong)] rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Settlement Plan</span>
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Spending */}
          <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg p-4 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-[var(--sw-muted)] uppercase tracking-wider">
              Total Spending
            </span>
            <div className="font-mono text-2xl font-bold text-[var(--sw-ink)] tabular-nums">
              {formatMoney(totalSpendingMinor, group.canonicalCurrency)}
            </div>
            <div className="text-[10px] text-[var(--sw-muted)]">Across all active records</div>
          </div>

          {/* Budget Progress */}
          <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg p-4 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-[11px] font-semibold uppercase tracking-wider text-[var(--sw-muted)]">
              <span>Budget Usage</span>
              {budgetPercent !== null && (
                <span className={budgetPercent > 100 ? 'text-[var(--sw-rust)]' : 'text-[var(--sw-accent)]'}>
                  {budgetPercent}%
                </span>
              )}
            </div>
            <div className="font-mono text-xs font-bold text-[var(--sw-ink)]">
              {budgetMinor
                ? `${formatMoney(budgetMinor, group.canonicalCurrency)} / ${group.budgetPeriod}`
                : 'No budget set'}
            </div>
            {budgetPercent !== null && (
              <div className="w-full bg-[var(--sw-warm)] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    budgetPercent > 100 ? 'bg-[var(--sw-rust)]' : 'bg-[var(--sw-accent)]'
                  }`}
                  style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Settlement Value */}
          <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg p-4 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-[var(--sw-muted)] uppercase tracking-wider">
              Unsettled Transfers
            </span>
            <div className="font-mono text-2xl font-bold text-[var(--sw-rust)] tabular-nums">
              {settlementState?.plan
                ? formatMoney(
                    BigInt(settlementState.plan.totalSettlementValueMinorUnits),
                    group.canonicalCurrency
                  )
                : '—'}
            </div>
            <div className="text-[10px] text-[var(--sw-muted)]">
              {settlementState?.plan?.transfers?.length || 0} transfer(s) to balance
            </div>
          </div>

          {/* Participants */}
          <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg p-4 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-[var(--sw-muted)] uppercase tracking-wider">
              Group Roster
            </span>
            <div className="text-2xl font-bold text-[var(--sw-ink)]">
              {group.participants?.length || 0}{' '}
              <span className="text-xs font-normal text-[var(--sw-muted)]">members</span>
            </div>
            <div className="text-[10px] text-[var(--sw-muted)]">
              Your role: <strong className="text-[var(--sw-ink)]">{group.userRole}</strong>
            </div>
          </div>
        </div>

        {/* Current Balances Grid */}
        <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--sw-border-soft)]">
            <div>
              <h2 className="text-base font-serif font-bold text-[var(--sw-ink)]">
                Participant Net Balances
              </h2>
              <p className="text-xs text-[var(--sw-muted)]">
                Positive = is owed money (creditor); Negative = owes money (debtor). Sum of all balances is exactly zero.
              </p>
            </div>
            <Link
              href={`/groups/${groupId}/settlements`}
              className="text-xs text-[var(--sw-accent)] hover:underline font-semibold flex items-center gap-1"
            >
              <span>Settlement Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {settlementState?.balances?.map((b: any) => {
              const net = BigInt(b.netBalance);
              const isPositive = net > 0n;
              const isNegative = net < 0n;
              const isZero = net === 0n;

              return (
                <div
                  key={b.participantId}
                  className="bg-[var(--sw-surface-soft)] border border-[var(--sw-border-soft)] p-3.5 rounded-md flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
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
                      {isPositive ? 'Is Owed' : isNegative ? 'Owes' : 'Settled'}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-1 border-t border-[var(--sw-divide)]">
                    <span className="text-[11px] text-[var(--sw-muted)]">Net Balance:</span>
                    <span
                      className={`font-mono font-bold text-sm tabular-nums ${
                        isPositive
                          ? 'text-[var(--sw-accent)]'
                          : isNegative
                          ? 'text-[var(--sw-rust)]'
                          : 'text-[var(--sw-body)]'
                      }`}
                    >
                      {formatMoney(net, group.canonicalCurrency, { showPlusSign: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Suggested Next Actions & Recent Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Suggested Transfers Summary */}
          <div className="lg:col-span-1 bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-serif font-bold text-[var(--sw-ink)]">
                Next Settlement Action
              </h3>
              <p className="text-xs text-[var(--sw-muted)] mt-0.5 mb-3">
                Current recommended reimbursements to balance the group ledger.
              </p>

              {settlementState?.plan?.transfers?.length === 0 ? (
                <div className="p-4 bg-[var(--sw-surface-muted)] rounded text-xs text-[var(--sw-accent)] text-center font-medium">
                  ✓ All participant balances are zero. Fully settled.
                </div>
              ) : (
                <div className="space-y-2">
                  {settlementState?.plan?.transfers?.slice(0, 3).map((t: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[var(--sw-surface-soft)] border border-[var(--sw-border-soft)] rounded text-xs flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <span className="font-semibold text-[var(--sw-rust)]">{t.senderName}</span>
                        <span className="text-[var(--sw-muted)]"> pays </span>
                        <span className="font-semibold text-[var(--sw-accent)]">{t.recipientName}</span>
                      </div>
                      <span className="font-mono font-bold text-xs tabular-nums text-[var(--sw-ink)] shrink-0">
                        {formatMoney(BigInt(t.amountMinorUnits), group.canonicalCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link
              href={`/groups/${groupId}/settlements`}
              className="w-full py-2 bg-[var(--sw-ink)] hover:bg-[var(--sw-ink-soft)] text-[var(--sw-on-ink)] rounded text-xs font-semibold text-center transition-colors shadow-xs"
            >
              View Full Settlement Plan & Record Payment
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--sw-border-soft)]">
              <h3 className="text-sm font-serif font-bold text-[var(--sw-ink)]">
                Recent Expenses
              </h3>
              <Link
                href={`/groups/${groupId}/expenses`}
                className="text-xs text-[var(--sw-accent)] hover:underline font-semibold flex items-center gap-1"
              >
                <span>View Full Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentExpenses.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--sw-muted)]">
                No expenses recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--sw-divide)]">
                {recentExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[var(--sw-ink)] flex items-center gap-1.5">
                        <Link
                          href={`/groups/${groupId}/expenses/${exp.id}`}
                          className="hover:underline hover:text-[var(--sw-accent)]"
                        >
                          {exp.description}
                        </Link>
                        {exp.status === 'VOIDED' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-[#f3cbbd] text-[var(--sw-rust)] rounded font-semibold">
                            VOIDED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--sw-muted)] mt-0.5">
                        {exp.occurrenceDate} • Paid by {exp.payerName} ({exp.category})
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-xs tabular-nums text-[var(--sw-ink)]">
                      {formatMoney(BigInt(exp.amountMinorUnits), group.canonicalCurrency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
