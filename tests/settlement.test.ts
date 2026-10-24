import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGroupBalances } from '../domain/settlement/balances.ts';
import { generateSettlementPlan } from '../domain/settlement/planner.ts';
import { getCurrency, SUPPORTED_CURRENCY_CODES } from '../domain/money/currency.ts';

test('Currency registry: supports all five currencies with exact scales', () => {
  assert.equal(SUPPORTED_CURRENCY_CODES.length, 5);
  assert.equal(getCurrency('USD').decimals, 2);
  assert.equal(getCurrency('JPY').decimals, 0);
  assert.equal(getCurrency('INR').symbol, '₹');
  assert.equal(getCurrency('gbp').code, 'GBP');
  assert.throws(() => getCurrency('BTC'), /Unsupported currency code/);
});

test('Balances: zero-sum invariant holds for a multi-participant ledger', () => {
  const ids = ['pA', 'pB', 'pC', 'pD'];
  const expenses = [
    {
      id: 'e1',
      payerParticipantId: 'pA',
      amountMinorUnits: 10000n,
      status: 'ACTIVE',
      splits: [
        { participantId: 'pA', allocatedMinorUnits: 2500n },
        { participantId: 'pB', allocatedMinorUnits: 2500n },
        { participantId: 'pC', allocatedMinorUnits: 2500n },
        { participantId: 'pD', allocatedMinorUnits: 2500n },
      ],
    },
    {
      id: 'e2',
      payerParticipantId: 'pB',
      amountMinorUnits: 4000n,
      status: 'ACTIVE',
      splits: [
        { participantId: 'pB', allocatedMinorUnits: 2000n },
        { participantId: 'pC', allocatedMinorUnits: 2000n },
      ],
    },
  ];
  const balances = computeGroupBalances(ids, expenses, []);
  const sum = Array.from(balances.values()).reduce((acc, b) => acc + b.netBalance, 0n);
  assert.equal(sum, 0n);
});

test('Balances: voided expenses are excluded from net balances', () => {
  const ids = ['pA', 'pB'];
  const expenses = [
    {
      id: 'e1',
      payerParticipantId: 'pA',
      amountMinorUnits: 5000n,
      status: 'VOIDED',
      splits: [
        { participantId: 'pA', allocatedMinorUnits: 2500n },
        { participantId: 'pB', allocatedMinorUnits: 2500n },
      ],
    },
  ];
  const balances = computeGroupBalances(ids, expenses, []);
  assert.equal(balances.get('pA')?.netBalance, 0n);
  assert.equal(balances.get('pB')?.netBalance, 0n);
});

test('Settlement: greedy planner proposes minimal transfers with deterministic tie-breaks', () => {
  // Alice paid 9000, split 3 ways; Bob paid 3000, split between Bob and Charlie.
  const ids = ['pA', 'pB', 'pC'];
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
  const balances = computeGroupBalances(ids, expenses, []);
  const plan = generateSettlementPlan(balances);
  assert.equal(plan.transfers.length, 2);
  assert.equal(plan.totalSettlementValueMinorUnits, 6000n);
  // Largest debtor pays first, ties broken by participant id.
  assert.equal(plan.transfers[0].senderParticipantId, 'pC');
  assert.equal(plan.transfers[0].recipientParticipantId, 'pA');
  assert.equal(plan.transfers[0].amountMinorUnits, 4500n);
  assert.equal(plan.transfers[1].senderParticipantId, 'pB');
  assert.equal(plan.transfers[1].amountMinorUnits, 1500n);
});

test('Settlement: reversed payments restore original balances', () => {
  const ids = ['pA', 'pB'];
  const expenses = [
    {
      id: 'e1',
      payerParticipantId: 'pA',
      amountMinorUnits: 2000n,
      status: 'ACTIVE',
      splits: [
        { participantId: 'pA', allocatedMinorUnits: 1000n },
        { participantId: 'pB', allocatedMinorUnits: 1000n },
      ],
    },
  ];
  const payments = [
    {
      id: 'pmt1',
      senderParticipantId: 'pB',
      recipientParticipantId: 'pA',
      amountMinorUnits: 500n,
      status: 'REVERSED',
    },
  ];
  const balances = computeGroupBalances(ids, expenses, payments);
  assert.equal(balances.get('pA')?.netBalance, 1000n);
  assert.equal(balances.get('pB')?.netBalance, -1000n);
});

test('Settlement: fully settled group produces an empty plan', () => {
  const ids = ['pA', 'pB'];
  const balances = computeGroupBalances(ids, [], []);
  const plan = generateSettlementPlan(balances);
  assert.equal(plan.isFullySettled, true);
  assert.equal(plan.transfers.length, 0);
});
