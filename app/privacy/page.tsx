import React from 'react';
import Link from 'next/link';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { ShieldCheck, Lock, FileText, Database } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--sw-bg)]">
      <DisclaimerBanner />
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 sm:px-6 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[var(--sw-ink)]">
            Privacy & Data Retention Policy
          </h1>
          <p className="text-xs text-[var(--sw-muted)] mt-1 font-mono">
            Effective Date: October 24, 2026 • Settlewise Compliance Standard
          </p>
        </div>

        <div className="space-y-6 text-xs text-[#443e33] leading-relaxed bg-[var(--sw-surface)] border border-[var(--sw-border)] p-6 sm:p-8 rounded-xl shadow-xs">
          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[var(--sw-ink)] flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--sw-accent)]" />
              <span>1. Financial Ledger Immutability & Retention</span>
            </h2>
            <p>
              In financial reconciliation systems, retroactive silent deletion destroys the mathematical integrity of historical balances and remaining settlement plans.
              Consequently, Settlewise maintains immutable audit trails:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[var(--sw-body)]">
              <li>
                <strong>Expense Revisions:</strong> When an expense is corrected, prior values are preserved in an immutable before/after snapshot log alongside the user-provided audit reason.
              </li>
              <li>
                <strong>Voiding Transactions:</strong> Cancelled expenses are marked with a <code>VOIDED</code> lifecycle status and excluded from active balances, but remain visible in the ledger history.
              </li>
              <li>
                <strong>Payment Reversals:</strong> Erroneous settlement reimbursements are marked as <code>REVERSED</code> with a compensating audit entry, restoring the prior balance without deleting original audit records.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[var(--sw-ink)] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--sw-rust)]" />
              <span>2. No Bank or Payment Card Details Stored</span>
            </h2>
            <p>
              Settlewise is purely a record-keeping and settlement-planning application. We <strong>never</strong> request, collect, store, or transmit payment card numbers, bank account routing details, or banking credentials. Any reimbursements logged within the application represent user-entered confirmation of offline payments (e.g. cash, Zelle, bank transfer).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[var(--sw-ink)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--sw-blue)]" />
              <span>3. Data Export & Deletion Rights</span>
            </h2>
            <p>
              Group owners have the right to export the complete ledger to CSV at any time from the Reports tab. In accordance with privacy standards, account deactivation anonymizes user profile identifiers while preserving the structural balance consistency of shared group ledgers.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
