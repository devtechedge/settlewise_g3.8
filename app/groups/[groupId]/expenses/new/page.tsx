'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { SplitEditor } from '@/components/SplitEditor.tsx';
import { AllocationMethod } from '@/domain/money/allocations.ts';
import { ArrowLeft, PlusCircle, AlertCircle } from 'lucide-react';

export default function NewExpensePage() {
  const params = useParams();
  const groupId = params?.groupId as string;
  const router = useRouter();

  const [group, setGroup] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [occurrenceDate, setOccurrenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [payerParticipantId, setPayerParticipantId] = useState('');
  const [notes, setNotes] = useState('');

  // Allocation State
  const [method, setMethod] = useState<AllocationMethod>('EQUAL');
  const [equalParticipants, setEqualParticipants] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((g) => {
        setGroup(g);
        if (g.participants && g.participants.length > 0) {
          setParticipants(g.participants);
          setPayerParticipantId(g.participants[0].id);
          const allIds = g.participants.map((p: any) => p.id);
          setEqualParticipants(allIds);

          // Default percentage: equal division in percentages
          const equalPct = (100 / allIds.length).toFixed(2);
          const pMap: Record<string, string> = {};
          allIds.forEach((id: string) => (pMap[id] = equalPct));
          setPercentages(pMap);

          // Default shares: 1
          const sMap: Record<string, string> = {};
          allIds.forEach((id: string) => (sMap[id] = '1'));
          setShares(sMap);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [groupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount.trim() || !payerParticipantId) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        description: description.trim(),
        amount: amount.trim(),
        category,
        occurrenceDate,
        payerParticipantId,
        notes: notes.trim() || undefined,
        allocationMethod: method,
      };

      if (method === 'EQUAL') {
        payload.equalParticipants = equalParticipants;
      } else if (method === 'EXACT') {
        payload.exactAllocations = Object.entries(exactAmounts)
          .filter(([_, v]) => v && v.trim())
          .map(([pid, val]) => ({ participantId: pid, amount: val }));
      } else if (method === 'PERCENTAGE') {
        payload.percentageAllocations = Object.entries(percentages)
          .filter(([_, v]) => v && v.trim())
          .map(([pid, val]) => ({
            participantId: pid,
            basisPoints: Math.round(parseFloat(val) * 100),
          }));
      } else if (method === 'SHARES') {
        payload.sharesAllocations = Object.entries(shares)
          .filter(([_, v]) => v && parseInt(v) > 0)
          .map(([pid, val]) => ({
            participantId: pid,
            weight: parseInt(val),
          }));
      }

      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create expense');

      router.push(`/groups/${groupId}/expenses`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar groupId={groupId} />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 sm:px-6 w-full space-y-6">
        <div>
          <Link
            href={`/groups/${groupId}/expenses`}
            className="text-xs text-[#70695b] hover:text-[#1c2826] flex items-center gap-1 font-medium mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Ledger</span>
          </Link>
          <h1 className="font-serif text-2xl font-bold text-[#1c2826]">
            Record Shared Expense
          </h1>
          <p className="text-xs text-[#70695b] mt-0.5">
            Add a purchase to {group?.name || 'Group'}. Allocations will update net balances automatically.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#fdf2ee] border border-[#f3cbbd] rounded-md text-xs text-[#8c4b2d] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Weekly Groceries, Electricity Bill, Train Tickets"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                Amount ({group?.canonicalCurrency || 'USD'}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs font-mono font-semibold focus:outline-[#2a5c4d]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
              >
                <option value="Groceries">Groceries</option>
                <option value="Rent & Utilities">Rent & Utilities</option>
                <option value="Dining">Dining</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Supplies">Supplies</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                Occurrence Date *
              </label>
              <input
                type="date"
                required
                value={occurrenceDate}
                onChange={(e) => setOccurrenceDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                Paid By (Payer) *
              </label>
              <select
                value={payerParticipantId}
                onChange={(e) => setPayerParticipantId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Allocation Split Matrix */}
          <div>
            <label className="block text-xs font-semibold text-[#5a5448] mb-2">
              Split Breakdown Among Beneficiaries
            </label>
            <SplitEditor
              participants={participants}
              currency={group?.canonicalCurrency || 'USD'}
              amountStr={amount}
              method={method}
              onMethodChange={setMethod}
              equalParticipants={equalParticipants}
              onEqualParticipantsChange={setEqualParticipants}
              exactAmounts={exactAmounts}
              onExactAmountsChange={setExactAmounts}
              percentages={percentages}
              onPercentagesChange={setPercentages}
              shares={shares}
              onSharesChange={setShares}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#5a5448] mb-1">
              Notes / Receipt Details (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Receipt itemized in pantry folder, wire ref #89421"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2dacf]">
            <Link
              href={`/groups/${groupId}/expenses`}
              className="px-4 py-2 text-xs text-[#554e42] hover:bg-[#ede7da] rounded-md"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#2a5c4d] hover:bg-[#20473b] text-white rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submitting ? 'Recording...' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
