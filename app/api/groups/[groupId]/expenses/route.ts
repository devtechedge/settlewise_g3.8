import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { getGroupExpenses, createExpense } from '@/services/expenseService.ts';
import { parseExactToMinorUnits } from '@/domain/money/decimal.ts';
import { db } from '@/src/db/index.ts';
import { groups } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const role = await getGroupRole(groupId, user.uid);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const participantId = searchParams.get('participantId') || undefined;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const expensesList = await getGroupExpenses({
      groupId,
      category,
      participantId,
      search,
      status,
    });

    const serialized = expensesList.map((e) => ({
      ...e,
      amountMinorUnits: e.amountMinorUnits.toString(),
      splits: e.splits.map((s) => ({
        ...s,
        allocatedMinorUnits: s.allocatedMinorUnits.toString(),
      })),
    }));

    return NextResponse.json(serialized);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const role = await getGroupRole(groupId, user.uid);
    if (!role || (role !== 'OWNER' && role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Only group owners or editors can record expenses' }, { status: 403 });
    }

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const body = await req.json();
    const {
      description,
      category,
      occurrenceDate,
      payerParticipantId,
      amount,
      notes,
      allocationMethod,
      equalParticipants,
      exactAllocations,
      percentageAllocations,
      sharesAllocations,
    } = body;

    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!payerParticipantId) {
      return NextResponse.json({ error: 'Payer is required' }, { status: 400 });
    }
    if (!occurrenceDate) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const amountMinorUnits = parseExactToMinorUnits(String(amount), group.canonicalCurrency);
    if (amountMinorUnits <= 0n) {
      return NextResponse.json({ error: 'Expense amount must be greater than zero' }, { status: 400 });
    }

    // Process exact allocations if provided
    let parsedExact: { participantId: string; amountMinorUnits: bigint }[] | undefined;
    if (exactAllocations && Array.isArray(exactAllocations)) {
      parsedExact = exactAllocations.map((a: any) => ({
        participantId: a.participantId,
        amountMinorUnits: parseExactToMinorUnits(String(a.amount), group.canonicalCurrency),
      }));
    }

    const expenseId = await createExpense({
      groupId,
      description,
      category: category || 'Other',
      occurrenceDate,
      payerParticipantId,
      currency: group.canonicalCurrency,
      amountMinorUnits,
      notes,
      creatorUid: user.uid,
      creatorName: user.displayName,
      allocationMethod: allocationMethod || 'EQUAL',
      equalParticipants,
      exactAllocations: parsedExact,
      percentageAllocations,
      sharesAllocations,
    });

    return NextResponse.json({ success: true, expenseId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
