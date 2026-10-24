import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getGroupRole } from '@/lib/auth.ts';
import { createImportPreview } from '@/services/importService.ts';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const user = await getSessionUser();
    const role = await getGroupRole(groupId, user.uid);
    if (!role || (role !== 'OWNER' && role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Only owners or editors can import data' }, { status: 403 });
    }

    const body = await req.json();
    const { fileName, csvContent, mapping } = body;

    if (!csvContent?.trim()) {
      return NextResponse.json({ error: 'CSV content is empty' }, { status: 400 });
    }

    if (!mapping?.dateColumn || !mapping?.descriptionColumn || !mapping?.amountColumn) {
      return NextResponse.json({ error: 'Date, Description, and Amount columns must be mapped' }, { status: 400 });
    }

    const preview = await createImportPreview({
      groupId,
      fileName: fileName || 'statement.csv',
      csvContent,
      mapping,
      creatorUid: user.uid,
    });

    const serializedRows = preview.rows.map((r) => ({
      ...r,
      normalizedAmountMinorUnits: r.normalizedAmountMinorUnits ? r.normalizedAmountMinorUnits.toString() : null,
    }));

    return NextResponse.json({
      ...preview,
      rows: serializedRows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
