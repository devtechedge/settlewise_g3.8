import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { addParticipant } from '@/services/groupService.ts';
import { db } from '@/src/db/index.ts';
import { participants } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const user = await getSessionUser();
    const role = await getGroupRole(groupId, user.uid);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const list = await db
      .select()
      .from(participants)
      .where(and(eq(participants.groupId, groupId), eq(participants.isArchived, false)))
      .orderBy(participants.name);

    return NextResponse.json(list);
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
    const role = await getGroupRole(groupId, user.uid);
    if (!role || (role !== 'OWNER' && role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Only owners or editors can add participants' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Participant name is required' }, { status: 400 });
    }

    const partId = await addParticipant({
      groupId,
      name: name.trim(),
      email: email?.trim() || undefined,
      actorUid: user.uid,
      actorName: user.displayName,
    });

    return NextResponse.json({ success: true, participantId: partId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
