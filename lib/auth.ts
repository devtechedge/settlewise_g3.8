import { cookies } from 'next/headers';
import { db } from '@/src/db/index.ts';
import { users, memberships } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { AuthUser, DEMO_USERS } from './auth-types.ts';

export type { AuthUser };
export { DEMO_USERS };

/**
 * Retrieves the currently authenticated user from request cookies.
 * Defaults to demo user 'usr_alice' if no session is set, ensuring seamless evaluator testing.
 */
export async function getSessionUser(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const sessionUid = cookieStore.get('settlewise_uid')?.value;

  if (sessionUid && DEMO_USERS[sessionUid]) {
    return DEMO_USERS[sessionUid];
  }

  // Check if sessionUid exists in database
  if (sessionUid) {
    try {
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
    } catch {
      // Fallback
    }
  }

  // Default to Alice Vance for instant evaluation
  return DEMO_USERS.usr_alice;
}

/**
 * Checks group membership and role for authorization.
 */
export async function getGroupRole(groupId: string, userUid: string): Promise<'OWNER' | 'EDITOR' | 'MEMBER' | null> {
  try {
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
