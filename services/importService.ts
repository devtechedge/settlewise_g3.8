import { db } from '../src/db/index.ts';
import {
  importBatches,
  importRows,
  expenses,
  expenseSplits,
  participants,
  groups,
  auditEvents,
} from '../src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import {
  parseCsvText,
  normalizeImportRows,
  CsvColumnMapping,
  generateRowFingerprint,
} from '../domain/importer/csv.ts';
import { calculateEqualSplit } from '../domain/money/allocations.ts';

export async function createImportPreview(params: {
  groupId: string;
  fileName: string;
  csvContent: string;
  mapping: CsvColumnMapping;
  creatorUid: string;
}) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, params.groupId),
  });

  if (!group) throw new Error('Group not found.');

  const checksum = crypto.createHash('sha256').update(params.csvContent).digest('hex');
  const parsed = parseCsvText(params.csvContent);

  // Fetch existing fingerprints from past committed imports and expenses
  const existingRows = await db
    .select({ fingerprint: importRows.fingerprint })
    .from(importRows)
    .innerJoin(importBatches, eq(importRows.batchId, importBatches.id))
    .where(eq(importBatches.groupId, params.groupId));

  const existingFingerprints = new Set(existingRows.map((r) => r.fingerprint));

  const normalized = normalizeImportRows({
    groupId: params.groupId,
    currencyCode: group.canonicalCurrency,
    rows: parsed.rows,
    mapping: params.mapping,
    existingFingerprints,
  });

  const batchId = `imp_${crypto.randomUUID().slice(0, 12)}`;

  let validCount = 0;
  let dupCount = 0;
  let errorCount = 0;

  for (const r of normalized) {
    if (r.status === 'VALID') validCount++;
    else if (r.status === 'DUPLICATE') dupCount++;
    else if (r.status === 'ERROR') errorCount++;
  }

  await db.insert(importBatches).values({
    id: batchId,
    groupId: params.groupId,
    fileName: params.fileName,
    checksum,
    columnMapping: JSON.stringify(params.mapping),
    status: 'PREVIEW',
    duplicatePolicy: 'SKIP',
    totalRows: normalized.length,
    validRows: validCount,
    duplicateRows: dupCount,
    errorRows: errorCount,
    creatorUid: params.creatorUid,
  });

  for (const r of normalized) {
    await db.insert(importRows).values({
      batchId,
      rowIndex: r.index,
      sourceRowJson: JSON.stringify(r.raw),
      normalizedDate: r.normalizedDate || null,
      normalizedDescription: r.normalizedDescription || null,
      normalizedAmountMinorUnits: r.normalizedAmountMinorUnits || null,
      normalizedPayerName: r.normalizedPayerName || null,
      fingerprint: r.fingerprint,
      status: r.status,
      errorMessage: r.errorMessage || null,
    });
  }

  return {
    batchId,
    totalRows: normalized.length,
    validRows: validCount,
    duplicateRows: dupCount,
    errorRows: errorCount,
    rows: normalized,
  };
}

export async function commitImportBatch(params: {
  batchId: string;
  groupId: string;
  duplicatePolicy: 'SKIP' | 'IMPORT_ALL';
  actorUid: string;
  actorName: string;
}) {
  const batch = await db.query.importBatches.findFirst({
    where: and(eq(importBatches.id, params.batchId), eq(importBatches.groupId, params.groupId)),
  });

  if (!batch) throw new Error('Import batch not found.');
  if (batch.status === 'COMMITTED') throw new Error('Batch has already been committed.');

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, params.groupId),
  });
  if (!group) throw new Error('Group not found.');

  const groupParticipants = await db
    .select()
    .from(participants)
    .where(and(eq(participants.groupId, params.groupId), eq(participants.isArchived, false)));

  if (groupParticipants.length === 0) {
    throw new Error('Group must have at least one participant to import expenses.');
  }

  const allParticipantIds = groupParticipants.map((p) => p.id);
  const participantByName = new Map(
    groupParticipants.map((p) => [p.name.trim().toLowerCase(), p.id])
  );
  const defaultPayerId = groupParticipants[0].id;

  const rows = await db
    .select()
    .from(importRows)
    .where(eq(importRows.batchId, params.batchId));

  let committedCount = 0;

  for (const row of rows) {
    if (row.status === 'ERROR') continue;
    if (row.status === 'DUPLICATE' && params.duplicatePolicy === 'SKIP') continue;
    if (!row.normalizedAmountMinorUnits || !row.normalizedDate || !row.normalizedDescription) continue;

    // Match payer
    let payerId = defaultPayerId;
    if (row.normalizedPayerName) {
      const match = participantByName.get(row.normalizedPayerName.trim().toLowerCase());
      if (match) {
        payerId = match;
      }
    }

    const expenseId = `exp_${crypto.randomUUID().slice(0, 12)}`;

    // Create expense
    await db.insert(expenses).values({
      id: expenseId,
      groupId: params.groupId,
      description: row.normalizedDescription,
      category: 'Imported',
      occurrenceDate: row.normalizedDate,
      payerParticipantId: payerId,
      currency: group.canonicalCurrency,
      amountMinorUnits: row.normalizedAmountMinorUnits,
      notes: `Imported from CSV batch: ${batch.fileName}`,
      creatorUid: params.actorUid,
      revision: 1,
      status: 'ACTIVE',
    });

    // Default to equal split among all group participants
    const splits = calculateEqualSplit(row.normalizedAmountMinorUnits, allParticipantIds);
    for (const s of splits) {
      await db.insert(expenseSplits).values({
        expenseId,
        participantId: s.participantId,
        allocationMethod: 'EQUAL',
        allocatedMinorUnits: s.allocatedMinorUnits,
      });
    }

    await db
      .update(importRows)
      .set({
        status: 'COMMITTED',
        committedExpenseId: expenseId,
      })
      .where(eq(importRows.id, row.id));

    committedCount++;
  }

  await db
    .update(importBatches)
    .set({
      status: 'COMMITTED',
      duplicatePolicy: params.duplicatePolicy,
    })
    .where(eq(importBatches.id, params.batchId));

  await db.insert(auditEvents).values({
    groupId: params.groupId,
    actorUid: params.actorUid,
    actorName: params.actorName,
    action: 'CSV_IMPORTED',
    targetId: params.batchId,
    targetType: 'import',
    reason: `Committed ${committedCount} expense records from ${batch.fileName}`,
  });

  return { committedCount };
}
