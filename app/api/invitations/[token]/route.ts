import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth.ts';
import { db } from '@/src/db/index.ts';
import { invitations, groups, memberships, participants, auditEvents } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const inv = await db.query.invitations.findFirst({
      where: eq(invitations.token, token),
    });

    if (!inv) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, inv.groupId),
    });

    const isExpired = new Date() > new Date(inv.expiresAt);

    return NextResponse.json({
      invitation: {
        ...inv,
        isExpired,
      },
      groupName: group?.name || 'Group',
      groupDescription: group?.description,
      currency: group?.canonicalCurrency,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }


    const inv = await db.query.invitations.findFirst({
      where: eq(invitations.token, token),
    });

    if (!inv) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    if (inv.status !== 'PENDING') return NextResponse.json({ error: `Invitation already ${inv.status.toLowerCase()}` }, { status: 400 });
    if (new Date() > new Date(inv.expiresAt)) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Add membership
    await db
      .insert(memberships)
      .values({
        groupId: inv.groupId,
        userUid: user.uid,
        role: inv.role,
        status: 'ACTIVE',
      })
      .onConflictDoUpdate({
        target: [memberships.groupId, memberships.userUid],
        set: { role: inv.role, status: 'ACTIVE' },
      });

    // Check if participant exists for user; if not, create one
    const existingPart = await db.query.participants.findFirst({
      where: and(eq(participants.groupId, inv.groupId), eq(participants.linkedUserUid, user.uid)),
    });

    if (!existingPart) {
      await db.insert(participants).values({
        id: `part_${crypto.randomUUID().slice(0, 10)}`,
        groupId: inv.groupId,
        name: user.displayName,
        email: user.email,
        linkedUserUid: user.uid,
        color: '#2a5c4d',
      });
    }

    // Update invitation status
    await db
      .update(invitations)
      .set({ status: 'ACCEPTED' })
      .where(eq(invitations.token, token));

    // Audit event
    await db.insert(auditEvents).values({
      groupId: inv.groupId,
      actorUid: user.uid,
      actorName: user.displayName,
      action: 'INVITATION_ACCEPTED',
      targetId: inv.groupId,
      targetType: 'invitation',
      reason: `${user.displayName} joined group as ${inv.role}`,
    });

    return NextResponse.json({ success: true, groupId: inv.groupId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
