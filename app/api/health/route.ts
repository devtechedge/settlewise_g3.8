import { NextResponse } from 'next/server';
import { db, isDemoMode, awaitSeed } from '@/src/db/index.ts';
import { sql } from 'drizzle-orm';

// Health state is runtime-specific, never prerendered.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await awaitSeed();
    const result = await db.execute(sql`SELECT 1 as alive;`);
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      mode: isDemoMode() ? 'demo' : 'postgres',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: err.message },
      { status: 500 }
    );
  }
}
