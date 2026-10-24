import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { getExpenseWithHistory, updateExpense } from '@/services/expenseService.ts';
import { parseExactToMinorUnits } from '@/domain/money/decimal.ts';
import { db } from '@/src/db/index.ts';
import { expenses, groups } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const { expenseId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }


    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, expenseId),
    });

    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    const role = await getGroupRole(expense.groupId, user.uid);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const details = await getExpenseWithHistory(expenseId, expense.groupId);
    if (!details) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    return NextResponse.json({
      ...details,
      amountMinorUnits: details.amountMinorUnits.toString(),
      splits: details.splits.map((s) => ({
        ...s,
        allocatedMinorUnits: s.allocatedMinorUnits.toString(),
      })),
      revisions: details.revisions.map((r) => ({
        ...r,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const { expenseId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }


    const current = await db.query.expenses.findFirst({
      where: eq(expenses.id, expenseId),
    });

    if (!current) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    const role = await getGroupRole(current.groupId, user.uid);
    if (!role || (role !== 'OWNER' && role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Only owners or editors can edit expenses' }, { status: 403 });
    }

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, current.groupId),
    });
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const body = await req.json();
    const {
      expectedRevision,
      description,
      category,
      occurrenceDate,
      payerParticipantId,
      amount,
      notes,
      reason,
      allocationMethod,
      equalParticipants,
      exactAllocations,
      percentageAllocations,
      sharesAllocations,
    } = body;

    if (expectedRevision === undefined || expectedRevision === null) {
      return NextResponse.json({ error: 'expectedRevision is required for safe editing' }, { status: 400 });
    }

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'An audit reason is required for expense modifications' }, { status: 400 });
    }

    const amountMinorUnits = parseExactToMinorUnits(String(amount), group.canonicalCurrency);

    let parsedExact: { participantId: string; amountMinorUnits: bigint }[] | undefined;
    if (exactAllocations && Array.isArray(exactAllocations)) {
      parsedExact = exactAllocations.map((a: any) => ({
        participantId: a.participantId,
        amountMinorUnits: parseExactToMinorUnits(String(a.amount), group.canonicalCurrency),
      }));
    }

    const nextRevision = await updateExpense({
      expenseId,
      groupId: current.groupId,
      expectedRevision: Number(expectedRevision),
      description,
      category,
      occurrenceDate,
      payerParticipantId,
      amountMinorUnits,
      notes,
      actorUid: user.uid,
      actorName: user.displayName,
      reason,
      allocationMethod: allocationMethod || 'EQUAL',
      equalParticipants,
      exactAllocations: parsedExact,
      percentageAllocations,
      sharesAllocations,
    });

    return NextResponse.json({ success: true, nextRevision });
  } catch (err: any) {
    const isConflict = err.message.includes('Conflict: Stale revision');
    return NextResponse.json({ error: err.message }, { status: isConflict ? 409 : 400 });
  }
}
