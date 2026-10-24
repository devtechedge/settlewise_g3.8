import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExactToMinorUnits, formatMinorUnitsToDecimal, formatMoney } from '../domain/money/decimal.ts';
import {
  calculateEqualSplit,
  validateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  resolveAllocations,
} from '../domain/money/allocations.ts';
import { computeGroupBalances } from '../domain/settlement/balances.ts';
import { generateSettlementPlan } from '../domain/settlement/planner.ts';

test('Money parsing: parses decimal strings into integer minor units without float error', () => {
  assert.equal(parseExactToMinorUnits('12.34', 'USD'), 1234n);
  assert.equal(parseExactToMinorUnits('100', 'USD'), 10000n);
  assert.equal(parseExactToMinorUnits('0.05', 'USD'), 5n);
  assert.equal(parseExactToMinorUnits('0', 'USD'), 0n);
  assert.equal(parseExactToMinorUnits('-50.25', 'USD'), -5025n);
  assert.equal(parseExactToMinorUnits('2500', 'JPY'), 2500n);
});

test('Money parsing: rejects invalid decimal formats and excessive decimals', () => {
  assert.throws(() => parseExactToMinorUnits('12.345', 'USD'), /allows 2/);
  assert.throws(() => parseExactToMinorUnits('12.5', 'JPY'), /allows 0/);
  assert.throws(() => parseExactToMinorUnits('abc', 'USD'), /Invalid monetary amount/);
  assert.throws(() => parseExactToMinorUnits('12.3.4', 'USD'), /Invalid monetary amount/);
  assert.throws(() => parseExactToMinorUnits('', 'USD'), /cannot be empty/);
});

test('Money formatting: formats bigint minor units to decimal strings and displays', () => {
  assert.equal(formatMinorUnitsToDecimal(1234n, 'USD'), '12.34');
  assert.equal(formatMinorUnitsToDecimal(5n, 'USD'), '0.05');
  assert.equal(formatMinorUnitsToDecimal(0n, 'USD'), '0.00');
  assert.equal(formatMinorUnitsToDecimal(-5025n, 'USD'), '-50.25');
  assert.equal(formatMinorUnitsToDecimal(2500n, 'JPY'), '2500');

  assert.equal(formatMoney(1234n, 'USD'), '$12.34');
  assert.equal(formatMoney(-500n, 'USD'), '-$5.00');
  assert.equal(formatMoney(2500n, 'USD', { showPlusSign: true }), '+$25.00');
  assert.equal(formatMoney(150000n, 'INR'), '₹1500.00');
});

test('Allocations: Equal split divides uneven amounts with largest remainder rule', () => {
  // $10.00 (1000 cents) among 3 participants -> 334, 333, 333
  const splits = calculateEqualSplit(1000n, ['pA', 'pB', 'pC']);
  assert.equal(splits.length, 3);
  const total = splits.reduce((acc, s) => acc + s.allocatedMinorUnits, 0n);
  assert.equal(total, 1000n);

  assert.equal(splits[0].participantId, 'pA');
  assert.equal(splits[0].allocatedMinorUnits, 334n); // gets the 1 cent remainder
  assert.equal(splits[1].allocatedMinorUnits, 333n);
  assert.equal(splits[2].allocatedMinorUnits, 333n);
});

test('Allocations: Exact split validates sum and rejects mismatches', () => {
  const valid = validateExactSplit(1000n, [
    { participantId: 'pA', amountMinorUnits: 400n },
    { participantId: 'pB', amountMinorUnits: 600n },
  ]);
  assert.equal(valid.reduce((acc, s) => acc + s.allocatedMinorUnits, 0n), 1000n);

  // Mismatch
  assert.throws(() => {
    validateExactSplit(1000n, [
      { participantId: 'pA', amountMinorUnits: 400n },
      { participantId: 'pB', amountMinorUnits: 500n },
    ]);
  }, /allocations sum to 900 minor units/);

  // Negative amount rejected
  assert.throws(() => {
    validateExactSplit(1000n, [
      { participantId: 'pA', amountMinorUnits: -100n },
      { participantId: 'pB', amountMinorUnits: 1100n },
    ]);
  }, /cannot be negative/);
});

test('Allocations: Percentage split enforces 10000 bps and largest remainder', () => {
  // 33.33%, 33.33%, 33.34% -> 3333 + 3333 + 3334 = 10000 bps
  // Total: $100.00 (10000 cents)
  const splits = calculatePercentageSplit(10000n, [
    { participantId: 'pA', basisPoints: 3333 },
    { participantId: 'pB', basisPoints: 3333 },
    { participantId: 'pC', basisPoints: 3334 },
  ]);
  const total = splits.reduce((acc, s) => acc + s.allocatedMinorUnits, 0n);
  assert.equal(total, 10000n);

  // Rejects invalid bps sum
  assert.throws(() => {
    calculatePercentageSplit(10000n, [
      { participantId: 'pA', basisPoints: 5000 },
      { participantId: 'pB', basisPoints: 4000 },
    ]);
  }, /must sum exactly to 10,000/);
});

test('Allocations: Shares split with uneven weights', () => {
  // Total 1000 cents, weights: pA: 1, pB: 2 -> total weights = 3
  // 1000 * 1 / 3 = 333 rem 1
  // 1000 * 2 / 3 = 666 rem 2
  // pB gets remainder 2, gets +1 -> 667; pA gets 333; total 1000
  const splits = calculateSharesSplit(1000n, [
    { participantId: 'pA', weight: 1 },
    { participantId: 'pB', weight: 2 },
  ]);
  const total = splits.reduce((acc, s) => acc + s.allocatedMinorUnits, 0n);
  assert.equal(total, 1000n);
  assert.equal(splits.find((s) => s.participantId === 'pA')?.allocatedMinorUnits, 333n);
  assert.equal(splits.find((s) => s.participantId === 'pB')?.allocatedMinorUnits, 667n);
});

