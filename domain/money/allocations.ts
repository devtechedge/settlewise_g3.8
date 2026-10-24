export type AllocationMethod = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface ParticipantAllocation {
  participantId: string;
  allocatedMinorUnits: bigint;
  basisPoints?: number;
  shareWeight?: number;
}

/**
 * Calculates equal split among participants with deterministic largest-remainder distribution
 * for any leftover minor units. Ties are broken by participantId alphabetically.
 */
export function calculateEqualSplit(
  totalAmountMinorUnits: bigint,
  participantIds: string[]
): ParticipantAllocation[] {
  if (totalAmountMinorUnits < 0n) {
    throw new Error('Total amount cannot be negative.');
  }
  if (!participantIds || participantIds.length === 0) {
    throw new Error('Equal split requires at least one participant.');
  }

  // Deduplicate and sort participant IDs deterministically
  const sortedIds = [...new Set(participantIds)].sort();
  const count = BigInt(sortedIds.length);

  const baseQuota = totalAmountMinorUnits / count;
  const remainder = Number(totalAmountMinorUnits % count);

  return sortedIds.map((id, index) => {
    // First 'remainder' participants receive +1 minor unit
    const extra = index < remainder ? 1n : 0n;
    return {
      participantId: id,
      allocatedMinorUnits: baseQuota + extra,
    };
  });
}

/**
 * Validates and normalizes exact splits.
 * Rejects negative amounts, duplicate participants, or sums that do not equal the total.
 */
export function validateExactSplit(
  totalAmountMinorUnits: bigint,
  items: { participantId: string; amountMinorUnits: bigint }[]
): ParticipantAllocation[] {
  if (totalAmountMinorUnits < 0n) {
    throw new Error('Total amount cannot be negative.');
  }
  if (!items || items.length === 0) {
    throw new Error('Exact split requires at least one participant.');
  }

  const seen = new Set<string>();
  let sum = 0n;

  for (const item of items) {
    if (seen.has(item.participantId)) {
      throw new Error(`Duplicate participant in exact split: "${item.participantId}".`);
    }
    seen.add(item.participantId);

    if (item.amountMinorUnits < 0n) {
      throw new Error(`Participant "${item.participantId}" allocation cannot be negative.`);
    }
    sum += item.amountMinorUnits;
  }

  if (sum !== totalAmountMinorUnits) {
    throw new Error(
      `Exact split allocations sum to ${sum} minor units, but expense total is ${totalAmountMinorUnits} minor units. Difference: ${sum - totalAmountMinorUnits}.`
    );
  }

  return items.map((item) => ({
    participantId: item.participantId,
    allocatedMinorUnits: item.amountMinorUnits,
  }));
}

/**
 * Calculates percentage split based on basis points (100.00% = 10,000 basis points).
 * Uses largest-remainder method for fractional minor units. Ties broken by participantId.
 */
export function calculatePercentageSplit(
  totalAmountMinorUnits: bigint,
  items: { participantId: string; basisPoints: number }[]
): ParticipantAllocation[] {
  if (totalAmountMinorUnits < 0n) {
    throw new Error('Total amount cannot be negative.');
  }
  if (!items || items.length === 0) {
    throw new Error('Percentage split requires at least one participant.');
  }

  const seen = new Set<string>();
  let totalBps = 0;

  for (const item of items) {
    if (seen.has(item.participantId)) {
      throw new Error(`Duplicate participant in percentage split: "${item.participantId}".`);
    }
    seen.add(item.participantId);

    if (item.basisPoints < 0 || !Number.isInteger(item.basisPoints)) {
      throw new Error(`Invalid basis points for participant "${item.participantId}": ${item.basisPoints}. Must be non-negative integer.`);
    }
    totalBps += item.basisPoints;
  }

  if (totalBps !== 10000) {
    throw new Error(`Percentage split basis points must sum exactly to 10,000 (100.00%). Current sum: ${totalBps}.`);
  }

  const BPS_TOTAL = 10000n;
  let allocatedSum = 0n;

  // Compute floor quota and remainder
  const quotas = items.map((item) => {
    const bps = BigInt(item.basisPoints);
    const floor = (totalAmountMinorUnits * bps) / BPS_TOTAL;
    const remainder = (totalAmountMinorUnits * bps) % BPS_TOTAL;
    allocatedSum += floor;
    return {
      participantId: item.participantId,
      basisPoints: item.basisPoints,
      allocatedMinorUnits: floor,
      remainder,
    };
  });

  const leftover = Number(totalAmountMinorUnits - allocatedSum);

  // Distribute leftover minor units to highest remainders, breaking ties by participantId ascending
  const sortedByRemainder = [...quotas].sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder > a.remainder ? 1 : -1;
    }
    return a.participantId.localeCompare(b.participantId);
  });

  const bonusRecipients = new Set(
    sortedByRemainder.slice(0, leftover).map((q) => q.participantId)
  );

  return quotas.map((q) => ({
    participantId: q.participantId,
    basisPoints: q.basisPoints,
    allocatedMinorUnits: q.allocatedMinorUnits + (bonusRecipients.has(q.participantId) ? 1n : 0n),
  }));
}

