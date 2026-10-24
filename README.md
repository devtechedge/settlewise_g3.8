# Settlewise — Shared-Expense Reconciliation & Settlement Planning

> **Mandate & Legal Notice**: Settlewise is strictly a **record-keeping and settlement-planning application**. Settlewise **does not move money**, does not execute banking transfers, does not connect to automated clearing houses (ACH/Fedwire/SEPA), and never collects or stores credit card numbers, CVVs, or bank login credentials. All balances, settlement plans, and payment records reflect user-reported offline settlements.

---

## 1. Key Invariants & Architectural Principles

### 1.1 Exact Monetary Arithmetic (Zero Floating-Point)
- **Integer Minor Units**: All monetary values are represented and stored as PostgreSQL `bigint` (TypeScript `bigint`, serialized to/from JSON strings to avoid 53-bit JavaScript number precision loss).
- **Scale Registry**:
  - `USD`: Scale 2 (1 USD = 100 cents)
  - `EUR`: Scale 2 (1 EUR = 100 cents)
  - `GBP`: Scale 2 (1 GBP = 100 pence)
  - `INR`: Scale 2 (1 INR = 100 paise)
  - `JPY`: Scale 0 (1 JPY = 1 yen, no subunit)
- **Zero-Sum Group Balance**: Across all participants $P$ in any group:
  $$\sum_{p \in P} \text{Net Balance}(p) \equiv 0$$
  This invariant is mathematically guaranteed and unit-tested across every expense addition, edit, void, or settlement payment.

### 1.2 Deterministic Allocation Algorithms
- **EQUAL**: Divides the total amount into equal base shares $\lfloor \text{Total} / N \rfloor$. Any remainder pennies ($R = \text{Total} \pmod N$) are allocated one-by-one to participants ordered deterministically by stable participant ID.
- **EXACT**: User specifies exact minor units for each participant; verified to sum identically to the total before saving.
- **PERCENTAGE**: Expressed in **Basis Points (bps)** where $100.00\% = 10,000 \text{ bps}$. Remainder cents are distributed using the **Hamilton–Webster / Largest-Remainder Method** ordered by fractional residual descending, breaking ties by stable participant ID.
- **SHARES**: Weights $w_i \in \mathbb{N}_{\ge 0}$ with total weight $W = \sum w_i$. Uses largest-remainder distribution on $\frac{\text{Total} \times w_i}{W}$.

### 1.3 Deterministic Greedy Settlement Planner
- Resolves all inter-participant debts into a minimal set of direct transfers.
- Debtors (negative net balance) and creditors (positive net balance) are sorted deterministically by magnitude descending, with tie-breaking by participant ID.
- In each step, the largest debtor pays the largest creditor $\min(|\text{Debtor Balance}|, \text{Creditor Balance})$, eliminating at least one balance until all balances reach 0.

### 1.4 Reversible Settlements & Idempotency
- Offline settlements are recorded with idempotency keys (`idempotency_key`) to prevent duplicate submissions on network retries.
- Payments can be reversed at any time by specifying an audit reason. Reversal preserves immutable compensating entries without deleting the original audit trail.

### 1.5 Immutable Revision Audit Trail & Soft Deletions
- Expenses are never overwritten in-place.
- Updating an expense creates an immutable `expense_revisions` record capturing before-and-after snapshots (JSON), total delta, revision author, and mandatory audit reason.
- Voiding an expense marks `status = 'VOIDED'` with an explanation, automatically excluding it from group balances while retaining full visibility for auditability.
- Optimistic Concurrency Control (`expectedRevision`) protects against mid-air edit collisions.

### 1.6 CSV Import & Formula-Injection Prevention
- **RFC 4180 Streaming Tokenizer**: Handles escaped quotes, multi-line quoted fields, and varied delimiters without third-party regex vulnerabilities.
- **Formula-Injection Sanitization**: On both CSV export and import preview, any cell starting with dangerous spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) is prepended with a single quote (`'`) to neutralize Excel/Google Sheets formula execution.
- **Deduplication Engine**: Uses deterministic 64-bit hashing on `(Date + Amount + Payer + Description)` to flag potential duplicates before batch commit.

---

## 2. Technology Stack & Database Schema

