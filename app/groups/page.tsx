'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { Building, PlusCircle, ArrowRight, ShieldCheck, Calendar, Users, DollarSign } from 'lucide-react';
import { formatMoney } from '@/domain/money/decimal.ts';

export default function GroupsCatalogPage() {
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/groups')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setGroupsList(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sw-bg)]">
      <DisclaimerBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--sw-border)]">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--sw-ink)]">
              Your Shared Expense Ledgers
            </h1>
            <p className="text-xs text-[var(--sw-muted)] mt-0.5">
              Select an authorized group to review transactions, reconcile balances, or record settlements.
            </p>
          </div>

          <Link
            href="/groups/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--sw-accent)] hover:bg-[var(--sw-accent-strong)] text-[var(--sw-on-ink)] rounded-md text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Group</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--sw-muted)]">
            Loading groups from PostgreSQL...
          </div>
        ) : groupsList.length === 0 ? (
          <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-xl p-12 text-center space-y-3">
            <Building className="w-10 h-10 text-[#8c8273] mx-auto" />
            <h3 className="font-serif font-bold text-base text-[var(--sw-ink)]">No Ledgers Yet</h3>
            <p className="text-xs text-[var(--sw-muted)] max-w-md mx-auto">
              Create a group for your apartment, trip, or event to begin recording shared expenses.
            </p>
            <Link
              href="/groups/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--sw-accent)] text-[var(--sw-on-accent)] rounded text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Group</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupsList.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="group bg-[var(--sw-surface)] border border-[var(--sw-border)] hover:border-[#b8ae9d] rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-serif font-bold text-lg text-[var(--sw-ink)] group-hover:text-[var(--sw-accent)] transition-colors">
                      {g.name}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--sw-warm)] text-[var(--sw-body)] shrink-0">
                      {g.canonicalCurrency}
                    </span>
                  </div>

                  {g.description && (
                    <p className="text-xs text-[var(--sw-body)] line-clamp-2 leading-relaxed">
                      {g.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-[var(--sw-muted)] pt-1">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--sw-surface-muted)] text-[10px] font-mono">
                      Role: {g.role}
                    </span>
                    {g.budgetMinorUnits && (
                      <span className="text-[11px] font-mono">
                        Budget: {formatMoney(BigInt(g.budgetMinorUnits), g.canonicalCurrency)} / {g.budgetPeriod}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--sw-divide)] mt-4 pt-3 flex items-center justify-between text-xs text-[var(--sw-accent)] font-semibold">
                  <span>Open Ledger & Settlement</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
