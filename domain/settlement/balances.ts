export interface ParticipantBalanceSummary {
  participantId: string;
  totalPaid: bigint; // Total amount paid as payer in active expenses
  totalAllocated: bigint; // Total amount allocated as beneficiary in active expenses
  paymentsSent: bigint; // Total reimbursements sent to others
  paymentsReceived: bigint; // Total reimbursements received from others
  netBalance: bigint; // Positive = is owed money (creditor), Negative = owes money (debtor)
}

export interface ActiveExpenseRecord {
  id: string;
  payerParticipantId: string;
  amountMinorUnits: bigint;
  status: string; // 'ACTIVE' vs 'VOIDED'
  splits: {
    participantId: string;
    allocatedMinorUnits: bigint;
  }[];
}

export interface ActivePaymentRecord {
  id: string;
  senderParticipantId: string;
  recipientParticipantId: string;
  amountMinorUnits: bigint;
  status: string; // 'CONFIRMED' vs 'REVERSED'
}

/**
 * Computes deterministic participant net balances from active expenses and confirmed settlement payments.
 * Ensures the zero-sum invariant: sum(all net balances) === 0n.
 */
export function computeGroupBalances(
  participantIds: string[],
  expenses: ActiveExpenseRecord[],
  payments: ActivePaymentRecord[]
): Map<string, ParticipantBalanceSummary> {
  const summaries = new Map<string, ParticipantBalanceSummary>();

  for (const id of participantIds) {
    summaries.set(id, {
      participantId: id,
      totalPaid: 0n,
      totalAllocated: 0n,
      paymentsSent: 0n,
      paymentsReceived: 0n,
      netBalance: 0n,
    });
  }

  // 1. Process active expenses
  for (const exp of expenses) {
    if (exp.status !== 'ACTIVE') continue;

    const payer = summaries.get(exp.payerParticipantId);
    if (payer) {
      payer.totalPaid += exp.amountMinorUnits;
    }

    for (const split of exp.splits) {
      const ben = summaries.get(split.participantId);
      if (ben) {
        ben.totalAllocated += split.allocatedMinorUnits;
      }
    }
  }

  // 2. Process confirmed settlement payments
  for (const pmt of payments) {
    if (pmt.status !== 'CONFIRMED') continue;

    const sender = summaries.get(pmt.senderParticipantId);
    if (sender) {
      sender.paymentsSent += pmt.amountMinorUnits;
    }

    const recipient = summaries.get(pmt.recipientParticipantId);
    if (recipient) {
      recipient.paymentsReceived += pmt.amountMinorUnits;
    }
  }

  // 3. Compute net balances:
  // netBalance = (totalPaid - totalAllocated) + (paymentsSent - paymentsReceived)
  let sumBalances = 0n;
  for (const [_, summary] of summaries) {
    const expenseNet = summary.totalPaid - summary.totalAllocated;
    const paymentNet = summary.paymentsSent - summary.paymentsReceived;
    summary.netBalance = expenseNet + paymentNet;
    sumBalances += summary.netBalance;
  }

  if (sumBalances !== 0n) {
    throw new Error(
      `Ledger Invariant Violation: group balances sum to ${sumBalances} minor units (must be exactly 0n).`
    );
  }

  return summaries;
}
