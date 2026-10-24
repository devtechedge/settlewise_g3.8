import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { reverseSettlementPayment } from '@/services/settlementService.ts';
import { db } from '@/src/db/index.ts';
import { settlementPayments } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }


    const payment = await db.query.settlementPayments.findFirst({
      where: eq(settlementPayments.id, id),
    });

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const role = await getGroupRole(payment.groupId, user.uid);
    if (!role || (role !== 'OWNER' && role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Only owners or editors can reverse payments' }, { status: 403 });
    }

    const body = await req.json();
    const { reason } = body;

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'An audit reason is required for payment reversal' }, { status: 400 });
    }

    await reverseSettlementPayment({
      paymentId: id,
      groupId: payment.groupId,
      reason: reason.trim(),
      actorUid: user.uid,
      actorName: user.displayName,
    });

    return NextResponse.json({ success: true, reversed: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
