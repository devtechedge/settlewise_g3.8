import { db } from '../src/db/index.ts';
import {
  users,
  groups,
  memberships,
  participants,
  expenses,
  expenseSplits,
  expenseRevisions,
  settlementPayments,
  auditEvents,
} from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { DEMO_USERS } from '../lib/auth.ts';

export async function ensureSeedData() {
  try {
    // Check if groups already exist
    const existingGroups = await db.select({ id: groups.id }).from(groups).limit(1);
    if (existingGroups.length > 0) {
      return { seeded: false, message: 'Database already seeded' };
    }

    console.log('Seeding initial production-grade demo data into PostgreSQL...');

    // 1. Seed Users
    for (const u of Object.values(DEMO_USERS)) {
      await db
        .insert(users)
        .values({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoUrl: u.photoUrl,
        })
        .onConflictDoNothing();
    }

    // Add Diana
    await db
      .insert(users)
      .values({
        uid: 'usr_diana',
        email: 'diana@settlewise.internal',
        displayName: 'Diana Ross',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      })
      .onConflictDoNothing();

    // 2. Seed Group 1: Pine Street Flat (Household, USD)
    const grpHouse = 'grp_pine_street';
    await db.insert(groups).values({
      id: grpHouse,
      name: 'Pine Street Flat',
      description: 'Shared household expenses for apartment 4B, Pine Street',
      ownerUid: 'usr_alice',
      canonicalCurrency: 'USD',
      currencyPrecision: 2,
      budgetMinorUnits: 300000n, // $3,000.00 monthly budget
      budgetPeriod: 'monthly',
      status: 'active',
    });

    // Memberships for Group 1
    await db.insert(memberships).values([
      { groupId: grpHouse, userUid: 'usr_alice', role: 'OWNER', status: 'ACTIVE' },
      { groupId: grpHouse, userUid: 'usr_bob', role: 'EDITOR', status: 'ACTIVE' },
      { groupId: grpHouse, userUid: 'usr_charlie', role: 'MEMBER', status: 'ACTIVE' },
    ]);

    // Participants for Group 1
    const partAlice = 'part_ps_alice';
    const partBob = 'part_ps_bob';
    const partCharlie = 'part_ps_charlie';

    await db.insert(participants).values([
      {
        id: partAlice,
        groupId: grpHouse,
        name: 'Alice Vance',
        email: 'alice@settlewise.internal',
        linkedUserUid: 'usr_alice',
        color: '#2a5c4d', // Forest
      },
      {
        id: partBob,
        groupId: grpHouse,
        name: 'Bob Chen',
        email: 'bob@settlewise.internal',
        linkedUserUid: 'usr_bob',
        color: '#c85a32', // Terracotta
      },
      {
        id: partCharlie,
        groupId: grpHouse,
        name: 'Charlie Miller',
        email: 'charlie@settlewise.internal',
        linkedUserUid: 'usr_charlie',
        color: '#3d6380', // Mineral blue
      },
    ]);

    // Expenses for Pine Street Flat:
    // Expense 1: October Rent - $1,500.00 paid by Alice, split equally
    const exp1 = 'exp_ps_rent';
    await db.insert(expenses).values({
      id: exp1,
      groupId: grpHouse,
      description: 'October Apartment Rent',
      category: 'Rent & Utilities',
      occurrenceDate: '2026-10-01',
      payerParticipantId: partAlice,
      currency: 'USD',
      amountMinorUnits: 150000n, // $1500.00
      notes: 'Paid wire transfer to landlord',
      creatorUid: 'usr_alice',
      revision: 1,
    });
    await db.insert(expenseSplits).values([
      { expenseId: exp1, participantId: partAlice, allocationMethod: 'EQUAL', allocatedMinorUnits: 50000n },
      { expenseId: exp1, participantId: partBob, allocationMethod: 'EQUAL', allocatedMinorUnits: 50000n },
      { expenseId: exp1, participantId: partCharlie, allocationMethod: 'EQUAL', allocatedMinorUnits: 50000n },
    ]);

    // Expense 2: Fiber Internet & Streaming - $180.00 paid by Bob, percentage split (Alice: 40%, Bob: 30%, Charlie: 30%)
    const exp2 = 'exp_ps_internet';
    await db.insert(expenses).values({
      id: exp2,
      groupId: grpHouse,
      description: 'Gigabit Fiber Internet & Streaming bundle',
      category: 'Rent & Utilities',
      occurrenceDate: '2026-10-05',
      payerParticipantId: partBob,
      currency: 'USD',
      amountMinorUnits: 18000n, // $180.00
      notes: 'Monthly autopay',
      creatorUid: 'usr_bob',
      revision: 1,
    });
    await db.insert(expenseSplits).values([
      { expenseId: exp2, participantId: partAlice, allocationMethod: 'PERCENTAGE', allocatedMinorUnits: 7200n, basisPoints: 4000 },
      { expenseId: exp2, participantId: partBob, allocationMethod: 'PERCENTAGE', allocatedMinorUnits: 5400n, basisPoints: 3000 },
      { expenseId: exp2, participantId: partCharlie, allocationMethod: 'PERCENTAGE', allocatedMinorUnits: 5400n, basisPoints: 3000 },
    ]);

    // Expense 3: Weekly Organic Groceries - originally $120.00, edited to $138.50 by Alice with revision history!
    const exp3 = 'exp_ps_groceries';
    await db.insert(expenses).values({
      id: exp3,
      groupId: grpHouse,
      description: 'Weekly Organic Groceries & Pantry Restock',
      category: 'Groceries',
      occurrenceDate: '2026-10-12',
      payerParticipantId: partAlice,
      currency: 'USD',
      amountMinorUnits: 13850n, // $138.50
      notes: 'Trader Joes run - receipt adjusted for olive oil and laundry powder',
      creatorUid: 'usr_alice',
      revision: 2,
    });
    // Shares split: Alice 2 shares, Bob 1 share, Charlie 1 share (total 4 shares)
    // 13850 * 2 / 4 = 6925n (Alice), 3462n (Bob), 3463n (Charlie gets 1 cent remainder)
    await db.insert(expenseSplits).values([
      { expenseId: exp3, participantId: partAlice, allocationMethod: 'SHARES', allocatedMinorUnits: 6925n, shareWeight: 2 },
      { expenseId: exp3, participantId: partBob, allocationMethod: 'SHARES', allocatedMinorUnits: 3462n, shareWeight: 1 },
      { expenseId: exp3, participantId: partCharlie, allocationMethod: 'SHARES', allocatedMinorUnits: 3463n, shareWeight: 1 },
    ]);

    // Revision entry for exp3:
    await db.insert(expenseRevisions).values({
      expenseId: exp3,
      revisionNumber: 1,
      beforeSnapshot: JSON.stringify({
        amountMinorUnits: '12000',
        description: 'Weekly Organic Groceries',
        splits: [
          { participantId: partAlice, allocatedMinorUnits: '6000', shareWeight: 2 },
          { participantId: partBob, allocatedMinorUnits: '3000', shareWeight: 1 },
          { participantId: partCharlie, allocatedMinorUnits: '3000', shareWeight: 1 },
        ],
      }),
      afterSnapshot: JSON.stringify({
        amountMinorUnits: '13850',
        description: 'Weekly Organic Groceries & Pantry Restock',
        splits: [
          { participantId: partAlice, allocatedMinorUnits: '6925', shareWeight: 2 },
          { participantId: partBob, allocatedMinorUnits: '3462', shareWeight: 1 },
          { participantId: partCharlie, allocatedMinorUnits: '3463', shareWeight: 1 },
        ],
      }),
      reason: 'Added missing pantry olive oil and cleaning detergent from secondary receipt',
      actorUid: 'usr_alice',
    });

    // Expense 4: Voided expense (Duplicate Electric Bill)
    const exp4 = 'exp_ps_electric_dup';
    await db.insert(expenses).values({
      id: exp4,
      groupId: grpHouse,
      description: 'Electric Bill - ConEd (Duplicate entry)',
      category: 'Rent & Utilities',
      occurrenceDate: '2026-10-15',
      payerParticipantId: partCharlie,
      currency: 'USD',
      amountMinorUnits: 8500n, // $85.00
      status: 'VOIDED',
      voidReason: 'Accidentally entered twice; landlord bill already covered under master utilities',
      voidedByUid: 'usr_alice',
      creatorUid: 'usr_charlie',
      revision: 2,
    });
    await db.insert(expenseSplits).values([
      { expenseId: exp4, participantId: partAlice, allocationMethod: 'EQUAL', allocatedMinorUnits: 2834n },
      { expenseId: exp4, participantId: partBob, allocationMethod: 'EQUAL', allocatedMinorUnits: 2833n },
      { expenseId: exp4, participantId: partCharlie, allocationMethod: 'EQUAL', allocatedMinorUnits: 2833n },
    ]);

    // Partial reimbursement: Charlie paid Alice $200.00 to reduce rent obligation
    await db.insert(settlementPayments).values({
      id: 'pmt_ps_1',
      groupId: grpHouse,
      senderParticipantId: partCharlie,
      recipientParticipantId: partAlice,
      amountMinorUnits: 20000n, // $200.00
      recordedDate: '2026-10-16',
      status: 'CONFIRMED',
      notes: 'Zelle transfer - partial rent contribution for October',
      idempotencyKey: 'zelle_ps_charlie_alice_20261016',
      creatorUid: 'usr_charlie',
    });

    // Reversed reimbursement: Bob paid Alice $50.00, then reversed due to error
    await db.insert(settlementPayments).values({
      id: 'pmt_ps_2',
      groupId: grpHouse,
      senderParticipantId: partBob,
      recipientParticipantId: partAlice,
      amountMinorUnits: 5000n, // $50.00
      recordedDate: '2026-10-17',
      status: 'REVERSED',
      notes: 'Test cash reimbursement',
      idempotencyKey: 'cash_ps_bob_alice_20261017',
      creatorUid: 'usr_bob',
      reversalReason: 'Sent to wrong account handle; re-settling via direct bank transfer',
      reversedAt: new Date('2026-10-17T14:30:00Z'),
    });

    // Seed Audit Events for Group 1
    await db.insert(auditEvents).values([
      {
        groupId: grpHouse,
        actorUid: 'usr_alice',
        actorName: 'Alice Vance',
        action: 'GROUP_CREATED',
        targetId: grpHouse,
        targetType: 'group',
        reason: 'Initial setup of Pine Street Flat ledger',
      },
      {
        groupId: grpHouse,
        actorUid: 'usr_alice',
        actorName: 'Alice Vance',
        action: 'EXPENSE_CREATED',
        targetId: exp1,
        targetType: 'expense',
        reason: 'Recorded October Apartment Rent ($1,500.00)',
      },
      {
        groupId: grpHouse,
        actorUid: 'usr_alice',
        actorName: 'Alice Vance',
        action: 'EXPENSE_EDITED',
        targetId: exp3,
        targetType: 'expense',
        reason: 'Updated Weekly Organic Groceries to $138.50 (Added missing pantry items)',
      },
      {
        groupId: grpHouse,
        actorUid: 'usr_alice',
        actorName: 'Alice Vance',
        action: 'EXPENSE_VOIDED',
        targetId: exp4,
        targetType: 'expense',
        reason: 'Voided duplicate electric bill entry',
      },
      {
        groupId: grpHouse,
        actorUid: 'usr_charlie',
        actorName: 'Charlie Miller',
        action: 'PAYMENT_RECORDED',
        targetId: 'pmt_ps_1',
        targetType: 'payment',
        reason: 'Recorded $200.00 reimbursement to Alice Vance',
      },
      {
        groupId: grpHouse,
        actorUid: 'usr_bob',
        actorName: 'Bob Chen',
        action: 'PAYMENT_REVERSED',
        targetId: 'pmt_ps_2',
        targetType: 'payment',
        reason: 'Reversed $50.00 payment: Sent to wrong account handle',
      },
    ]);

    // 3. Seed Group 2: Kyoto Autumn Trip 2026 (Travel, JPY)
    const grpKyoto = 'grp_kyoto_2026';
    await db.insert(groups).values({
      id: grpKyoto,
      name: 'Kyoto Autumn Trip 2026',
      description: 'Autumn foliage expedition with friends in Kyoto & Osaka',
      ownerUid: 'usr_alice',
      canonicalCurrency: 'JPY',
      currencyPrecision: 0,
      budgetMinorUnits: 350000n, // ¥350,000 budget
      budgetPeriod: 'total',
      status: 'active',
    });

    await db.insert(memberships).values([
      { groupId: grpKyoto, userUid: 'usr_alice', role: 'OWNER', status: 'ACTIVE' },
      { groupId: grpKyoto, userUid: 'usr_bob', role: 'EDITOR', status: 'ACTIVE' },
      { groupId: grpKyoto, userUid: 'usr_charlie', role: 'MEMBER', status: 'ACTIVE' },
      { groupId: grpKyoto, userUid: 'usr_diana', role: 'MEMBER', status: 'ACTIVE' },
    ]);

    const partKAlice = 'part_ky_alice';
    const partKBob = 'part_ky_bob';
    const partKCharlie = 'part_ky_charlie';
    const partKDiana = 'part_ky_diana';

    await db.insert(participants).values([
      { id: partKAlice, groupId: grpKyoto, name: 'Alice Vance', linkedUserUid: 'usr_alice', color: '#2a5c4d' },
      { id: partKBob, groupId: grpKyoto, name: 'Bob Chen', linkedUserUid: 'usr_bob', color: '#c85a32' },
      { id: partKCharlie, groupId: grpKyoto, name: 'Charlie Miller', linkedUserUid: 'usr_charlie', color: '#3d6380' },
      { id: partKDiana, groupId: grpKyoto, name: 'Diana Ross', linkedUserUid: 'usr_diana', color: '#88507c' },
    ]);

    // Kyoto Shinkansen - ¥56,000 paid by Bob, equal split
    const expK1 = 'exp_ky_shinkansen';
    await db.insert(expenses).values({
      id: expK1,
      groupId: grpKyoto,
      description: 'Tokyo to Kyoto Shinkansen bullet train tickets (4 pax)',
      category: 'Transport',
      occurrenceDate: '2026-10-18',
      payerParticipantId: partKBob,
      currency: 'JPY',
      amountMinorUnits: 56000n,
      notes: 'SmartEX app booking reserved car',
      creatorUid: 'usr_bob',
      revision: 1,
    });
    await db.insert(expenseSplits).values([
      { expenseId: expK1, participantId: partKAlice, allocationMethod: 'EQUAL', allocatedMinorUnits: 14000n },
      { expenseId: expK1, participantId: partKBob, allocationMethod: 'EQUAL', allocatedMinorUnits: 14000n },
      { expenseId: expK1, participantId: partKCharlie, allocationMethod: 'EQUAL', allocatedMinorUnits: 14000n },
      { expenseId: expK1, participantId: partKDiana, allocationMethod: 'EQUAL', allocatedMinorUnits: 14000n },
    ]);

    // Ryokan 2 Nights - ¥120,000 paid by Alice, equal split
    const expK2 = 'exp_ky_ryokan';
    await db.insert(expenses).values({
      id: expK2,
      groupId: grpKyoto,
      description: 'Gion Traditional Machiya Ryokan (2 Nights)',
      category: 'Rent & Utilities',
      occurrenceDate: '2026-10-20',
      payerParticipantId: partKAlice,
      currency: 'JPY',
      amountMinorUnits: 120000n,
      notes: 'Included Japanese breakfast and onsen bath passes',
      creatorUid: 'usr_alice',
      revision: 1,
    });
    await db.insert(expenseSplits).values([
      { expenseId: expK2, participantId: partKAlice, allocationMethod: 'EQUAL', allocatedMinorUnits: 30000n },
      { expenseId: expK2, participantId: partKBob, allocationMethod: 'EQUAL', allocatedMinorUnits: 30000n },
      { expenseId: expK2, participantId: partKCharlie, allocationMethod: 'EQUAL', allocatedMinorUnits: 30000n },
      { expenseId: expK2, participantId: partKDiana, allocationMethod: 'EQUAL', allocatedMinorUnits: 30000n },
    ]);

    console.log('Seeding completed successfully!');
    return { seeded: true, message: 'Database seeded with Household and Travel groups.' };
  } catch (err) {
    console.error('Error during seeding:', err);
    throw err;
  }
}
