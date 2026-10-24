import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth.ts';
import { getGroupDetails } from '@/services/groupService.ts';

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

    const group = await getGroupDetails(groupId, user.uid);

    if (!group) {
      return NextResponse.json({ error: 'Group not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({
      ...group,
      budgetMinorUnits: group.budgetMinorUnits ? group.budgetMinorUnits.toString() : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
