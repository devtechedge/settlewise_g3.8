import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth.ts';
import { DEMO_USERS } from '@/lib/auth-types.ts';
import { db } from '@/src/db/index.ts';
import { users } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({
    user,
    availableDemoUsers: Object.values(DEMO_USERS),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, email, displayName, photoUrl } = body;

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    // Upsert user if needed
    if (email && displayName) {
      await db
        .insert(users)
        .values({
          uid,
          email,
          displayName,
          photoUrl: photoUrl || null,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            displayName,
            photoUrl: photoUrl || null,
          },
        });
    }

    const res = NextResponse.json({ success: true, uid });
    res.cookies.set('settlewise_uid', uid, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
