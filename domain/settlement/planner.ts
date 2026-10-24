import { ParticipantBalanceSummary } from './balances.ts';

export interface ProposedTransfer {
  senderParticipantId: string;
  recipientParticipantId: string;
  amountMinorUnits: bigint;
  basis: string;
}

export interface SettlementPlanResult {
  transfers: ProposedTransfer[];
  totalSettlementValueMinorUnits: bigint;
  totalDebtors: number;
  totalCreditors: number;
  isFullySettled: boolean;
  explanation: string;
}

/**
 * Generates a deterministic, reproducible suggested settlement plan matching debtors to creditors.
 * Ties are broken stably by participantId.
 */
export function generateSettlementPlan(
  balances: Map<string, ParticipantBalanceSummary>,
  participantNames?: Map<string, string>
): SettlementPlanResult {
  interface Party {
    participantId: string;
    balance: bigint; // debtor: positive magnitude of debt; creditor: positive credit
  }

  const debtors: Party[] = [];
  const creditors: Party[] = [];

  for (const [id, summary] of balances) {
    if (summary.netBalance < 0n) {
      debtors.push({ participantId: id, balance: -summary.netBalance });
    } else if (summary.netBalance > 0n) {
      creditors.push({ participantId: id, balance: summary.netBalance });
    }
  }

  // Stable deterministic sorting
  // Debtors: largest debt first, then participantId ascending
  debtors.sort((a, b) => {
    if (b.balance !== a.balance) {
      return b.balance > a.balance ? 1 : -1;
    }
    return a.participantId.localeCompare(b.participantId);
  });

  // Creditors: largest credit first, then participantId ascending
  creditors.sort((a, b) => {
    if (b.balance !== a.balance) {
      return b.balance > a.balance ? 1 : -1;
    }
    return a.participantId.localeCompare(b.participantId);
  });

  const totalDebt = debtors.reduce((acc, d) => acc + d.balance, 0n);
  const totalCredit = creditors.reduce((acc, c) => acc + c.balance, 0n);

  if (totalDebt !== totalCredit) {
    throw new Error(
      `Settlement Planner Invariant Error: total debt (${totalDebt}) does not match total credit (${totalCredit}).`
    );
  }

  if (debtors.length === 0 && creditors.length === 0) {
    return {
      transfers: [],
      totalSettlementValueMinorUnits: 0n,
      totalDebtors: 0,
      totalCreditors: 0,
      isFullySettled: true,
      explanation: 'All group members are fully settled. No reimbursements are currently required.',
    };
  }

  const transfers: ProposedTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  // Clone balances for greedy settlement matching
  const dList = debtors.map((d) => ({ ...d }));
  const cList = creditors.map((c) => ({ ...c }));

  while (dIdx < dList.length && cIdx < cList.length) {
    const debtor = dList[dIdx];
    const creditor = cList[cIdx];

    if (debtor.balance === 0n) {
      dIdx++;
      continue;
    }
    if (creditor.balance === 0n) {
      cIdx++;
      continue;
    }

    const transferAmount = debtor.balance < creditor.balance ? debtor.balance : creditor.balance;

    const senderName = participantNames?.get(debtor.participantId) || debtor.participantId;
    const recipientName = participantNames?.get(creditor.participantId) || creditor.participantId;

    transfers.push({
      senderParticipantId: debtor.participantId,
      recipientParticipantId: creditor.participantId,
      amountMinorUnits: transferAmount,
      basis: `${senderName} reimburses ${recipientName} to offset outstanding group obligations`,
    });

    debtor.balance -= transferAmount;
    creditor.balance -= transferAmount;

    if (debtor.balance === 0n) dIdx++;
    if (creditor.balance === 0n) cIdx++;
  }

  const totalTransfersValue = transfers.reduce((acc, t) => acc + t.amountMinorUnits, 0n);
  if (totalTransfersValue !== totalDebt) {
    throw new Error(
      `Settlement Plan Invariant Error: proposed transfers total (${totalTransfersValue}) does not equal outstanding debt (${totalDebt}).`
    );
  }

  return {
    transfers,
    totalSettlementValueMinorUnits: totalTransfersValue,
    totalDebtors: debtors.length,
    totalCreditors: creditors.length,
    isFullySettled: false,
    explanation: `Consolidated plan resolves all ${debtors.length} debtor(s) and ${creditors.length} creditor(s) in ${transfers.length} direct reimbursement(s).`,
  };
}
