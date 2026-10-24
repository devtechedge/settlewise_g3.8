import { db } from '../src/db/index.ts';
import { auditEvents } from '../src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getGroupAuditEvents(groupId: string, limit = 100) {
  return await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.groupId, groupId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}
