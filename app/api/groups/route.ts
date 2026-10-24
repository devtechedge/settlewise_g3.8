import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth.ts';
import { getUserGroups, createGroup } from '@/services/groupService.ts';
import { parseExactToMinorUnits } from '@/domain/money/decimal.ts';

export async function GET() {
  try {
    const user = await getSessionUser();
    const groupsList = await getUserGroups(user.uid);
    // Convert BigInt to string in response
    const sanitized = groupsList.map((g) => ({
      ...g,
      budgetMinorUnits: g.budgetMinorUnits ? g.budgetMinorUnits.toString() : null,
    }));
    return NextResponse.json(sanitized);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const { name, description, canonicalCurrency, budget, budgetPeriod, initialParticipants } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const currencyCode = (canonicalCurrency || 'USD').toUpperCase();
    let budgetMinorUnits: bigint | null = null;
    if (budget && String(budget).trim()) {
      budgetMinorUnits = parseExactToMinorUnits(String(budget), currencyCode);
    }

    const groupId = await createGroup({
      name,
      description,
      canonicalCurrency: currencyCode,
      budgetMinorUnits,
      budgetPeriod: budgetPeriod || 'monthly',
      ownerUid: user.uid,
      ownerName: user.displayName,
      initialParticipantNames: Array.isArray(initialParticipants) ? initialParticipants : [],
    });

    return NextResponse.json({ success: true, groupId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
