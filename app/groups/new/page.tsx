'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { CURRENCY_REGISTRY } from '@/domain/money/currency.ts';
import { Plus, Trash2, ArrowRight, AlertCircle, Building } from 'lucide-react';

export default function CreateGroupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [budget, setBudget] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState('monthly');
  const [participantNames, setParticipantNames] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addParticipantField = () => {
    setParticipantNames([...participantNames, '']);
  };

  const updateParticipantName = (idx: number, val: string) => {
    const copy = [...participantNames];
    copy[idx] = val;
    setParticipantNames(copy);
  };

  const removeParticipantField = (idx: number) => {
    if (participantNames.length <= 1) return;
    setParticipantNames(participantNames.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const filteredParticipants = participantNames.filter((p) => p.trim());

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          canonicalCurrency: currency,
          budget: budget.trim() || undefined,
          budgetPeriod,
          initialParticipants: filteredParticipants,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');

      router.push(`/groups/${data.groupId}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 sm:px-6 w-full">
        <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-bold text-[#1c2826]">
              Create New Expense Group
            </h1>
            <p className="text-xs text-[#70695b]">
              Establish a new shared ledger with a locked canonical currency and initial member roster.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-[#fdf2ee] border border-[#f3cbbd] rounded-md text-xs text-[#8c4b2d] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Group Name */}
            <div>
              <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                Group Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 742 Evergreen Terrace, Lake Tahoe Cabin 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Brief purpose of this shared ledger"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
              />
            </div>

            {/* Canonical Currency */}
            <div>
              <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                Canonical Currency (Locked upon creation) *
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
              >
                {Object.values(CURRENCY_REGISTRY).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol}, {c.decimals} decimals)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#70695b] mt-1">
                To guarantee mathematical precision, all transactions in this group must use this currency.
              </p>
            </div>

            {/* Budget Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Budget Threshold (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2500.00"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs font-mono focus:outline-[#2a5c4d]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Budget Period
                </label>
                <select
                  value={budgetPeriod}
                  onChange={(e) => setBudgetPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
                >
                  <option value="monthly">Monthly Cycle</option>
                  <option value="total">Total Lifetime Limit</option>
                </select>
              </div>
            </div>

            {/* Initial Participants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[#5a5448]">
                  Other Participants (Roommates / Friends)
                </label>
                <button
                  type="button"
                  onClick={addParticipantField}
                  className="text-xs text-[#2a5c4d] hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Person</span>
                </button>
              </div>
              <div className="space-y-2">
                {participantNames.map((pName, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Participant ${idx + 2} name`}
                      value={pName}
                      onChange={(e) => updateParticipantName(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#cfc6b5] rounded-md text-xs focus:outline-[#2a5c4d]"
                    />
                    {participantNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticipantField(idx)}
                        className="p-1.5 text-[#8c4b2d] hover:bg-[#f8e5de] rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#70695b] mt-1.5">
                You will be automatically added as Owner. Invited members can link their login accounts later.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2dacf]">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-xs text-[#554e42] hover:bg-[#ede7da] rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#2a5c4d] hover:bg-[#20473b] text-white rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                <span>{loading ? 'Creating...' : 'Create Group Ledger'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
