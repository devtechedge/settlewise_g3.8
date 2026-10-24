import { cookies } from 'next/headers';
import { db, isDemoMode, awaitSeed } from '@/src/db/index.ts';
import { users, memberships } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { AuthUser, DEMO_USERS } from './auth-types.ts';

export type { AuthUser };
export { DEMO_USERS };

/**
 * Retrieves the currently authenticated user from request cookies.
 *
 * Demo mode: with no session, the visitor is signed in as Alice Vance so the
 * product is instantly explorable. Outside demo mode, an unknown or missing
 * session returns null and callers must require authentication.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionUid = cookieStore.get('settlewise_uid')?.value;

  if (sessionUid && DEMO_USERS[sessionUid]) {
    return DEMO_USERS[sessionUid];
  }

  if (sessionUid) {
    try {
      await awaitSeed();
      const dbUser = await db.query.users.findFirst({
        where: eq(users.uid, sessionUid),
      });
      if (dbUser && !dbUser.disabled) {
        return {
          uid: dbUser.uid,
          email: dbUser.email,
          displayName: dbUser.displayName,
          photoUrl: dbUser.photoUrl,
        };
      }
    } catch (err) {
      console.error('Session lookup failed:', err);
    }
  }

  if (isDemoMode()) {
    return DEMO_USERS.usr_alice;
  }
  return null;
}

/**
 * Checks group membership and role for authorization.
 */
export async function getGroupRole(
  groupId: string,
  userUid: string
): Promise<'OWNER' | 'EDITOR' | 'MEMBER' | null> {
  try {
    await awaitSeed();
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.groupId, groupId),
        eq(memberships.userUid, userUid),
        eq(memberships.status, 'ACTIVE')
      ),
    });

    if (!membership) {
      return null;
    }

    return membership.role as 'OWNER' | 'EDITOR' | 'MEMBER';
  } catch (err) {
    console.error('Error fetching group role:', err);
    return null;
  }
}
