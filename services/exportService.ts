import { getGroupExpenses } from './expenseService.ts';
import { formatMinorUnitsToDecimal } from '../domain/money/decimal.ts';
import { sanitizeCsvCell } from '../domain/importer/csv.ts';
import { db } from '../src/db/index.ts';
import { groups, exportRecords } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export async function generateGroupExpensesCsv(groupId: string, userUid: string) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!group) throw new Error('Group not found.');

  const expensesList = await getGroupExpenses({ groupId });

  const headers = [
    'Expense ID',
    'Date',
    'Description',
    'Category',
    'Currency',
    'Amount',
    'Payer',
    'Status',
    'Revision',
    'Splits Summary',
    'Notes',
  ];

  const rows: string[] = [headers.join(',')];

  for (const exp of expensesList) {
    const formattedAmount = formatMinorUnitsToDecimal(exp.amountMinorUnits, group.canonicalCurrency);
    const splitsSummary = exp.splits
      .map((s) => `${s.participantName}: ${formatMinorUnitsToDecimal(s.allocatedMinorUnits, group.canonicalCurrency)}`)
      .join(' | ');

    const line = [
      sanitizeCsvCell(exp.id),
      sanitizeCsvCell(exp.occurrenceDate),
      sanitizeCsvCell(exp.description),
      sanitizeCsvCell(exp.category),
      sanitizeCsvCell(exp.currency),
      sanitizeCsvCell(formattedAmount),
      sanitizeCsvCell(exp.payerName),
      sanitizeCsvCell(exp.status),
      sanitizeCsvCell(exp.revision),
      sanitizeCsvCell(splitsSummary),
      sanitizeCsvCell(exp.notes || ''),
    ].join(',');

    rows.push(line);
  }

  const csvContent = rows.join('\r\n');
  const checksum = crypto.createHash('sha256').update(csvContent).digest('hex');

  // Record export
  await db.insert(exportRecords).values({
    groupId,
    exportFormat: 'CSV',
    checksum,
    creatorUid: userUid,
  });

  return { csvContent, fileName: `${group.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_expenses.csv` };
}
