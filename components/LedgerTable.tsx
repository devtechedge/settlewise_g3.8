'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '../domain/money/decimal.ts';
import {
  Edit2,
  Trash2,
  History,
  AlertTriangle,
  Receipt,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface SplitItem {
  participantId: string;
  participantName: string;
  allocationMethod: string;
  allocatedMinorUnits: string;
}

interface ExpenseItem {
  id: string;
  groupId: string;
  description: string;
  category: string;
  occurrenceDate: string;
  payerParticipantId: string;
  payerName: string;
  currency: string;
  amountMinorUnits: string;
  notes?: string | null;
  status: string;
  voidReason?: string | null;
  revision: number;
  splits: SplitItem[];
}

interface LedgerTableProps {
  groupId: string;
  currency: string;
  expenses: ExpenseItem[];
  userRole: string; // 'OWNER' | 'EDITOR' | 'MEMBER'
  onRefresh: () => void;
}

export function LedgerTable({
  groupId,
  currency,
  expenses,
  userRole,
  onRefresh,
}: LedgerTableProps) {
  const [voidModalExpense, setVoidModalExpense] = useState<ExpenseItem | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const canEdit = userRole === 'OWNER' || userRole === 'EDITOR';

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidModalExpense || !voidReason.trim()) return;

    setVoiding(true);
    setVoidError(null);

    try {
      const res = await fetch(`/api/expenses/${voidModalExpense.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to void expense');

      setVoidModalExpense(null);
      setVoidReason('');
      onRefresh();
    } catch (err: any) {
      setVoidError(err.message);
    } finally {
      setVoiding(false);
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg p-10 text-center">
        <Receipt className="w-10 h-10 text-[#8c8273] mx-auto mb-3" />
        <h4 className="font-serif font-bold text-sm text-[var(--sw-ink)]">No Expenses Found</h4>
        <p className="text-xs text-[var(--sw-muted)] mt-1 max-w-sm mx-auto">
          No records match the current filter criteria or the ledger is empty.
        </p>
        {canEdit && (
          <Link
            href={`/groups/${groupId}/expenses/new`}
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-[var(--sw-accent)] text-[var(--sw-on-accent)] rounded text-xs font-semibold hover:bg-[var(--sw-accent-strong)] transition-colors"
          >
            Record New Expense
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-lg shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-[var(--sw-border)] bg-[var(--sw-surface-soft)] text-[var(--sw-muted)] font-mono uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Description & Category</th>
              <th className="py-2.5 px-3">Payer</th>
              <th className="py-2.5 px-3">Split Details</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ece6d9]">
            {expenses.map((exp) => {
              const isVoided = exp.status === 'VOIDED';
              return (
                <tr
                  key={exp.id}
                  className={`hover:bg-[var(--sw-hover)] transition-colors ${
                    isVoided ? 'opacity-55 bg-[#fdfaf8]' : ''
                  }`}
                >
                  {/* Date */}
                  <td className="py-3 px-3 font-mono text-[var(--sw-body)] whitespace-nowrap">
                    {exp.occurrenceDate}
                  </td>

                  {/* Description & Category */}
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[var(--sw-ink)] flex items-center gap-2">
                      <Link
                        href={`/groups/${groupId}/expenses/${exp.id}`}
                        className="hover:underline hover:text-[var(--sw-accent)]"
                      >
                        {exp.description}
                      </Link>
                      {exp.revision > 1 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#dfd7c8] text-[var(--sw-ink)] rounded">
                          rev {exp.revision}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--sw-muted)]">
                      <span className="px-1.5 py-0.2 rounded bg-[#ebe5d8] text-[var(--sw-body)]">
                        {exp.category}
                      </span>
                      {exp.notes && (
                        <span className="truncate max-w-xs italic text-[var(--sw-muted)]">
                          - {exp.notes}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Payer */}
                  <td className="py-3 px-3 whitespace-nowrap font-medium text-[var(--sw-ink)]">
                    {exp.payerName}
                  </td>

                  {/* Split Summary */}
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {exp.splits.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-[#f3ede0] border border-[var(--sw-border)] rounded text-[#443e33] font-mono"
                          title={`${s.participantName}: ${formatMoney(BigInt(s.allocatedMinorUnits), currency)}`}
                        >
                          {s.participantName}: {formatMoney(BigInt(s.allocatedMinorUnits), currency)}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-sm text-[var(--sw-ink)] whitespace-nowrap">
                    {formatMoney(BigInt(exp.amountMinorUnits), currency)}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {isVoided ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#f3cbbd] text-[var(--sw-rust)] font-semibold" title={exp.voidReason || 'Voided'}>
                        <XCircle className="w-3 h-3" /> VOIDED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[var(--sw-positive-bg)] text-[var(--sw-accent)] font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> ACTIVE
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/groups/${groupId}/expenses/${exp.id}`}
                        className="p-1.5 text-[var(--sw-body)] hover:text-[var(--sw-ink)] hover:bg-[var(--sw-warm)] rounded transition-colors"
                        title="View Revisions & Breakdown"
                        aria-label={`View details for ${exp.description}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      {canEdit && !isVoided && (
                        <>
                          <Link
                            href={`/groups/${groupId}/expenses/${exp.id}?edit=true`}
                            className="p-1.5 text-[var(--sw-accent)] hover:bg-[var(--sw-warm)] rounded transition-colors"
                            title="Edit Expense"
                            aria-label={`Edit ${exp.description}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setVoidModalExpense(exp);
                              setVoidReason('');
                              setVoidError(null);
                            }}
                            className="p-1.5 text-[var(--sw-rust)] hover:bg-[#f8e5de] rounded transition-colors"
                            title="Void Expense"
                            aria-label={`Void ${exp.description}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Void Modal */}
      {voidModalExpense && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--sw-surface)] border border-[var(--sw-border-strong)] rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-serif font-bold text-[var(--sw-rust)] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Void Expense</span>
            </h3>
            <p className="text-xs text-[var(--sw-muted)]">
              Voiding <strong>“{voidModalExpense.description}”</strong> removes its monetary obligations from all balances while preserving an auditable history.
            </p>

            <form onSubmit={handleVoidSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--sw-body)] mb-1">
                  Reason for Cancellation (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Accidental duplicate, vendor refunded, or wrong group ledger"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded text-xs focus:outline-[#8c4b2d]"
                />
              </div>

              {voidError && (
                <div className="p-2 bg-[var(--sw-danger-bg)] border border-[var(--sw-danger-border)] rounded text-xs text-[var(--sw-rust)]">
                  {voidError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--sw-border-soft)]">
                <button
                  type="button"
                  onClick={() => setVoidModalExpense(null)}
                  className="px-3 py-1.5 text-xs text-[var(--sw-body)] hover:bg-[var(--sw-warm)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-4 py-1.5 bg-[var(--sw-rust)] hover:bg-[#6e3820] text-[var(--sw-on-ink)] rounded text-xs font-semibold disabled:opacity-50"
                >
                  {voiding ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
