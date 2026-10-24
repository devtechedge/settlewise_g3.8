import { db } from '../src/db/index.ts';
import { groups, memberships, participants, users, invitations, auditEvents } from '../src/db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import { getCurrency } from '../domain/money/currency.ts';
import { ensureSeedData } from './seedService.ts';

export async function getUserGroups(userUid: string) {
  await ensureSeedData();

  // Find all groups where user is a member or owner
  const userMemberships = await db
    .select({
      group: groups,
      role: memberships.role,
      status: memberships.status,
    })
    .from(memberships)
    .innerJoin(groups, eq(memberships.groupId, groups.id))
    .where(and(eq(memberships.userUid, userUid), eq(memberships.status, 'ACTIVE')))
    .orderBy(desc(groups.createdAt));

  return userMemberships.map((m) => ({
    ...m.group,
    role: m.role,
  }));
}

export async function getGroupDetails(groupId: string, userUid: string) {
  await ensureSeedData();

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });

  if (!group) return null;

  // Check user membership
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.groupId, groupId),
      eq(memberships.userUid, userUid),
      eq(memberships.status, 'ACTIVE')
    ),
  });

  if (!membership) {
    // Check if user is owner
    if (group.ownerUid !== userUid) {
      return null;
    }
  }

  // Fetch participants
  const groupParticipants = await db
    .select()
    .from(participants)
    .where(and(eq(participants.groupId, groupId), eq(participants.isArchived, false)))
    .orderBy(participants.name);

  // Fetch memberships with user details
  const allMembers = await db
    .select({
      id: memberships.id,
      role: memberships.role,
      userUid: memberships.userUid,
      displayName: users.displayName,
      email: users.email,
      photoUrl: users.photoUrl,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userUid, users.uid))
    .where(and(eq(memberships.groupId, groupId), eq(memberships.status, 'ACTIVE')));

  return {
    ...group,
    userRole: membership?.role || 'MEMBER',
    participants: groupParticipants,
    members: allMembers,
  };
}

export async function createGroup(params: {
  name: string;
  description?: string;
  canonicalCurrency: string;
  budgetMinorUnits?: bigint | null;
  budgetPeriod?: string;
  ownerUid: string;
  ownerName: string;
  initialParticipantNames?: string[];
}) {
  const currency = getCurrency(params.canonicalCurrency);
  const groupId = `grp_${crypto.randomUUID().slice(0, 12)}`;

  await db.insert(groups).values({
    id: groupId,
    name: params.name.trim(),
    description: params.description?.trim() || null,
    ownerUid: params.ownerUid,
    canonicalCurrency: currency.code,
    currencyPrecision: currency.decimals,
    budgetMinorUnits: params.budgetMinorUnits || null,
    budgetPeriod: params.budgetPeriod || 'monthly',
    status: 'active',
  });

  // Owner membership
  await db.insert(memberships).values({
    groupId,
    userUid: params.ownerUid,
    role: 'OWNER',
    status: 'ACTIVE',
  });

  // Create participant record for owner
  const ownerPartId = `part_${crypto.randomUUID().slice(0, 10)}`;
  await db.insert(participants).values({
    id: ownerPartId,
    groupId,
    name: params.ownerName.trim(),
    linkedUserUid: params.ownerUid,
    color: '#2a5c4d',
  });

  // Add any extra initial participants
  if (params.initialParticipantNames && params.initialParticipantNames.length > 0) {
    const colors = ['#c85a32', '#3d6380', '#88507c', '#607d8b', '#795548'];
    let cIdx = 0;
    for (const name of params.initialParticipantNames) {
      if (!name.trim()) continue;
      const partId = `part_${crypto.randomUUID().slice(0, 10)}`;
      await db.insert(participants).values({
        id: partId,
        groupId,
        name: name.trim(),
        color: colors[cIdx % colors.length],
      });
      cIdx++;
    }
  }

  // Audit event
  await db.insert(auditEvents).values({
    groupId,
    actorUid: params.ownerUid,
    actorName: params.ownerName,
    action: 'GROUP_CREATED',
    targetId: groupId,
    targetType: 'group',
    reason: `Created group ${params.name} with currency ${currency.code}`,
  });

  return groupId;
}

export async function addParticipant(params: {
  groupId: string;
  name: string;
  email?: string;
  actorUid: string;
  actorName: string;
}) {
  const partId = `part_${crypto.randomUUID().slice(0, 10)}`;
  const colors = ['#2a5c4d', '#c85a32', '#3d6380', '#88507c', '#546e7a', '#6d4c41'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // Check if email matches existing registered user
  let linkedUid: string | null = null;
  if (params.email?.trim()) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, params.email.trim().toLowerCase()),
    });
    if (existing) {
      linkedUid = existing.uid;
      // also grant membership if not present
      await db
        .insert(memberships)
        .values({
          groupId: params.groupId,
          userUid: existing.uid,
          role: 'MEMBER',
          status: 'ACTIVE',
        })
        .onConflictDoNothing();
    }
  }

  await db.insert(participants).values({
    id: partId,
    groupId: params.groupId,
    name: params.name.trim(),
    email: params.email?.trim() || null,
    linkedUserUid: linkedUid,
    color,
  });

  await db.insert(auditEvents).values({
    groupId: params.groupId,
    actorUid: params.actorUid,
    actorName: params.actorName,
    action: 'PARTICIPANT_ADDED',
    targetId: partId,
    targetType: 'participant',
    reason: `Added participant "${params.name.trim()}"`,
  });

  return partId;
}

export async function createGroupInvitation(params: {
  groupId: string;
  email: string;
  role: 'EDITOR' | 'MEMBER';
  inviterUid: string;
  inviterName: string;
}) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(invitations).values({
    groupId: params.groupId,
    email: params.email.trim().toLowerCase(),
    role: params.role,
    token,
    inviterUid: params.inviterUid,
    expiresAt,
    status: 'PENDING',
  });

  await db.insert(auditEvents).values({
    groupId: params.groupId,
    actorUid: params.inviterUid,
    actorName: params.inviterName,
    action: 'INVITATION_CREATED',
    targetId: token,
    targetType: 'invitation',
    reason: `Invited ${params.email} as ${params.role}`,
  });

  return token;
}
