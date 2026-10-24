import { NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT 1 as alive;`);
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: err.message },
      { status: 500 }
    );
  }
}
