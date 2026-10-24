'use client';

import React, { useState, useEffect } from 'react';
import { AllocationMethod, resolveAllocations } from '../domain/money/allocations.ts';
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
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [previewAllocations, setPreviewAllocations] = useState<Record<string, bigint>>({});

  // Recompute live allocations whenever inputs change
  useEffect(() => {
    setCalculationError(null);
    if (!amountStr || !participants.length) {
      setPreviewAllocations({});
      return;
    }

    try {
      const totalMinor = parseExactToMinorUnits(amountStr, currency);
      if (totalMinor <= 0n) {
        setCalculationError('Amount must be greater than zero.');
        setPreviewAllocations({});
        return;
      }

      if (method === 'EQUAL') {
        if (!equalParticipants.length) {
          setCalculationError('Select at least one participant.');
          setPreviewAllocations({});
          return;
        }
        const res = resolveAllocations({
          method: 'EQUAL',
          totalAmountMinorUnits: totalMinor,
          equalParticipants,
        });
        const map: Record<string, bigint> = {};
        res.forEach((r) => (map[r.participantId] = r.allocatedMinorUnits));
        setPreviewAllocations(map);
      } else if (method === 'EXACT') {
        const exactList = Object.entries(exactAmounts)
          .filter(([_, val]) => val && val.trim())
          .map(([pid, val]) => ({
            participantId: pid,
            amountMinorUnits: parseExactToMinorUnits(val, currency),
          }));

        if (!exactList.length) {
          setCalculationError('Enter exact amounts for participants.');
          setPreviewAllocations({});
          return;
        }

        const res = resolveAllocations({
          method: 'EXACT',
          totalAmountMinorUnits: totalMinor,
          exactAllocations: exactList,
        });
        const map: Record<string, bigint> = {};
        res.forEach((r) => (map[r.participantId] = r.allocatedMinorUnits));
        setPreviewAllocations(map);
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
          setCalculationError(`Percentages must sum to exactly 100% (currently ${(sumBps / 100).toFixed(2)}%).`);
          setPreviewAllocations({});
          return;
        }

        const res = resolveAllocations({
          method: 'PERCENTAGE',
          totalAmountMinorUnits: totalMinor,
          percentageAllocations: pList,
        });
        const map: Record<string, bigint> = {};
        res.forEach((r) => (map[r.participantId] = r.allocatedMinorUnits));
        setPreviewAllocations(map);
      } else if (method === 'SHARES') {
        const sList = Object.entries(shares)
          .filter(([_, val]) => val && parseInt(val) > 0)
          .map(([pid, val]) => ({
            participantId: pid,
            weight: parseInt(val),
          }));

        if (!sList.length) {
          setCalculationError('Enter positive shares for at least one participant.');
          setPreviewAllocations({});
          return;
        }

        const res = resolveAllocations({
          method: 'SHARES',
          totalAmountMinorUnits: totalMinor,
          sharesAllocations: sList,
        });
        const map: Record<string, bigint> = {};
        res.forEach((r) => (map[r.participantId] = r.allocatedMinorUnits));
        setPreviewAllocations(map);
      }
    } catch (err: any) {
      setCalculationError(err.message);
      setPreviewAllocations({});
    }
  }, [
    amountStr,
    currency,
    method,
    equalParticipants,
    exactAmounts,
    percentages,
    shares,
    participants,
  ]);

  const toggleEqualParticipant = (id: string) => {
    if (equalParticipants.includes(id)) {
      onEqualParticipantsChange(equalParticipants.filter((p) => p !== id));
    } else {
      onEqualParticipantsChange([...equalParticipants, id]);
    }
  };

  return (
    <div className="bg-[#f7f4eb] border border-[#ded5c5] rounded-lg p-4 space-y-4">
      {/* Allocation Method Selector */}
      <div>
        <label className="block text-xs font-semibold text-[#5a5448] uppercase tracking-wider mb-2">
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
                    ? 'border-[#2a5c4d] bg-[#fbf9f4] shadow-xs text-[#1c2826]'
                    : 'border-[#dfd7c8] bg-[#f2ede2] hover:bg-[#eae3d5] text-[#554e42]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-xs">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2a5c4d]' : 'text-[#70695b]'}`} />
                  <span>{m.label}</span>
                </div>
                <span className="text-[10px] text-[#70695b] mt-1 leading-tight">{m.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Method-Specific Input Matrix */}
      <div className="border-t border-[#e2dacf] pt-3">
        <div className="text-xs font-semibold text-[#2b2721] mb-2 flex items-center justify-between">
          <span>Participant Allocation Breakdown</span>
          <span className="text-[11px] text-[#70695b] font-normal">
            Uses deterministic largest-remainder rule for pennies
          </span>
        </div>

        <div className="space-y-2">
          {participants.map((p) => {
            const previewVal = previewAllocations[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 bg-[#fcfbf7] border border-[#e5ded0] rounded-md px-3 py-2 text-xs"
              >
                {/* Left: Participant Name & Check/Color */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {method === 'EQUAL' && (
                    <input
                      type="checkbox"
                      id={`check-${p.id}`}
                      checked={equalParticipants.includes(p.id)}
                      onChange={() => toggleEqualParticipant(p.id)}
                      className="w-4 h-4 rounded border-[#b8ae9d] text-[#2a5c4d] focus:ring-[#2a5c4d]"
                    />
                  )}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.color || '#4a6b6c' }}
                  />
                  <label htmlFor={`check-${p.id}`} className="font-medium text-[#1c2826] truncate cursor-pointer">
                    {p.name}
                  </label>
                </div>

                {/* Center: Input control depending on method */}
                <div className="w-32 shrink-0">
                  {method === 'EXACT' && (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#70695b] font-mono text-xs">
                        $
                      </span>
                      <input
                        type="text"
                        placeholder="0.00"
                        value={exactAmounts[p.id] || ''}
                        onChange={(e) =>
                          onExactAmountsChange({ ...exactAmounts, [p.id]: e.target.value })
                        }
                        className="w-full pl-6 pr-2 py-1 text-right font-mono bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
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
                        className="w-full pr-6 pl-2 py-1 text-right font-mono bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#70695b] font-mono text-xs">
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
                        className="w-full px-2 py-1 text-right font-mono bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                      />
                    </div>
                  )}
                </div>

                {/* Right: Calculated share preview */}
                <div className="w-24 text-right font-mono font-semibold tabular-nums text-[#1c2826]">
                  {previewVal !== undefined ? formatMoney(previewVal, currency) : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation status footer */}
      {calculationError ? (
        <div className="flex items-center gap-2 p-2 bg-[#fdf2ee] border border-[#f3cbbd] rounded-md text-xs text-[#8c4b2d]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{calculationError}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-[#2a5c4d] font-medium pt-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#2a5c4d]" />
            <span>Allocation matches total expense amount exactly.</span>
          </div>
          <span className="font-mono text-[#554e42]">
            Total: {amountStr ? formatMoney(parseExactToMinorUnits(amountStr, currency), currency) : '0.00'}
          </span>
        </div>
      )}
    </div>
  );
}
