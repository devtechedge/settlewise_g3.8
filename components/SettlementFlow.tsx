'use client';

import React, { useState } from 'react';
import { ProposedTransfer } from '../domain/settlement/planner.ts';
import { formatMoney } from '../domain/money/decimal.ts';
import { ArrowRight, CheckCircle, RotateCcw, AlertCircle, Info, DollarSign } from 'lucide-react';

interface SettlementFlowProps {
  groupId: string;
  currency: string;
  transfers: {
    senderParticipantId: string;
    senderName: string;
    recipientParticipantId: string;
    recipientName: string;
    amountMinorUnits: string;
    basis: string;
  }[];
  payments: {
    id: string;
    senderParticipantId: string;
    senderName: string;
    recipientParticipantId: string;
    recipientName: string;
    amountMinorUnits: string;
    recordedDate: string;
    status: string;
    notes?: string | null;
    reversalReason?: string | null;
  }[];
  onPaymentRecorded: () => void;
}

export function SettlementFlow({
  groupId,
  currency,
  transfers,
  payments,
  onPaymentRecorded,
}: SettlementFlowProps) {
  // Payment modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reverse payment state
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [reversalPaymentId, setReversalPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const openRecordModal = (transfer: any) => {
    setSelectedTransfer(transfer);
    // Convert minor units to decimal for prefill
    const decimalStr = (Number(transfer.amountMinorUnits) / 100).toFixed(2);
    setPaymentAmount(decimalStr);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/settlements/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderParticipantId: selectedTransfer.senderParticipantId,
          recipientParticipantId: selectedTransfer.recipientParticipantId,
          amount: paymentAmount,
          recordedDate: paymentDate,
          notes: paymentNotes || `Settlement reimbursement for ${selectedTransfer.basis}`,
          idempotencyKey: `client_pmt_${Date.now()}_${Math.random()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      setModalOpen(false);
      onPaymentRecorded();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalPaymentId || !reversalReason.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/settlements/payments/${reversalPaymentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reversalReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reverse payment');

      setReversalModalOpen(false);
      setReversalPaymentId(null);
      setReversalReason('');
      onPaymentRecorded();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Suggested Settlement Transfers */}
      <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ece6d9] gap-2">
          <div>
            <h3 className="text-base font-serif font-bold text-[#1c2826]">
              Suggested Settlement Plan
            </h3>
            <p className="text-xs text-[#70695b] mt-0.5">
              Consolidated debtor-to-creditor reimbursement obligations. Does not process actual banking transfers.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-[#ede7da] text-[#554e42] font-mono self-start sm:self-auto">
            {transfers.length} transfer{transfers.length === 1 ? '' : 's'} required
          </span>
        </div>

        {transfers.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#2a5c4d] flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8 text-[#2a5c4d]" />
            <p className="font-semibold text-sm">All obligations are balanced.</p>
            <p className="text-[#554e42]">No participants currently owe or are owed funds.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0ebd9] mt-3">
            {transfers.map((t, idx) => (
              <div
                key={idx}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#faf7ee] px-2 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 font-medium text-xs text-[#1c2826]">
                    <span className="px-2 py-1 bg-[#f3ede0] border border-[#dfd7c8] rounded font-semibold text-[#8c4b2d]">
                      {t.senderName}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#70695b] shrink-0" />
                    <span className="px-2 py-1 bg-[#e7efe9] border border-[#c5d8cb] rounded font-semibold text-[#2a5c4d]">
                      {t.recipientName}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#70695b] hidden md:inline truncate max-w-xs">
                    — {t.basis}
                  </span>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-[#1c2826] tabular-nums">
                      {formatMoney(BigInt(t.amountMinorUnits), currency)}
                    </div>
                    <div className="text-[10px] text-[#70695b]">Suggested transfer</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openRecordModal(t)}
                    className="px-3 py-1.5 bg-[#1c2826] text-[#fbf9f4] hover:bg-[#2b3d3a] rounded text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Record Reimbursement</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recorded Reimbursement History */}
      <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-lg p-5 shadow-xs">
        <h3 className="text-sm font-serif font-bold text-[#1c2826] mb-1">
          Recorded Reimbursement History
        </h3>
        <p className="text-xs text-[#70695b] mb-4">
          All user-logged inter-participant settlements. Reversals preserve immutable compensating history.
        </p>

        {payments.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#70695b]">
            No reimbursements recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#e5ded0] text-[#70695b] font-mono uppercase text-[10px]">
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">From</th>
                  <th className="py-2 px-2">To</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Notes</th>
                  <th className="py-2 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2eee3]">
                {payments.map((pmt) => {
                  const isReversed = pmt.status === 'REVERSED';
                  return (
                    <tr
                      key={pmt.id}
                      className={`hover:bg-[#faf7ee] transition-colors ${
                        isReversed ? 'opacity-60 bg-[#faf6f4]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 font-mono text-[#554e42]">{pmt.recordedDate}</td>
                      <td className="py-2.5 px-2 font-medium text-[#1c2826]">{pmt.senderName}</td>
                      <td className="py-2.5 px-2 font-medium text-[#1c2826]">{pmt.recipientName}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-semibold tabular-nums text-[#1c2826]">
                        {formatMoney(BigInt(pmt.amountMinorUnits), currency)}
                      </td>
                      <td className="py-2.5 px-2">
                        {isReversed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#f3cbbd] text-[#8c4b2d] font-semibold">
                            <RotateCcw className="w-2.5 h-2.5" /> REVERSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#c5d8cb] text-[#2a5c4d] font-semibold">
                            CONFIRMED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-[#70695b] max-w-xs truncate">
                        {isReversed ? (
                          <span className="text-[#8c4b2d]">
                            Reversal: {pmt.reversalReason || 'Reversed'}
                          </span>
                        ) : (
                          pmt.notes || '—'
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {!isReversed && (
                          <button
                            type="button"
                            onClick={() => {
                              setReversalPaymentId(pmt.id);
                              setReversalReason('');
                              setReversalModalOpen(true);
                            }}
                            className="text-[#8c4b2d] hover:text-[#5c2d18] text-[11px] font-medium hover:underline inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Reimbursement Modal */}
      {modalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcfbf7] border border-[#d8d0bf] rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-serif font-bold text-[#1c2826]">
              Record Reimbursement
            </h3>
            <p className="text-xs text-[#70695b]">
              Confirm that an offline reimbursement was made between participants. This updates ledger balances deterministically.
            </p>

            <form onSubmit={handleRecordSubmit} className="space-y-3">
              <div className="bg-[#f4eee1] p-3 rounded-md text-xs space-y-1">
                <div>
                  <strong>From:</strong> {selectedTransfer.senderName}
                </div>
                <div>
                  <strong>To:</strong> {selectedTransfer.recipientName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Reimbursement Amount ({currency})
                </label>
                <input
                  type="text"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs font-mono focus:outline-[#2a5c4d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Notes / Payment Method
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zelle, Cash, Bank Transfer reference"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                />
              </div>

              {errorMsg && (
                <div className="p-2 bg-[#fdf2ee] border border-[#f3cbbd] rounded text-xs text-[#8c4b2d]">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2dacf]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#554e42] hover:bg-[#ede7da] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#2a5c4d] hover:bg-[#214a3e] text-white rounded text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Confirm Reimbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Payment Modal */}
      {reversalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcfbf7] border border-[#d8d0bf] rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-serif font-bold text-[#8c4b2d] flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              <span>Reverse Settlement Payment</span>
            </h3>
            <p className="text-xs text-[#70695b]">
              Reversing this payment restores prior participant balances. The original payment record remains in the audit log for compliance.
            </p>

            <form onSubmit={handleReverseSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5a5448] mb-1">
                  Reason for Reversal (Required for audit trail)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Sent to wrong account handle, bounced check, or entered in error"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#8c4b2d]"
                />
              </div>

              {errorMsg && (
                <div className="p-2 bg-[#fdf2ee] border border-[#f3cbbd] rounded text-xs text-[#8c4b2d]">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2dacf]">
                <button
                  type="button"
                  onClick={() => setReversalModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#554e42] hover:bg-[#ede7da] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#8c4b2d] hover:bg-[#6e3820] text-white rounded text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
