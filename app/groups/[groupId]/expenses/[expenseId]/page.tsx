'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { SplitEditor } from '@/components/SplitEditor.tsx';
import { AllocationMethod } from '@/domain/money/allocations.ts';
import { formatMoney, formatMinorUnitsToDecimal } from '@/domain/money/decimal.ts';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Receipt,
  FileText,
} from 'lucide-react';

export default function ExpenseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params?.groupId as string;
  const expenseId = params?.expenseId as string;
  const router = useRouter();

  const [expense, setExpense] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit mode toggle
  const [isEditing, setIsEditing] = useState(searchParams?.get('edit') === 'true');

  // Edit form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [occurrenceDate, setOccurrenceDate] = useState('');
  const [payerParticipantId, setPayerParticipantId] = useState('');
  const [notes, setNotes] = useState('');
  const [editReason, setEditReason] = useState('');

  // Allocation State for Edit
  const [method, setMethod] = useState<AllocationMethod>('EQUAL');
  const [equalParticipants, setEqualParticipants] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDetails = () => {
    if (!expenseId || !groupId) return;
    Promise.all([
      fetch(`/api/expenses/${expenseId}`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
    ])
      .then(([expData, grpData]) => {
        setExpense(expData);
        setGroup(grpData);
        if (grpData.participants) setParticipants(grpData.participants);

        // Prepopulate edit fields
        setDescription(expData.description);
        const decAmount = formatMinorUnitsToDecimal(BigInt(expData.amountMinorUnits), grpData.canonicalCurrency);
        setAmount(decAmount);
        setCategory(expData.category);
        setOccurrenceDate(expData.occurrenceDate);
        setPayerParticipantId(expData.payerParticipantId);
        setNotes(expData.notes || '');

        // Splits prepopulation
        const firstSplitMethod = expData.splits?.[0]?.allocationMethod as AllocationMethod;
        setMethod(firstSplitMethod || 'EQUAL');

        const splitPids = expData.splits.map((s: any) => s.participantId);
        setEqualParticipants(splitPids);

        const exMap: Record<string, string> = {};
        const pMap: Record<string, string> = {};
        const sMap: Record<string, string> = {};

        expData.splits.forEach((s: any) => {
          exMap[s.participantId] = formatMinorUnitsToDecimal(
            BigInt(s.allocatedMinorUnits),
            grpData.canonicalCurrency
          );
          if (s.basisPoints) {
            pMap[s.participantId] = (s.basisPoints / 100).toFixed(2);
          }
          if (s.shareWeight) {
            sMap[s.participantId] = s.shareWeight.toString();
          }
        });

        setExactAmounts(exMap);
        setPercentages(pMap);
        setShares(sMap);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetails();
  }, [expenseId, groupId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount.trim() || !editReason.trim()) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        expectedRevision: expense.revision,
        description: description.trim(),
        amount: amount.trim(),
        category,
        occurrenceDate,
        payerParticipantId,
        notes: notes.trim() || undefined,
        reason: editReason.trim(),
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

      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update expense');

      setIsEditing(false);
      fetchDetails();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
        <DisclaimerBanner />
        <Navbar groupId={groupId} />
        <div className="p-12 text-center text-xs text-[#70695b]">
          Loading expense records...
        </div>
      </div>
    );
  }

  if (!expense || expense.error) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
        <DisclaimerBanner />
        <Navbar groupId={groupId} />
        <div className="p-12 text-center text-xs text-[#8c4b2d]">
          {expense?.error || 'Expense not found.'}
        </div>
      </div>
    );
  }

  const isVoided = expense.status === 'VOIDED';

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar groupId={groupId} />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 sm:px-6 w-full space-y-6">
        <div>
          <Link
            href={`/groups/${groupId}/expenses`}
            className="text-xs text-[#70695b] hover:text-[#1c2826] flex items-center gap-1 font-medium mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Ledger</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-[#1c2826]">
                  {expense.description}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ede7da] text-[#554e42]">
                  rev {expense.revision}
                </span>
                {isVoided && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#f3cbbd] text-[#8c4b2d] font-semibold">
                    VOIDED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#70695b] mt-0.5">
                {expense.category} • Recorded for {expense.occurrenceDate}
              </p>
            </div>

            {!isEditing && !isVoided && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-[#2a5c4d] hover:bg-[#20473b] text-white rounded text-xs font-semibold self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit / Correct Expense</span>
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#fdf2ee] border border-[#f3cbbd] rounded-md text-xs text-[#8c4b2d] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* View Details / Edit Form */}
        {isEditing ? (
          <form onSubmit={handleUpdate} className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="pb-3 border-b border-[#ece6d9] flex justify-between items-center">
              <h2 className="font-serif font-bold text-base text-[#1c2826]">
                Correct Expense Details
              </h2>
              <span className="text-xs text-[#70695b] font-mono">
                Updating from Rev {expense.revision} → Rev {expense.revision + 1}
              </span>
            </div>

            <div className="p-3 bg-[#f4eee1] border border-[#e2dacf] rounded text-xs text-[#554e42] leading-relaxed">
              <strong>Audit Requirement:</strong> Financial corrections preserve prior records. Please state a descriptive reason for this modification.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Amount ({group?.canonicalCurrency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded text-xs font-mono font-semibold focus:outline-[#2a5c4d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
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
                  Paid By (Payer)
                </label>
                <select
                  value={payerParticipantId}
                  onChange={(e) => setPayerParticipantId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Occurrence Date
                </label>
                <input
                  type="date"
                  required
                  value={occurrenceDate}
                  onChange={(e) => setOccurrenceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#8c4b2d] mb-1">
                  Audit Reason for Modification *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Added omitted receipt items, adjusted split shares"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#8c4b2d]"
                />
              </div>
            </div>

            <div>
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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e2dacf]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs text-[#554e42] hover:bg-[#ede7da] rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#2a5c4d] hover:bg-[#20473b] text-white rounded text-xs font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Revisions'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-6 shadow-sm space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-[#ece6d9] text-xs">
              <div>
                <span className="text-[#70695b] block">Total Amount:</span>
                <span className="font-mono text-xl font-bold text-[#1c2826] tabular-nums">
                  {formatMoney(BigInt(expense.amountMinorUnits), group?.canonicalCurrency)}
                </span>
              </div>
              <div>
                <span className="text-[#70695b] block">Paid By:</span>
                <span className="font-semibold text-sm text-[#1c2826]">
                  {participants.find((p) => p.id === expense.payerParticipantId)?.name || 'Payer'}
                </span>
              </div>
              <div>
                <span className="text-[#70695b] block">Category:</span>
                <span className="font-semibold text-sm text-[#1c2826]">{expense.category}</span>
              </div>
              <div>
                <span className="text-[#70695b] block">Status:</span>
                <span
                  className={`font-semibold text-xs inline-flex items-center gap-1 ${
                    isVoided ? 'text-[#8c4b2d]' : 'text-[#2a5c4d]'
                  }`}
                >
                  {isVoided ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{expense.status}</span>
                </span>
              </div>
            </div>

            {expense.notes && (
              <div className="p-3 bg-[#f7f4eb] rounded text-xs text-[#554e42]">
                <strong>Notes:</strong> {expense.notes}
              </div>
            )}

            {isVoided && expense.voidReason && (
              <div className="p-3 bg-[#fdf2ee] border border-[#f3cbbd] rounded text-xs text-[#8c4b2d]">
                <strong>Void Reason:</strong> {expense.voidReason}
              </div>
            )}

            {/* Split Breakdown Table */}
            <div>
              <h3 className="text-xs font-bold text-[#1c2826] uppercase tracking-wider mb-2">
                Participant Allocations ({expense.splits?.[0]?.allocationMethod} Split)
              </h3>
              <div className="border border-[#e5ded0] rounded-md overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f7f4eb] text-[#70695b] font-mono text-[10px] uppercase border-b border-[#e5ded0]">
                    <tr>
                      <th className="py-2 px-3">Participant</th>
                      <th className="py-2 px-3">Method Details</th>
                      <th className="py-2 px-3 text-right">Allocated Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece6d9]">
                    {expense.splits?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-[#faf7ee]">
                        <td className="py-2.5 px-3 font-medium text-[#1c2826]">
                          {s.participantName}
                        </td>
                        <td className="py-2.5 px-3 text-[#70695b]">
                          {s.shareWeight ? `${s.shareWeight} share(s)` : s.basisPoints ? `${(s.basisPoints / 100).toFixed(2)}%` : 'Equal share'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#1c2826]">
                          {formatMoney(BigInt(s.allocatedMinorUnits), group?.canonicalCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Immutable Revision History */}
        {expense.revisions && expense.revisions.length > 0 && (
          <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-[#1c2826] flex items-center gap-2">
              <History className="w-4 h-4 text-[#2a5c4d]" />
              <span>Immutable Revision Audit Trail</span>
            </h3>

            <div className="space-y-3">
              {expense.revisions.map((rev: any) => (
                <div
                  key={rev.id}
                  className="p-3.5 bg-[#f7f4eb] border border-[#e2dacf] rounded-lg text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#1c2826]">
                      Revision {rev.revisionNumber}
                    </span>
                    <span className="text-[11px] text-[#70695b] font-mono">
                      {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[#554e42]">
                    <strong>Audit Reason:</strong> {rev.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
