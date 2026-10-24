import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { generateGroupExpensesCsv } from '@/services/exportService.ts';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const user = await getSessionUser();
    const role = await getGroupRole(groupId, user.uid);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { csvContent, fileName } = await generateGroupExpensesCsv(groupId, user.uid);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
