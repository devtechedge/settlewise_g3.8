import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsvText,
  sanitizeCsvCell,
  normalizeImportRows,
  generateRowFingerprint,
} from '../domain/importer/csv.ts';

test('CSV: parses multiline quoted fields and escaped quotes', () => {
  const csv = `Date,Description,Amount,Payer
2026-10-01,"Dinner at
the corner bistro",42.50,Alice
2026-10-02,"He said ""hi"" then left",12.00,Bob
`;
  const parsed = parseCsvText(csv);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].Description, 'Dinner at\nthe corner bistro');
  assert.equal(parsed.rows[1].Description, 'He said "hi" then left');
});

test('CSV: formula-injection sanitization covers all triggers', () => {
  assert.equal(sanitizeCsvCell('=SUM(A1:A10)'), '"\'=SUM(A1:A10)"');
  assert.equal(sanitizeCsvCell('+12345'), '"\'+12345"');
  assert.equal(sanitizeCsvCell('@evil'), '"\'@evil"');
  const tabTrigger = '\t=SUM(A1)';
  const crTrigger = '\r=SUM(A1)';
  assert.equal(sanitizeCsvCell(tabTrigger), `"'${tabTrigger}"`);
  assert.equal(sanitizeCsvCell(crTrigger), `"'${crTrigger}"`);
  assert.equal(sanitizeCsvCell('plain text'), 'plain text');
  assert.equal(sanitizeCsvCell('has, comma'), '"has, comma"');
  assert.equal(sanitizeCsvCell('has "quote"'), '"has ""quote"""');
});

test('CSV: duplicate fingerprints detected across batches', () => {
  const fingerprint1 = generateRowFingerprint('grp_1', '2026-10-01', 'Coffee', 500n, 'Alice');
  const fingerprint2 = generateRowFingerprint('grp_1', '2026-10-01', 'Coffee', 500n, 'Alice');
  assert.equal(fingerprint1, fingerprint2);

  const rows = [
    { Date: '2026-10-01', Description: 'Coffee', Amount: '5.00', Payer: 'Alice' },
    { Date: '2026-10-01', Description: 'Coffee', Amount: '5.00', Payer: 'Alice' },
  ];
  const normalized = normalizeImportRows({
    groupId: 'grp_1',
    currencyCode: 'USD',
    rows,
    mapping: { dateColumn: 'Date', descriptionColumn: 'Description', amountColumn: 'Amount', payerColumn: 'Payer' },
    existingFingerprints: new Set([fingerprint1]),
  });
  assert.equal(normalized[0].status, 'DUPLICATE');
  assert.equal(normalized[1].status, 'DUPLICATE');
});

test('CSV: US date format normalizes to ISO', () => {
  const rows = [{ Date: '10/25/2026', Description: 'Groceries', Amount: '30.00', Payer: 'Bob' }];
  const normalized = normalizeImportRows({
    groupId: 'grp_2',
    currencyCode: 'USD',
    rows,
    mapping: { dateColumn: 'Date', descriptionColumn: 'Description', amountColumn: 'Amount', payerColumn: 'Payer' },
    existingFingerprints: new Set(),
  });
  assert.equal(normalized[0].normalizedDate, '2026-10-25');
  assert.equal(normalized[0].normalizedAmountMinorUnits, 3000n);
});

test('CSV: invalid amounts produce ERROR rows, never crash', () => {
  const rows = [{ Date: '2026-10-01', Description: 'Bad', Amount: 'abc', Payer: 'Alice' }];
  const normalized = normalizeImportRows({
    groupId: 'grp_3',
    currencyCode: 'USD',
    rows,
    mapping: { dateColumn: 'Date', descriptionColumn: 'Description', amountColumn: 'Amount', payerColumn: 'Payer' },
    existingFingerprints: new Set(),
  });
  assert.equal(normalized[0].status, 'ERROR');
  assert.ok(normalized[0].errorMessage);
});
