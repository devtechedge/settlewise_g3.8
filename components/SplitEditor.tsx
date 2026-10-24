'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AllocationMethod,
  ParticipantAllocation,
  resolveAllocations,
} from '../domain/money/allocations.ts';
import { parseExactToMinorUnits, formatMinorUnitsToDecimal, formatMoney } from '../domain/money/decimal.ts';
import { Users, Percent, Calculator, Split, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  color?: string | null;
}

interface SplitEditorProps {
  participants: Participant[];
  currency: string;
  amountStr: string;
  method: AllocationMethod;
  onMethodChange: (m: AllocationMethod) => void;
  // Selected state
  equalParticipants: string[];
  onEqualParticipantsChange: (ids: string[]) => void;
  exactAmounts: Record<string, string>;
  onExactAmountsChange: (record: Record<string, string>) => void;
  percentages: Record<string, string>; // e.g. "50.00"
  onPercentagesChange: (record: Record<string, string>) => void;
  shares: Record<string, string>; // e.g. "1"
  onSharesChange: (record: Record<string, string>) => void;
}

export function SplitEditor({
  participants,
  currency,
  amountStr,
  method,
  onMethodChange,
  equalParticipants,
  onEqualParticipantsChange,
  exactAmounts,
  onExactAmountsChange,
  percentages,
  onPercentagesChange,
  shares,
  onSharesChange,
}: SplitEditorProps) {
  const preview = useMemo((): { error: string | null; allocations: Record<string, bigint> } => {
    const empty = { error: null as string | null, allocations: {} as Record<string, bigint> };

    if (!amountStr || !participants.length) {
      return empty;
    }

    try {
      const totalMinor = parseExactToMinorUnits(amountStr, currency);
      if (totalMinor <= 0n) {
        return { error: 'Amount must be greater than zero.', allocations: {} };
      }

      let res: ParticipantAllocation[] = [];

      if (method === 'EQUAL') {
        if (!equalParticipants.length) {
          return { error: 'Select at least one participant.', allocations: {} };
        }
        res = resolveAllocations({
          method: 'EQUAL',
          totalAmountMinorUnits: totalMinor,
          equalParticipants,
        });
      } else if (method === 'EXACT') {
        const exactList = Object.entries(exactAmounts)
          .filter(([_, val]) => val && val.trim())
          .map(([pid, val]) => ({
            participantId: pid,
            amountMinorUnits: parseExactToMinorUnits(val, currency),
          }));

        if (!exactList.length) {
          return { error: 'Enter exact amounts for participants.', allocations: {} };
        }

        res = resolveAllocations({
          method: 'EXACT',
          totalAmountMinorUnits: totalMinor,
          exactAllocations: exactList,
        });
      } else if (method === 'PERCENTAGE') {
        const pList = Object.entries(percentages)
          .filter(([_, val]) => val && val.trim())
          .map(([pid, val]) => {
            const num = parseFloat(val);
            return {
              participantId: pid,
              basisPoints: Math.round(num * 100),
            };
          });

        const sumBps = pList.reduce((acc, p) => acc + p.basisPoints, 0);
        if (sumBps !== 10000) {
          return {
            error: `Percentages must sum to exactly 100% (currently ${(sumBps / 100).toFixed(2)}%).`,
            allocations: {},
          };
        }

        res = resolveAllocations({
          method: 'PERCENTAGE',
          totalAmountMinorUnits: totalMinor,
          percentageAllocations: pList,
        });
      } else if (method === 'SHARES') {
        const sList = Object.entries(shares)
          .filter(([_, val]) => val && parseInt(val) > 0)
          .map(([pid, val]) => ({
            participantId: pid,
            weight: parseInt(val),
          }));

        if (!sList.length) {
          return { error: 'Enter positive shares for at least one participant.', allocations: {} };
        }

        res = resolveAllocations({
          method: 'SHARES',
          totalAmountMinorUnits: totalMinor,
          sharesAllocations: sList,
        });
      }

      const map: Record<string, bigint> = {};
      res.forEach((r) => (map[r.participantId] = r.allocatedMinorUnits));
      return { error: null, allocations: map };
    } catch (err: any) {
      return { error: err.message, allocations: {} };
    }
  }, [amountStr, currency, method, equalParticipants, exactAmounts, percentages, shares, participants]);

  const calculationError = preview.error;
  const previewAllocations = preview.allocations;

  const toggleEqualParticipant = (id: string) => {
    if (equalParticipants.includes(id)) {
      onEqualParticipantsChange(equalParticipants.filter((p) => p !== id));
    } else {
      onEqualParticipantsChange([...equalParticipants, id]);
    }
  };

  return (
    <div className="bg-[var(--sw-surface-soft)] border border-[var(--sw-border-soft)] rounded-lg p-4 space-y-4">
      {/* Allocation Method Selector */}
      <div>
        <label className="block text-xs font-semibold text-[var(--sw-body)] uppercase tracking-wider mb-2">
          Allocation Method
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'EQUAL', label: 'Equal Split', icon: Users, desc: 'Evenly among all or selected' },
            { id: 'EXACT', label: 'Exact Amounts', icon: Calculator, desc: 'Specify currency amount' },
            { id: 'PERCENTAGE', label: 'Percentages', icon: Percent, desc: 'Summing to 100.00%' },
            { id: 'SHARES', label: 'Shares / Weights', icon: Split, desc: 'Weighted ratios (1x, 2x...)' },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onMethodChange(m.id as AllocationMethod)}
                className={`flex flex-col items-start p-2.5 rounded-md border text-left transition-all ${
                  isSelected
                    ? 'border-[#2a5c4d] bg-[var(--sw-bg)] shadow-xs text-[var(--sw-ink)]'
                    : 'border-[var(--sw-border)] bg-[var(--sw-surface-muted)] hover:bg-[var(--sw-warm)] text-[var(--sw-body)]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-xs">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[var(--sw-accent)]' : 'text-[var(--sw-muted)]'}`} />
                  <span>{m.label}</span>
                </div>
                <span className="text-[10px] text-[var(--sw-muted)] mt-1 leading-tight">{m.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Method-Specific Input Matrix */}
      <div className="border-t border-[var(--sw-border-soft)] pt-3">
        <div className="text-xs font-semibold text-[var(--sw-ink)] mb-2 flex items-center justify-between">
          <span>Participant Allocation Breakdown</span>
          <span className="text-[11px] text-[var(--sw-muted)] font-normal">
            Uses deterministic largest-remainder rule for pennies
          </span>
        </div>

        <div className="space-y-2">
          {participants.map((p) => {
            const previewVal = previewAllocations[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-md px-3 py-2 text-xs"
              >
                {/* Left: Participant Name & Check/Color */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {method === 'EQUAL' && (
                    <input
                      type="checkbox"
                      id={`check-${p.id}`}
                      checked={equalParticipants.includes(p.id)}
                      onChange={() => toggleEqualParticipant(p.id)}
                      className="w-4 h-4 rounded border-[#b8ae9d] text-[var(--sw-accent)] focus:ring-[#2a5c4d]"
                    />
                  )}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.color || '#4a6b6c' }}
                  />
                  <label htmlFor={`check-${p.id}`} className="font-medium text-[var(--sw-ink)] truncate cursor-pointer">
                    {p.name}
                  </label>
                </div>

                {/* Center: Input control depending on method */}
                <div className="w-32 shrink-0">
                  {method === 'EXACT' && (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--sw-muted)] font-mono text-xs">
                        $
                      </span>
                      <input
                        type="text"
                        placeholder="0.00"
                        value={exactAmounts[p.id] || ''}
                        onChange={(e) =>
                          onExactAmountsChange({ ...exactAmounts, [p.id]: e.target.value })
                        }
                        className="w-full pl-6 pr-2 py-1 text-right font-mono bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded text-xs focus:outline-[var(--sw-accent)]"
                      />
                    </div>
                  )}

                  {method === 'PERCENTAGE' && (
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={percentages[p.id] || ''}
                        onChange={(e) =>
                          onPercentagesChange({ ...percentages, [p.id]: e.target.value })
                        }
                        className="w-full pr-6 pl-2 py-1 text-right font-mono bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded text-xs focus:outline-[var(--sw-accent)]"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--sw-muted)] font-mono text-xs">
                        %
                      </span>
                    </div>
                  )}

                  {method === 'SHARES' && (
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        value={shares[p.id] || ''}
                        onChange={(e) => onSharesChange({ ...shares, [p.id]: e.target.value })}
                        className="w-full px-2 py-1 text-right font-mono bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded text-xs focus:outline-[var(--sw-accent)]"
                      />
                    </div>
                  )}
                </div>

                {/* Right: Calculated share preview */}
                <div className="w-24 text-right font-mono font-semibold tabular-nums text-[var(--sw-ink)]">
                  {previewVal !== undefined ? formatMoney(previewVal, currency) : '-'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation status footer */}
      {calculationError ? (
        <div className="flex items-center gap-2 p-2 bg-[var(--sw-danger-bg)] border border-[var(--sw-danger-border)] rounded-md text-xs text-[var(--sw-rust)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{calculationError}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-[var(--sw-accent)] font-medium pt-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--sw-accent)]" />
            <span>Allocation matches total expense amount exactly.</span>
          </div>
          <span className="font-mono text-[var(--sw-body)]">
            Total: {amountStr ? formatMoney(parseExactToMinorUnits(amountStr, currency), currency) : '0.00'}
          </span>
        </div>
      )}
    </div>
  );
}
