import { db } from '../src/db/index.ts';
import {
  expenses,
  expenseSplits,
  expenseRevisions,
  participants,
  auditEvents,
} from '../src/db/schema.ts';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { resolveAllocations, AllocationMethod } from '../domain/money/allocations.ts';

export async function getGroupExpenses(params: {
  groupId: string;
  category?: string;
  participantId?: string;
  search?: string;
  status?: string;
}) {
  const allExpenses = await db
    .select({
      id: expenses.id,
      groupId: expenses.groupId,
      description: expenses.description,
      category: expenses.category,
      occurrenceDate: expenses.occurrenceDate,
      payerParticipantId: expenses.payerParticipantId,
      payerName: participants.name,
      payerColor: participants.color,
      currency: expenses.currency,
      amountMinorUnits: expenses.amountMinorUnits,
      notes: expenses.notes,
      status: expenses.status,
      voidReason: expenses.voidReason,
      voidedAt: expenses.voidedAt,
      creatorUid: expenses.creatorUid,
      revision: expenses.revision,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
    })
    .from(expenses)
    .innerJoin(participants, eq(expenses.payerParticipantId, participants.id))
    .where(
      and(
        eq(expenses.groupId, params.groupId),
        params.status ? eq(expenses.status, params.status) : undefined,
        params.category && params.category !== 'ALL'
          ? eq(expenses.category, params.category)
          : undefined,
        params.participantId
          ? eq(expenses.payerParticipantId, params.participantId)
          : undefined,
        params.search
          ? or(
              ilike(expenses.description, `%${params.search}%`),
              ilike(expenses.notes, `%${params.search}%`),
              ilike(participants.name, `%${params.search}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(expenses.occurrenceDate), desc(expenses.createdAt));

  // Fetch splits for these expenses
  const expenseIds = allExpenses.map((e) => e.id);
  const splits =
    expenseIds.length > 0
      ? await db
          .select({
            id: expenseSplits.id,
            expenseId: expenseSplits.expenseId,
            participantId: expenseSplits.participantId,
            participantName: participants.name,
            allocationMethod: expenseSplits.allocationMethod,
            allocatedMinorUnits: expenseSplits.allocatedMinorUnits,
            shareWeight: expenseSplits.shareWeight,
            basisPoints: expenseSplits.basisPoints,
          })
          .from(expenseSplits)
          .innerJoin(participants, eq(expenseSplits.participantId, participants.id))
          .where(sql`${expenseSplits.expenseId} IN ${expenseIds}`)
      : [];

  const splitsByExpenseId = new Map<string, typeof splits>();
  for (const s of splits) {
    if (!splitsByExpenseId.has(s.expenseId)) {
      splitsByExpenseId.set(s.expenseId, []);
    }
    splitsByExpenseId.get(s.expenseId)!.push(s);
  }

  return allExpenses.map((e) => ({
    ...e,
    splits: splitsByExpenseId.get(e.id) || [],
  }));
}

export async function getExpenseWithHistory(expenseId: string, groupId: string) {
  const expense = await db.query.expenses.findFirst({
    where: and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)),
  });

  if (!expense) return null;

  const splits = await db
    .select({
      id: expenseSplits.id,
      participantId: expenseSplits.participantId,
      participantName: participants.name,
      allocationMethod: expenseSplits.allocationMethod,
      allocatedMinorUnits: expenseSplits.allocatedMinorUnits,
      shareWeight: expenseSplits.shareWeight,
      basisPoints: expenseSplits.basisPoints,
    })
    .from(expenseSplits)
    .innerJoin(participants, eq(expenseSplits.participantId, participants.id))
    .where(eq(expenseSplits.expenseId, expenseId));

  const revisions = await db
    .select()
    .from(expenseRevisions)
    .where(eq(expenseRevisions.expenseId, expenseId))
    .orderBy(desc(expenseRevisions.revisionNumber));

  return {
    ...expense,
    splits,
    revisions,
  };
}

export async function createExpense(params: {
  groupId: string;
  description: string;
  category: string;
  occurrenceDate: string; // YYYY-MM-DD
  payerParticipantId: string;
  currency: string;
  amountMinorUnits: bigint;
  notes?: string;
  creatorUid: string;
  creatorName: string;
  allocationMethod: AllocationMethod;
  equalParticipants?: string[];
  exactAllocations?: { participantId: string; amountMinorUnits: bigint }[];
  percentageAllocations?: { participantId: string; basisPoints: number }[];
  sharesAllocations?: { participantId: string; weight: number }[];
}) {
  // Validate allocations using pure domain engine
  const allocations = resolveAllocations({
    method: params.allocationMethod,
    totalAmountMinorUnits: params.amountMinorUnits,
    equalParticipants: params.equalParticipants,
    exactAllocations: params.exactAllocations,
    percentageAllocations: params.percentageAllocations,
    sharesAllocations: params.sharesAllocations,
  });

  const expenseId = `exp_${crypto.randomUUID().slice(0, 12)}`;

  // Insert expense
  await db.insert(expenses).values({
    id: expenseId,
    groupId: params.groupId,
    description: params.description.trim(),
    category: params.category.trim() || 'Other',
    occurrenceDate: params.occurrenceDate,
    payerParticipantId: params.payerParticipantId,
    currency: params.currency,
    amountMinorUnits: params.amountMinorUnits,
    notes: params.notes?.trim() || null,
    creatorUid: params.creatorUid,
    revision: 1,
    status: 'ACTIVE',
  });

  // Insert splits
  for (const alloc of allocations) {
    await db.insert(expenseSplits).values({
      expenseId,
      participantId: alloc.participantId,
      allocationMethod: params.allocationMethod,
      allocatedMinorUnits: alloc.allocatedMinorUnits,
      shareWeight: alloc.shareWeight || null,
      basisPoints: alloc.basisPoints || null,
    });
  }

  // Audit event
  await db.insert(auditEvents).values({
    groupId: params.groupId,
    actorUid: params.creatorUid,
    actorName: params.creatorName,
    action: 'EXPENSE_CREATED',
    targetId: expenseId,
    targetType: 'expense',
    reason: `Recorded expense "${params.description.trim()}"`,
  });

  return expenseId;
}

export async function updateExpense(params: {
  expenseId: string;
  groupId: string;
  expectedRevision: number;
  description: string;
  category: string;
  occurrenceDate: string;
  payerParticipantId: string;
  amountMinorUnits: bigint;
  notes?: string;
  actorUid: string;
  actorName: string;
  reason: string;
  allocationMethod: AllocationMethod;
  equalParticipants?: string[];
  exactAllocations?: { participantId: string; amountMinorUnits: bigint }[];
  percentageAllocations?: { participantId: string; basisPoints: number }[];
  sharesAllocations?: { participantId: string; weight: number }[];
}) {
  const current = await getExpenseWithHistory(params.expenseId, params.groupId);
  if (!current) {
    throw new Error('Expense not found.');
  }

  if (current.status !== 'ACTIVE') {
    throw new Error('Cannot edit a voided expense.');
  }

  // Stale write check (Optimistic Concurrency Control)
  if (current.revision !== params.expectedRevision) {
    throw new Error(
      `Conflict: Stale revision detected. The expense is at revision ${current.revision}, but your update was based on revision ${params.expectedRevision}. Please refresh and reapply.`
    );
  }

  if (!params.reason?.trim()) {
    throw new Error('An audit reason is required when modifying a financial record.');
  }

  // Calculate new allocations
  const newAllocations = resolveAllocations({
    method: params.allocationMethod,
    totalAmountMinorUnits: params.amountMinorUnits,
    equalParticipants: params.equalParticipants,
    exactAllocations: params.exactAllocations,
    percentageAllocations: params.percentageAllocations,
    sharesAllocations: params.sharesAllocations,
  });

  // Snapshot before state
  const beforeSnapshot = JSON.stringify({
    description: current.description,
    category: current.category,
    occurrenceDate: current.occurrenceDate,
    payerParticipantId: current.payerParticipantId,
    amountMinorUnits: current.amountMinorUnits.toString(),
    notes: current.notes,
    splits: current.splits.map((s) => ({
      participantId: s.participantId,
      allocationMethod: s.allocationMethod,
      allocatedMinorUnits: s.allocatedMinorUnits.toString(),
      shareWeight: s.shareWeight,
      basisPoints: s.basisPoints,
    })),
  });

  // Snapshot after state
  const afterSnapshot = JSON.stringify({
    description: params.description.trim(),
    category: params.category.trim(),
    occurrenceDate: params.occurrenceDate,
    payerParticipantId: params.payerParticipantId,
    amountMinorUnits: params.amountMinorUnits.toString(),
    notes: params.notes?.trim() || null,
    splits: newAllocations.map((a) => ({
      participantId: a.participantId,
      allocationMethod: params.allocationMethod,
      allocatedMinorUnits: a.allocatedMinorUnits.toString(),
      shareWeight: a.shareWeight,
      basisPoints: a.basisPoints,
    })),
  });

  const nextRevision = current.revision + 1;

  // Insert immutable revision history
  await db.insert(expenseRevisions).values({
    expenseId: params.expenseId,
    revisionNumber: current.revision,
    beforeSnapshot,
    afterSnapshot,
    reason: params.reason.trim(),
    actorUid: params.actorUid,
  });

  // Update expense record
  await db
    .update(expenses)
    .set({
      description: params.description.trim(),
      category: params.category.trim(),
      occurrenceDate: params.occurrenceDate,
      payerParticipantId: params.payerParticipantId,
      amountMinorUnits: params.amountMinorUnits,
      notes: params.notes?.trim() || null,
      revision: nextRevision,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, params.expenseId));

  // Replace splits
  await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, params.expenseId));

  for (const alloc of newAllocations) {
    await db.insert(expenseSplits).values({
      expenseId: params.expenseId,
      participantId: alloc.participantId,
      allocationMethod: params.allocationMethod,
      allocatedMinorUnits: alloc.allocatedMinorUnits,
      shareWeight: alloc.shareWeight || null,
      basisPoints: alloc.basisPoints || null,
    });
  }

  // Audit event
  await db.insert(auditEvents).values({
    groupId: params.groupId,
    actorUid: params.actorUid,
    actorName: params.actorName,
    action: 'EXPENSE_EDITED',
    targetId: params.expenseId,
    targetType: 'expense',
    reason: params.reason.trim(),
  });

  return nextRevision;
}

export async function voidExpense(params: {
  expenseId: string;
  groupId: string;
  reason: string;
  actorUid: string;
  actorName: string;
}) {
  const expense = await db.query.expenses.findFirst({
    where: and(eq(expenses.id, params.expenseId), eq(expenses.groupId, params.groupId)),
  });

  if (!expense) {
    throw new Error('Expense not found.');
  }

  if (expense.status === 'VOIDED') {
    throw new Error('Expense is already voided.');
  }

  if (!params.reason?.trim()) {
    throw new Error('A cancellation reason is required to void an expense.');
  }

  await db
    .update(expenses)
    .set({
      status: 'VOIDED',
      voidReason: params.reason.trim(),
      voidedAt: new Date(),
      voidedByUid: params.actorUid,
      revision: expense.revision + 1,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, params.expenseId));

  await db.insert(auditEvents).values({
    groupId: params.groupId,
    actorUid: params.actorUid,
    actorName: params.actorName,
    action: 'EXPENSE_VOIDED',
    targetId: params.expenseId,
    targetType: 'expense',
    reason: params.reason.trim(),
  });

  return true;
}
