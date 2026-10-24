import { db } from '../src/db/index.ts';
import {
  participants,
  expenses,
  expenseSplits,
  settlementPayments,
  auditEvents,
} from '../src/db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import { computeGroupBalances } from '../domain/settlement/balances.ts';
import { generateSettlementPlan } from '../domain/settlement/planner.ts';

export async function getGroupSettlementState(groupId: string) {
  // 1. Fetch participants
  const groupParticipants = await db
    .select()
    .from(participants)
    .where(and(eq(participants.groupId, groupId), eq(participants.isArchived, false)));

  const participantIds = groupParticipants.map((p) => p.id);
  const participantMap = new Map(groupParticipants.map((p) => [p.id, p]));
  const nameMap = new Map(groupParticipants.map((p) => [p.id, p.name]));

  // 2. Fetch active expenses and splits
  const activeExpenses = await db
    .select({
      id: expenses.id,
      payerParticipantId: expenses.payerParticipantId,
      amountMinorUnits: expenses.amountMinorUnits,
      status: expenses.status,
    })
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.status, 'ACTIVE')));

  const activeSplits = await db
    .select({
      expenseId: expenseSplits.expenseId,
      participantId: expenseSplits.participantId,
      allocatedMinorUnits: expenseSplits.allocatedMinorUnits,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(and(eq(expenses.groupId, groupId), eq(expenses.status, 'ACTIVE')));

  const splitsByExp = new Map<string, { participantId: string; allocatedMinorUnits: bigint }[]>();
  for (const s of activeSplits) {
    if (!splitsByExp.has(s.expenseId)) {
      splitsByExp.set(s.expenseId, []);
    }
    splitsByExp.get(s.expenseId)!.push({
      participantId: s.participantId,
      allocatedMinorUnits: s.allocatedMinorUnits,
    });
  }

  const expRecords = activeExpenses.map((e) => ({
    id: e.id,
    payerParticipantId: e.payerParticipantId,
    amountMinorUnits: e.amountMinorUnits,
    status: e.status,
    splits: splitsByExp.get(e.id) || [],
  }));

  // 3. Fetch all payments (active and reversed)
  const allPayments = await db
    .select({
      id: settlementPayments.id,
      groupId: settlementPayments.groupId,
      senderParticipantId: settlementPayments.senderParticipantId,
      senderName: participants.name,
      recipientParticipantId: settlementPayments.recipientParticipantId,
      amountMinorUnits: settlementPayments.amountMinorUnits,
      recordedDate: settlementPayments.recordedDate,
      status: settlementPayments.status,
      notes: settlementPayments.notes,
      reversalReason: settlementPayments.reversalReason,
      reversedAt: settlementPayments.reversedAt,
      createdAt: settlementPayments.createdAt,
    })
    .from(settlementPayments)
    .innerJoin(participants, eq(settlementPayments.senderParticipantId, participants.id))
    .where(eq(settlementPayments.groupId, groupId))
    .orderBy(desc(settlementPayments.recordedDate), desc(settlementPayments.createdAt));

  // Decorate recipient name
  const paymentsWithRecipient = allPayments.map((p) => ({
    ...p,
    recipientName: participantMap.get(p.recipientParticipantId)?.name || p.recipientParticipantId,
  }));

  // Payments for balance computation (only CONFIRMED)
  const paymentRecords = allPayments.map((p) => ({
    id: p.id,
    senderParticipantId: p.senderParticipantId,
    recipientParticipantId: p.recipientParticipantId,
    amountMinorUnits: p.amountMinorUnits,
    status: p.status,
  }));

  // 4. Compute deterministic balances
  const balancesMap = computeGroupBalances(participantIds, expRecords, paymentRecords);

  // 5. Generate settlement plan
  const plan = generateSettlementPlan(balancesMap, nameMap);

  // Decorate participant summaries
  const balancesList = Array.from(balancesMap.values()).map((b) => {
    const p = participantMap.get(b.participantId);
    return {
      participantId: b.participantId,
      name: p?.name || b.participantId,
      color: p?.color || '#333333',
      totalPaid: b.totalPaid,
      totalAllocated: b.totalAllocated,
      paymentsSent: b.paymentsSent,
      paymentsReceived: b.paymentsReceived,
      netBalance: b.netBalance,
    };
  });

  // Decorate proposed transfers with names
  const transfersWithNames = plan.transfers.map((t) => ({
    senderParticipantId: t.senderParticipantId,
    senderName: nameMap.get(t.senderParticipantId) || t.senderParticipantId,
    recipientParticipantId: t.recipientParticipantId,
    recipientName: nameMap.get(t.recipientParticipantId) || t.recipientParticipantId,
    amountMinorUnits: t.amountMinorUnits,
    basis: t.basis,
  }));

  return {
    balances: balancesList,
    plan: {
      ...plan,
      transfers: transfersWithNames,
    },
    payments: paymentsWithRecipient,
  };
}

export async function recordSettlementPayment(params: {
  groupId: string;
  senderParticipantId: string;
  recipientParticipantId: string;
  amountMinorUnits: bigint;
  recordedDate: string; // YYYY-MM-DD
  notes?: string;
  idempotencyKey?: string;
  creatorUid: string;
  creatorName: string;
}) {
  if (params.senderParticipantId === params.recipientParticipantId) {
    throw new Error('Sender and recipient must be distinct participants.');
  }

  if (params.amountMinorUnits <= 0n) {
    throw new Error('Reimbursement amount must be greater than zero.');
  }

  // Idempotency check
  const idempKey = params.idempotencyKey?.trim() || `pmt_${crypto.randomUUID()}`;
  const existing = await db.query.settlementPayments.findFirst({
    where: eq(settlementPayments.idempotencyKey, idempKey),
  });

  if (existing) {
    return existing.id; // Return idempotent result
  }

  const paymentId = `pmt_${crypto.randomUUID().slice(0, 12)}`;

  await db.insert(settlementPayments).values({
    id: paymentId,
    groupId: params.groupId,
    senderParticipantId: params.senderParticipantId,
    recipientParticipantId: params.recipientParticipantId,
    amountMinorUnits: params.amountMinorUnits,
    recordedDate: params.recordedDate,
    status: 'CONFIRMED',
    notes: params.notes?.trim() || null,
    idempotencyKey: idempKey,
    creatorUid: params.creatorUid,
  });

  await db.insert(auditEvents).values({
    groupId: params.groupId,
    actorUid: params.creatorUid,
    actorName: params.creatorName,
    action: 'PAYMENT_RECORDED',
    targetId: paymentId,
    targetType: 'payment',
    reason: `Recorded reimbursement of ${params.amountMinorUnits} minor units`,
  });

  return paymentId;
}

export async function reverseSettlementPayment(params: {
  paymentId: string;
  groupId: string;
  reason: string;
  actorUid: string;
  actorName: string;
}) {
  const payment = await db.query.settlementPayments.findFirst({
    where: and(
      eq(settlementPayments.id, params.paymentId),
      eq(settlementPayments.groupId, params.groupId)
    ),
  });

  if (!payment) {
    throw new Error('Payment record not found.');
  }

  if (payment.status === 'REVERSED') {
    throw new Error('Payment is already reversed.');
  }

  if (!params.reason?.trim()) {
    throw new Error('An audit reason is required to reverse a settlement payment.');
  }

  await db
    .update(settlementPayments)
    .set({
      status: 'REVERSED',
      reversalReason: params.reason.trim(),
      reversedAt: new Date(),
    })
    .where(eq(settlementPayments.id, params.paymentId));

  await db.insert(auditEvents).values({
    groupId: params.groupId,
    actorUid: params.actorUid,
    actorName: params.actorName,
    action: 'PAYMENT_REVERSED',
    targetId: params.paymentId,
    targetType: 'payment',
    reason: params.reason.trim(),
  });

  return true;
}
