import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { commitImportBatch } from '@/services/importService.ts';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const user = await getSessionUser();
    const role = await getGroupRole(groupId, user.uid);
    if (!role || (role !== 'OWNER' && role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Only owners or editors can commit imports' }, { status: 403 });
    }

    const body = await req.json();
    const { batchId, duplicatePolicy } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const result = await commitImportBatch({
      batchId,
      groupId,
      duplicatePolicy: duplicatePolicy || 'SKIP',
      actorUid: user.uid,
      actorName: user.displayName,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