test('Balances and Settlement: zero-sum balance and greedy transfer consolidation', () => {
  // 3 participants: Alice (pA), Bob (pB), Charlie (pC)
  // Alice pays $90 (9000 cents) for dinner, split equally ($30 each)
  // Bob pays $30 (3000 cents) for taxi, split equally between Bob & Charlie ($15 each)
  const participantIds = ['pA', 'pB', 'pC'];

  const expenses = [
    {
      id: 'e1',
      payerParticipantId: 'pA',
      amountMinorUnits: 9000n,
      status: 'ACTIVE',
      splits: [
        { participantId: 'pA', allocatedMinorUnits: 3000n },
        { participantId: 'pB', allocatedMinorUnits: 3000n },
        { participantId: 'pC', allocatedMinorUnits: 3000n },
      ],
    },
    {
      id: 'e2',
      payerParticipantId: 'pB',
      amountMinorUnits: 3000n,
      status: 'ACTIVE',
      splits: [
        { participantId: 'pB', allocatedMinorUnits: 1500n },
        { participantId: 'pC', allocatedMinorUnits: 1500n },
      ],
    },
  ];

  // Effective net calculations:
  // Alice: paid 9000 - allocated 3000 = +6000 (creditor, is owed $60)
  // Bob: paid 3000 - allocated (3000 + 1500 = 4500) = -1500 (debtor, owes $15)
  // Charlie: paid 0 - allocated (3000 + 1500 = 4500) = -4500 (debtor, owes $45)
  // Total balance sum: +6000 - 1500 - 4500 = 0n.

  const balances = computeGroupBalances(participantIds, expenses, []);
  assert.equal(balances.get('pA')?.netBalance, 6000n);
  assert.equal(balances.get('pB')?.netBalance, -1500n);
  assert.equal(balances.get('pC')?.netBalance, -4500n);

  const plan = generateSettlementPlan(balances);
  assert.equal(plan.transfers.length, 2);
  assert.equal(plan.totalSettlementValueMinorUnits, 6000n);

  // Charlie pays Alice 4500 (largest debtor matched first)
  assert.equal(plan.transfers[0].senderParticipantId, 'pC');
  assert.equal(plan.transfers[0].recipientParticipantId, 'pA');
  assert.equal(plan.transfers[0].amountMinorUnits, 4500n);

  // Bob pays Alice 1500
  assert.equal(plan.transfers[1].senderParticipantId, 'pB');
  assert.equal(plan.transfers[1].recipientParticipantId, 'pA');
  assert.equal(plan.transfers[1].amountMinorUnits, 1500n);

  // Now, suppose Charlie reimburses Alice $20 (2000 cents)
  const payments = [
    {
      id: 'pmt1',
      senderParticipantId: 'pC',
      recipientParticipantId: 'pA',
      amountMinorUnits: 2000n,
      status: 'CONFIRMED',
    },
  ];

  const updatedBalances = computeGroupBalances(participantIds, expenses, payments);
  // Alice: +6000 - 2000 = +4000
  // Charlie: -4500 + 2000 = -2500
  // Bob: -1500
  assert.equal(updatedBalances.get('pA')?.netBalance, 4000n);
  assert.equal(updatedBalances.get('pB')?.netBalance, -1500n);
  assert.equal(updatedBalances.get('pC')?.netBalance, -2500n);

  // Now if payment is reversed with status 'REVERSED', balance restored to original!
  const reversedPayments = [
    {
      id: 'pmt1',
      senderParticipantId: 'pC',
      recipientParticipantId: 'pA',
      amountMinorUnits: 2000n,
      status: 'REVERSED',
    },
  ];
  const restoredBalances = computeGroupBalances(participantIds, expenses, reversedPayments);
  assert.equal(restoredBalances.get('pA')?.netBalance, 6000n);
  assert.equal(restoredBalances.get('pC')?.netBalance, -4500n);
});

test('CSV Import & Security: parse quoted CSV and sanitize formula injection', async () => {
  const { parseCsvText, sanitizeCsvCell, normalizeImportRows } = await import('../domain/importer/csv.ts');

  const csv = `Date,Description,Amount,Payer
2026-10-01,"Dinner, drinks and desserts",84.50,Alice
2026-10-02,Groceries,45.00,Bob
`;
  const parsed = parseCsvText(csv);
  assert.equal(parsed.headers.length, 4);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].Description, 'Dinner, drinks and desserts');

  // Formula injection prevention
  assert.equal(sanitizeCsvCell('=SUM(A1:A10)'), '"\'=SUM(A1:A10)"');
  assert.equal(sanitizeCsvCell('+12345'), '"\'+12345"');
  assert.equal(sanitizeCsvCell('@evil'), '"\'@evil"');
  assert.equal(sanitizeCsvCell('Normal description'), 'Normal description');

  // Normalization & duplicate detection
  const normalized = normalizeImportRows({
    groupId: 'grp_1',
    currencyCode: 'USD',
    rows: parsed.rows,
    mapping: {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      payerColumn: 'Payer',
    },
    existingFingerprints: new Set(),
  });

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].status, 'VALID');
  assert.equal(normalized[0].normalizedAmountMinorUnits, 8450n);
});