/**
 * Calculates shares-based split with positive integer weights.
 * Uses largest-remainder method for fractional minor units. Ties broken by participantId.
 */
export function calculateSharesSplit(
  totalAmountMinorUnits: bigint,
  items: { participantId: string; weight: number }[]
): ParticipantAllocation[] {
  if (totalAmountMinorUnits < 0n) {
    throw new Error('Total amount cannot be negative.');
  }
  if (!items || items.length === 0) {
    throw new Error('Shares split requires at least one participant.');
  }

  const seen = new Set<string>();
  let totalWeight = 0;

  for (const item of items) {
    if (seen.has(item.participantId)) {
      throw new Error(`Duplicate participant in shares split: "${item.participantId}".`);
    }
    seen.add(item.participantId);

    if (item.weight <= 0 || !Number.isInteger(item.weight)) {
      throw new Error(`Invalid share weight for "${item.participantId}": ${item.weight}. Must be positive integer.`);
    }
    totalWeight += item.weight;
  }

  const totalW = BigInt(totalWeight);
  let allocatedSum = 0n;

  const quotas = items.map((item) => {
    const w = BigInt(item.weight);
    const floor = (totalAmountMinorUnits * w) / totalW;
    const remainder = (totalAmountMinorUnits * w) % totalW;
    allocatedSum += floor;
    return {
      participantId: item.participantId,
      shareWeight: item.weight,
      allocatedMinorUnits: floor,
      remainder,
    };
  });

  const leftover = Number(totalAmountMinorUnits - allocatedSum);

  const sortedByRemainder = [...quotas].sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder > a.remainder ? 1 : -1;
    }
    return a.participantId.localeCompare(b.participantId);
  });

  const bonusRecipients = new Set(
    sortedByRemainder.slice(0, leftover).map((q) => q.participantId)
  );

  return quotas.map((q) => ({
    participantId: q.participantId,
    shareWeight: q.shareWeight,
    allocatedMinorUnits: q.allocatedMinorUnits + (bonusRecipients.has(q.participantId) ? 1n : 0n),
  }));
}

/**
 * Master allocation dispatch & validation.
 * Invariant: Sum of resulting allocations must equal totalAmountMinorUnits.
 */
export function resolveAllocations(params: {
  method: AllocationMethod;
  totalAmountMinorUnits: bigint;
  equalParticipants?: string[];
  exactAllocations?: { participantId: string; amountMinorUnits: bigint }[];
  percentageAllocations?: { participantId: string; basisPoints: number }[];
  sharesAllocations?: { participantId: string; weight: number }[];
}): ParticipantAllocation[] {
  let result: ParticipantAllocation[];

  switch (params.method) {
    case 'EQUAL':
      result = calculateEqualSplit(params.totalAmountMinorUnits, params.equalParticipants || []);
      break;
    case 'EXACT':
      result = validateExactSplit(params.totalAmountMinorUnits, params.exactAllocations || []);
      break;
    case 'PERCENTAGE':
      result = calculatePercentageSplit(params.totalAmountMinorUnits, params.percentageAllocations || []);
      break;
    case 'SHARES':
      result = calculateSharesSplit(params.totalAmountMinorUnits, params.sharesAllocations || []);
      break;
    default:
      throw new Error(`Unsupported allocation method: ${params.method}`);
  }

  // Enforce money invariant
  const totalAllocated = result.reduce((acc, curr) => acc + curr.allocatedMinorUnits, 0n);
  if (totalAllocated !== params.totalAmountMinorUnits) {
    throw new Error(
      `Internal Allocation Invariant Violation: total allocated (${totalAllocated}) != expense amount (${params.totalAmountMinorUnits})`
    );
  }

  return result;
}