- **Runtime & Framework**: Next.js 15 (App Router), React 19, TypeScript (ES2022 target), Tailwind CSS v4.
- **Database**: Google Cloud SQL PostgreSQL (`asia-southeast1`) managed via **Drizzle ORM** with connection pooling.
- **Auth**: Firebase Authentication + 1-Click Evaluator Role Switcher (`Alice Vance` - Owner, `Bob Chen` - Editor, `Charlie Miller` - Member).
- **Unit Testing**: Node.js built-in test runner (`tests/domain.test.ts`), runnable via `npx --yes tsx --test tests/domain.test.ts`.

### Database Tables (15 Tables)
1. `users`: App accounts & profiles.
2. `sessions`: Authenticated user sessions.
3. `groups`: Shared expense groups with currency, budget, and archival status.
4. `memberships`: User-to-group role bindings (`OWNER`, `EDITOR`, `MEMBER`).
5. `invitations`: 7-day cryptographic tokens for new member joins.
6. `participants`: Ledger entities in each group (linked to users or offline contacts).
7. `expenses`: Master ledger records with status (`ACTIVE`, `VOIDED`) and revision counters.
8. `expense_splits`: Exact participant shares with allocation metadata.
9. `expense_revisions`: Immutable audit log of every revision with full before/after snapshots.
10. `receipt_metadata`: Optional receipt file metadata and OCR tags.
11. `settlement_payments`: User-recorded offline settlements with idempotency keys and reversal state.
12. `import_batches`: Batch logs for CSV statement uploads.
13. `import_rows`: Raw and normalized rows with duplicate detection status.
14. `audit_events`: Security and financial activity timeline.
15. `export_records`: Log of CSV/JSON data exports.

---

## 3. Seeded Demo Data & Evaluator Credentials

Two fully populated groups are pre-seeded in the database:

### 1. Pine Street Flat (`grp_pine_street`)
- **Currency**: `USD` ($)
- **Budget**: $3,000.00
- **Participants**:
  - `Alice Vance` (Group Owner)
  - `Bob Chen` (Editor)
  - `Charlie Miller` (Member)
- **Expenses Included**:
  - *October Apartment Rent* ($1,500.00, Equal 3-way split)
  - *Gigabit Fiber Internet & Streaming bundle* ($180.00, Percentage split 40% / 30% / 30%)
  - *Weekly Organic Groceries & Pantry Restock* ($138.50, Shares split 2:1:1, includes Revision 1 & Revision 2 history)
  - *Voided Record: Accidental Duplicate Utility Bill* ($95.00, marked VOIDED with explanation)
  - *Settlement Payment 1*: $200.00 from Charlie Miller to Alice Vance (CONFIRMED)
  - *Settlement Payment 2*: $50.00 from Bob Chen to Alice Vance (REVERSED with audit reason)

### 2. Kyoto Autumn Trip 2026 (`grp_kyoto_trip`)
- **Currency**: `JPY` (¥, 0-decimal scale)
- **Budget**: ¥400,000
- **Participants**: Alice Vance, Bob Chen, Charlie Miller
- **Expenses Included**:
  - *Traditional Ryokan & Kaiseki Dinner* (¥180,000, Equal 3-way split of ¥60,000 each)
  - *Shinkansen Bullet Train Tickets* (¥84,000, Equal split of ¥28,000 each)
  - *Matcha Tea Ceremony & Sweets* (¥12,500, Shares split 2:1:2)

---

## 4. Evaluator Verification Steps

1. **Switch Roles**: Click the profile icon in the top right navbar to seamlessly switch between **Alice Vance (Owner)**, **Bob Chen (Editor)**, and **Charlie Miller (Member)** to test role-based permissions (Members cannot void expenses or edit group settings).
2. **Review Ledgers & Revisions**: Open **Pine Street Flat** > **Ledger**, click on **Weekly Organic Groceries & Pantry Restock** to inspect the live revision comparison and edit history.
3. **Record a Reimbursement**: Go to **Settlement Plan**, review the net creditor/debtor breakdown, click **Record Reimbursement**, submit notes (e.g., "Cash repaid"), and observe the immediate real-time balance consolidation and zero-sum balance preservation.
4. **CSV Import**: Go to **CSV Import**, click **Load Valid Sample**, view the auto-mapped headers, click **Preview Import Batch**, and then **Commit Verified Records to Ledger** to see them added to the group ledger.
5. **CSV Export**: Visit **Reports**, download the sanitized CSV statement, and verify that dangerous characters are escaped.
