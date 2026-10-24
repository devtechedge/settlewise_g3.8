'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DisclaimerBanner } from '../components/DisclaimerBanner.tsx';
import { Navbar } from '../components/Navbar.tsx';
import {
  Scale,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Receipt,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import { formatMoney } from '../domain/money/decimal.ts';

export default function HomePage() {
  // Interactive illustrative calculator for landing page preview
  const [dinnerAmount, setDinnerAmount] = useState('90.00');
  const [participantsCount, setParticipantsCount] = useState(3);
  const [payerName, setPayerName] = useState('Alice');

  const amountNumber = parseFloat(dinnerAmount) || 0;
  const perPerson = participantsCount > 0 ? (amountNumber / participantsCount).toFixed(2) : '0.00';
  const othersOwe = participantsCount > 0 ? ((amountNumber * (participantsCount - 1)) / participantsCount).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="ledger-paper border-b border-[#e5ded0] py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ede7da] border border-[#d8d0bf] text-xs font-mono text-[#554e42]">
              <Scale className="w-3.5 h-3.5 text-[#2a5c4d]" />
              <span>Exact Integer-Minor-Unit Math • Auditable Ledgers</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-[#1c2826] tracking-tight leading-tight">
              Shared Expense Reconciliation <br />
              <span className="text-[#2a5c4d] font-normal italic">Without the Ambiguity</span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#5a5448] leading-relaxed">
              Settlewise records household and group purchases with verifiable mathematical precision.
              Calculate who owes whom, preserve immutable revision trails, and eliminate awkward math with deterministic settlement plans.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/groups"
                className="px-6 py-3 rounded-md bg-[#2a5c4d] hover:bg-[#20473b] text-[#fbf9f4] text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
              >
                <span>Open Group Ledgers</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/groups/new"
                className="px-6 py-3 rounded-md bg-[#f2ede2] hover:bg-[#eae3d5] text-[#1c2826] border border-[#d8d0bf] text-sm font-semibold transition-all"
              >
                Create New Group
              </Link>
            </div>

            <div className="text-xs text-[#70695b] pt-2">
              ✓ Pre-loaded with fictional <strong>Pine Street Flat</strong> (USD) and <strong>Kyoto Trip 2026</strong> (JPY) demo ledgers.
            </div>
          </div>
        </section>

        {/* Interactive Illustrative Preview */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ece6d9] gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c4b2d] font-bold">
                  Interactive Preview (Illustrative Only)
                </span>
                <h2 className="text-xl font-serif font-bold text-[#1c2826] mt-0.5">
                  How Settlewise Consolidates Debt
                </h2>
              </div>
              <span className="text-xs px-2.5 py-1 bg-[#ede7da] text-[#554e42] rounded font-mono self-start sm:self-auto">
                Deterministic greedy plan
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Controls */}
              <div className="space-y-4 bg-[#f7f4eb] p-4 rounded-lg border border-[#e2dacf]">
                <div className="text-xs font-bold text-[#1c2826] uppercase tracking-wider">
                  Test Transaction
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                    Expense Amount ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={dinnerAmount}
                    onChange={(e) => setDinnerAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs font-mono focus:outline-[#2a5c4d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                    Beneficiaries ({participantsCount} roommates)
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="6"
                    value={participantsCount}
                    onChange={(e) => setParticipantsCount(parseInt(e.target.value))}
                    className="w-full accent-[#2a5c4d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                    Payer
                  </label>
                  <select
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                  >
                    <option value="Alice">Alice Vance</option>
                    <option value="Bob">Bob Chen</option>
                    <option value="Charlie">Charlie Miller</option>
                  </select>
                </div>
              </div>

              {/* Explanatory Output */}
              <div className="flex flex-col justify-between space-y-4 bg-[#fcfbf7] p-4 rounded-lg border border-[#e5ded0]">
                <div>
                  <div className="text-xs font-bold text-[#1c2826] uppercase tracking-wider mb-2">
                    Settlement Outcome
                  </div>
                  <div className="space-y-2 text-xs text-[#554e42]">
                    <div className="flex justify-between py-1 border-b border-[#f0ebd9]">
                      <span>Equal Share Per Beneficiary:</span>
                      <span className="font-mono font-bold text-[#1c2826]">${perPerson}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#f0ebd9]">
                      <span>Payer Net Credit (Is Owed):</span>
                      <span className="font-mono font-bold text-[#2a5c4d]">+${othersOwe}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Other {participantsCount - 1} Roommate(s) Net Owed:</span>
                      <span className="font-mono font-bold text-[#8c4b2d]">-${othersOwe} total</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#ede7da] p-3 rounded-md text-xs text-[#332f27] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-[#1c2826]">
                    <Calculator className="w-3.5 h-3.5 text-[#2a5c4d]" />
                    <span>Explainable Settlement Plan:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#554e42]">
                    Rather than recording multiple separate transfers, Settlewise consolidates the net balances so each debtor transfers directly to {payerName} in 1 payment of ${perPerson}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-[#e5ded0]">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-serif font-bold text-[#1c2826]">
              Engineered for Accuracy & Trust
            </h2>
            <p className="text-xs text-[#70695b] mt-1 max-w-md mx-auto">
              Real relational database persistence, reproducible algorithms, and full auditability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#fcfbf7] border border-[#e5ded0] p-5 rounded-lg space-y-2.5">
              <div className="w-8 h-8 rounded bg-[#f2ede2] flex items-center justify-center text-[#2a5c4d]">
                <Scale className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#1c2826]">
                Exact Minor-Unit Arithmetic
              </h3>
              <p className="text-xs text-[#5a5448] leading-relaxed">
                No JavaScript floating-point rounding errors. Stored as integer pennies/cents with deterministic largest-remainder distribution for odd splits.
              </p>
            </div>

            <div className="bg-[#fcfbf7] border border-[#e5ded0] p-5 rounded-lg space-y-2.5">
              <div className="w-8 h-8 rounded bg-[#f2ede2] flex items-center justify-center text-[#8c4b2d]">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#1c2826]">
                Immutable Audit Trail
              </h3>
              <p className="text-xs text-[#5a5448] leading-relaxed">
                Expense edits require revision preconditions to prevent overwrite conflicts, capturing before/after snapshots and reasons.
              </p>
            </div>

            <div className="bg-[#fcfbf7] border border-[#e5ded0] p-5 rounded-lg space-y-2.5">
              <div className="w-8 h-8 rounded bg-[#f2ede2] flex items-center justify-center text-[#3d6380]">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#1c2826]">
                Trustworthy CSV Imports
              </h3>
              <p className="text-xs text-[#5a5448] leading-relaxed">
                Interactive column mapping, SHA-256 fingerprint duplicate detection, preview validation, and formula-injection-safe exports.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#f7f4eb] border-t border-[#e5ded0] py-8 px-4 sm:px-6 text-center text-xs text-[#70695b] space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs font-medium">
          <Link href="/groups" className="hover:underline text-[#1c2826]">
            Groups
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:underline text-[#1c2826]">
            Privacy & Data Retention
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:underline text-[#1c2826]">
            Terms & Payment Disclaimers
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:underline text-[#1c2826]">
            Login
          </Link>
        </div>
        <p className="text-[11px] text-[#888072]">
          Settlewise is an expense reconciliation tool. It does not provide banking, credit, payment processing, or financial advice.
        </p>
      </footer>
    </div>
  );
}
