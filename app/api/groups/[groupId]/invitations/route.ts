import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { createGroupInvitation } from '@/services/groupService.ts';

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
    if (!role || role !== 'OWNER') {
      return NextResponse.json({ error: 'Only group owners can invite new members' }, { status: 403 });
    }

    const body = await req.json();
    const { email, role: inviteRole } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const token = await createGroupInvitation({
      groupId,
      email: email.trim(),
      role: inviteRole === 'EDITOR' ? 'EDITOR' : 'MEMBER',
      inviterUid: user.uid,
      inviterName: user.displayName,
    });

    return NextResponse.json({ success: true, token, inviteLink: `/invite/${token}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
