import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { voidExpense } from '@/services/expenseService.ts';
import { db } from '@/src/db/index.ts';
import { expenses } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function POST(
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
    if (!role || (role !== 'OWNER' && role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Only owners or editors can void expenses' }, { status: 403 });
    }

    const body = await req.json();
    const { reason } = body;

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A cancellation reason is required' }, { status: 400 });
    }

    await voidExpense({
      expenseId,
      groupId: expense.groupId,
      reason: reason.trim(),
      actorUid: user.uid,
      actorName: user.displayName,
    });

    return NextResponse.json({ success: true, voided: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
