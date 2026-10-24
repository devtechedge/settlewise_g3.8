import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { getGroupSettlementState } from '@/services/settlementService.ts';

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

    const state = await getGroupSettlementState(groupId);

    // Convert BigInts to string
    const serializedBalances = state.balances.map((b) => ({
      ...b,
      totalPaid: b.totalPaid.toString(),
      totalAllocated: b.totalAllocated.toString(),
      paymentsSent: b.paymentsSent.toString(),
      paymentsReceived: b.paymentsReceived.toString(),
      netBalance: b.netBalance.toString(),
    }));

    const serializedTransfers = state.plan.transfers.map((t) => ({
      ...t,
      amountMinorUnits: t.amountMinorUnits.toString(),
    }));

    const serializedPayments = state.payments.map((p) => ({
      ...p,
      amountMinorUnits: p.amountMinorUnits.toString(),
    }));

    return NextResponse.json({
      balances: serializedBalances,
      plan: {
        ...state.plan,
        totalSettlementValueMinorUnits: state.plan.totalSettlementValueMinorUnits.toString(),
        transfers: serializedTransfers,
      },
      payments: serializedPayments,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
