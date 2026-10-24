import React from 'react';
import Link from 'next/link';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { ShieldAlert, Scale, HelpCircle } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 sm:px-6 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1c2826]">
            Terms of Service & Non-Payment Disclaimer
          </h1>
          <p className="text-xs text-[#70695b] mt-1 font-mono">
            Settlewise Regulatory Boundaries
          </p>
        </div>

        <div className="space-y-6 text-xs text-[#443e33] leading-relaxed bg-[#fcfbf7] border border-[#e5ded0] p-6 sm:p-8 rounded-xl shadow-xs">
          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#8c4b2d] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#8c4b2d]" />
              <span>1. Essential Financial Boundary</span>
            </h2>
            <div className="p-3 bg-[#fdf2ee] border border-[#f3cbbd] rounded-md font-medium text-[#7a3419]">
              Settlewise is NOT a bank, payment processor, credit facility, money transmitter, or provider of financial advice. Settlewise does not initiate, authorize, or facilitate real-world monetary transfers.
            </div>
            <p>
              The label "Suggested settlement plan" represents an algorithmic recommendation intended to simplify inter-participant debt. Clicking "Record Reimbursement" serves solely as a bookkeeping acknowledgment that participants have settled outside the application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#1c2826] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#2a5c4d]" />
              <span>2. Algorithmic Optimization Scope</span>
            </h2>
            <p>
              The settlement engine applies a deterministic greedy matching strategy to consolidate multiple bilateral debts into a minimal set of transfers. While this significantly reduces transaction counts compared to settling individual receipts, Settlewise does not warrant that every computed transfer graph is universally optimal under all NP-hard min-cost circulation constraints.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#1c2826] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#3d6380]" />
              <span>3. User Responsibility & Currency Lock</span>
            </h2>
            <p>
              Users are responsible for ensuring that transaction descriptions, dates, and amounts entered or imported from CSV files correspond to actual shared purchases. Once financial records exist in a group, its canonical currency cannot be silently converted without full auditable ledger migration.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
