import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  timestamp,
  bigint,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// 1. Users Table (keyed by Firebase Auth UID or internal unique UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  photoUrl: text('photo_url'),
  disabled: boolean('disabled').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Sessions (supports custom hashed sessions and token tracking)
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Groups Table
export const groups = pgTable('groups', {
  id: text('id').primaryKey(), // e.g. grp_xxxx
  name: text('name').notNull(),
  description: text('description'),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid),
  canonicalCurrency: text('canonical_currency').notNull().default('USD'),
  currencyPrecision: integer('currency_precision').notNull().default(2),
  budgetMinorUnits: bigint('budget_minor_units', { mode: 'bigint' }),
  budgetPeriod: text('budget_period').default('monthly'), // 'monthly', 'total'
  status: text('status').notNull().default('active'), // 'active', 'archived'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Memberships Table
export const memberships = pgTable(
  'memberships',
  {
    id: serial('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userUid: text('user_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    role: text('role').notNull().default('MEMBER'), // 'OWNER', 'EDITOR', 'MEMBER'
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'INVITED', 'REMOVED'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('group_user_idx').on(t.groupId, t.userUid),
    index('membership_user_idx').on(t.userUid),
  ]
);

// 5. Invitations Table
export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull().default('MEMBER'),
  token: text('token').notNull().unique(),
  inviterUid: text('inviter_uid')
    .notNull()
    .references(() => users.uid),
  expiresAt: timestamp('expires_at').notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Participants Table (Group-scoped member identity, can link to User or be unlinked)
export const participants = pgTable(
  'participants',
  {
    id: text('id').primaryKey(), // e.g. part_xxxx
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    linkedUserUid: text('linked_user_uid').references(() => users.uid, {
      onDelete: 'set null',
    }),
    color: text('color'),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('participant_group_idx').on(t.groupId)]
);

// 7. Expenses Table
export const expenses = pgTable(
  'expenses',
  {
    id: text('id').primaryKey(), // e.g. exp_xxxx
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    category: text('category').notNull().default('Other'),
    occurrenceDate: text('occurrence_date').notNull(), // 'YYYY-MM-DD'
    payerParticipantId: text('payer_participant_id')
      .notNull()
      .references(() => participants.id),
    currency: text('currency').notNull().default('USD'),
    amountMinorUnits: bigint('amount_minor_units', { mode: 'bigint' }).notNull(),
    notes: text('notes'),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'VOIDED'
    voidReason: text('void_reason'),
    voidedAt: timestamp('voided_at'),
    voidedByUid: text('voided_by_uid').references(() => users.uid),
    creatorUid: text('creator_uid')
      .notNull()
      .references(() => users.uid),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('expense_group_idx').on(t.groupId),
    index('expense_payer_idx').on(t.payerParticipantId),
    index('expense_date_idx').on(t.groupId, t.occurrenceDate),
  ]
);

// 8. Expense Splits Table
export const expenseSplits = pgTable(
  'expense_splits',
  {
    id: serial('id').primaryKey(),
    expenseId: text('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    participantId: text('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    allocationMethod: text('allocation_method').notNull().default('EQUAL'), // 'EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'
    allocatedMinorUnits: bigint('allocated_minor_units', {
      mode: 'bigint',
    }).notNull(),
    shareWeight: integer('share_weight'), // e.g. 1, 2 for SHARES
    basisPoints: integer('basis_points'), // e.g. 5000 for 50.00%
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('expense_participant_split_idx').on(
      t.expenseId,
      t.participantId
    ),
    index('split_participant_idx').on(t.participantId),
  ]
);

// 9. Expense Revisions Table (Immutable audit trail of before/after)
export const expenseRevisions = pgTable(
  'expense_revisions',
  {
    id: serial('id').primaryKey(),
    expenseId: text('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    beforeSnapshot: text('before_snapshot').notNull(), // JSON
    afterSnapshot: text('after_snapshot').notNull(), // JSON
    reason: text('reason').notNull(),
    actorUid: text('actor_uid')
      .notNull()
      .references(() => users.uid),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('revision_expense_idx').on(t.expenseId)]
);

// 10. Receipt Metadata
export const receiptMetadata = pgTable('receipt_metadata', {
  id: serial('id').primaryKey(),
  expenseId: text('expense_id')
    .notNull()
    .references(() => expenses.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  storageRef: text('storage_ref').notNull(),
  uploadedByUid: text('uploaded_by_uid')
    .notNull()
    .references(() => users.uid),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Settlement Payments Table (Direct participant-to-participant recorded reimbursements)
export const settlementPayments = pgTable(
  'settlement_payments',
  {
    id: text('id').primaryKey(), // e.g. pmt_xxxx
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    senderParticipantId: text('sender_participant_id')
      .notNull()
      .references(() => participants.id),
    recipientParticipantId: text('recipient_participant_id')
      .notNull()
      .references(() => participants.id),
    amountMinorUnits: bigint('amount_minor_units', { mode: 'bigint' }).notNull(),
    recordedDate: text('recorded_date').notNull(), // 'YYYY-MM-DD'
    status: text('status').notNull().default('CONFIRMED'), // 'CONFIRMED', 'REVERSED'
    notes: text('notes'),
    idempotencyKey: text('idempotency_key').unique(),
    creatorUid: text('creator_uid')
      .notNull()
      .references(() => users.uid),
    reversalReason: text('reversal_reason'),
    reversedAt: timestamp('reversed_at'),
    reversalOfPaymentId: text('reversal_of_payment_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('payment_group_idx').on(t.groupId),
    index('payment_sender_idx').on(t.senderParticipantId),
    index('payment_recipient_idx').on(t.recipientParticipantId),
  ]
);

// 12. Import Batches Table
export const importBatches = pgTable('import_batches', {
  id: text('id').primaryKey(), // e.g. imp_xxxx
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  checksum: text('checksum').notNull(),
  columnMapping: text('column_mapping').notNull(), // JSON
  status: text('status').notNull().default('PREVIEW'), // 'PREVIEW', 'COMMITTED', 'CANCELLED'
  duplicatePolicy: text('duplicate_policy').notNull().default('SKIP'), // 'SKIP', 'IMPORT_ALL'
  totalRows: integer('total_rows').notNull().default(0),
  validRows: integer('valid_rows').notNull().default(0),
  duplicateRows: integer('duplicate_rows').notNull().default(0),
  errorRows: integer('error_rows').notNull().default(0),
  creatorUid: text('creator_uid')
    .notNull()
    .references(() => users.uid),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Import Rows Table
export const importRows = pgTable(
  'import_rows',
  {
    id: serial('id').primaryKey(),
    batchId: text('batch_id')
      .notNull()
      .references(() => importBatches.id, { onDelete: 'cascade' }),
    rowIndex: integer('row_index').notNull(),
    sourceRowJson: text('source_row_json').notNull(),
    normalizedDate: text('normalized_date'),
    normalizedDescription: text('normalized_description'),
    normalizedAmountMinorUnits: bigint('normalized_amount_minor_units', {
      mode: 'bigint',
    }),
    normalizedPayerName: text('normalized_payer_name'),
    fingerprint: text('fingerprint').notNull(),
    status: text('status').notNull().default('PENDING'), // 'VALID', 'DUPLICATE', 'ERROR', 'COMMITTED'
    errorMessage: text('error_message'),
    committedExpenseId: text('committed_expense_id'),
  },
  (t) => [
    index('import_batch_idx').on(t.batchId),
    index('import_fingerprint_idx').on(t.fingerprint),
  ]
);

// 14. Audit Events Table
export const auditEvents = pgTable(
  'audit_events',
  {
    id: serial('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    actorUid: text('actor_uid').notNull(),
    actorName: text('actor_name').notNull(),
    action: text('action').notNull(), // 'GROUP_CREATED', 'EXPENSE_CREATED', 'EXPENSE_EDITED', 'EXPENSE_VOIDED', 'PAYMENT_RECORDED', 'PAYMENT_REVERSED', etc.
    targetId: text('target_id').notNull(),
    targetType: text('target_type').notNull(), // 'expense', 'payment', 'group', 'participant', 'import'
    reason: text('reason'),
    metadataJson: text('metadata_json'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('audit_group_idx').on(t.groupId),
    index('audit_created_idx').on(t.groupId, t.createdAt),
  ]
);

// 15. Export Records Table
export const exportRecords = pgTable('export_records', {
  id: serial('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  exportFormat: text('export_format').notNull().default('CSV'),
  filterParams: text('filter_params'),
  checksum: text('checksum').notNull(),
  creatorUid: text('creator_uid')
    .notNull()
    .references(() => users.uid),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  expensesCreated: many(expenses),
  settlementPaymentsCreated: many(settlementPayments),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, {
    fields: [groups.ownerUid],
    references: [users.uid],
  }),
  memberships: many(memberships),
  participants: many(participants),
  expenses: many(expenses),
  settlementPayments: many(settlementPayments),
  importBatches: many(importBatches),
  auditEvents: many(auditEvents),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  group: one(groups, {
    fields: [participants.groupId],
    references: [groups.id],
  }),
  linkedUser: one(users, {
    fields: [participants.linkedUserUid],
    references: [users.uid],
  }),
  expensesPaid: many(expenses),
  splits: many(expenseSplits),
  paymentsSent: many(settlementPayments, { relationName: 'sentPayments' }),
  paymentsReceived: many(settlementPayments, { relationName: 'receivedPayments' }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, {
    fields: [expenses.groupId],
    references: [groups.id],
  }),
  payer: one(participants, {
    fields: [expenses.payerParticipantId],
    references: [participants.id],
  }),
  splits: many(expenseSplits),
  revisions: many(expenseRevisions),
  receipts: many(receiptMetadata),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  participant: one(participants, {
    fields: [expenseSplits.participantId],
    references: [participants.id],
  }),
}));
