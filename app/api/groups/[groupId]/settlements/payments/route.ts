import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { recordSettlementPayment } from '@/services/settlementService.ts';
import { parseExactToMinorUnits } from '@/domain/money/decimal.ts';
import { db } from '@/src/db/index.ts';
import { groups } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

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
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const body = await req.json();
    const {
      senderParticipantId,
      recipientParticipantId,
      amount,
      recordedDate,
      notes,
      idempotencyKey,
    } = body;

    if (!senderParticipantId || !recipientParticipantId) {
      return NextResponse.json({ error: 'Sender and recipient are required' }, { status: 400 });
    }
    if (!recordedDate) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const amountMinorUnits = parseExactToMinorUnits(String(amount), group.canonicalCurrency);

    const paymentId = await recordSettlementPayment({
      groupId,
      senderParticipantId,
      recipientParticipantId,
      amountMinorUnits,
      recordedDate,
      notes,
      idempotencyKey,
      creatorUid: user.uid,
      creatorName: user.displayName,
    });

    return NextResponse.json({ success: true, paymentId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
