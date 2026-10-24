# Security Policy

## Supported versions

Only the default branch (`main`) receives security fixes. Releases are tagged from `main`.

## Reporting a vulnerability

Please do not open a public issue for security problems. Report privately by email to
`devtechedge@gmail.com`. Include a description, affected endpoints, and a minimal
reproduction. You should receive an acknowledgment within 3 business days.

## Threat model

SettleWise is a record-keeping and settlement-planning application. It does not move
money, connect to banking networks, or store card numbers.

### Authentication and sessions

- Sessions use an `httpOnly`, `sameSite=lax` cookie named `settlewise_uid` holding a user id.
- In demo mode, visitors without a session are signed in as the `usr_alice` persona so the
  product is instantly explorable. Demo mode is active on Vercel, when `DEMO_MODE=true`,
  or when no `SQL_HOST` is configured. Demo data is ephemeral and resets on cold start.
- Outside demo mode, an unknown or missing session is rejected and API routes return 401.
- Session cookies are not signed or encrypted; treat them as opaque identifiers only. For a
  production deployment, pair this with a real identity provider and rotate the session
  secret of your choice; this project does not ship one by default.

### Authorization

- Group actions are gated by `memberships` rows with roles `OWNER`, `EDITOR`, and `MEMBER`.
- Role checks run on the server against the database on every mutating and sensitive read.
- Members cannot void expenses, edit group settings, or manage members; Editors cannot void
  expenses or manage members.

### Data integrity

- All money is stored as `bigint` minor units; parsing and formatting never use floats.
- Expense edits require an `expectedRevision` match (optimistic concurrency) and a mandatory
  audit reason; every change records an immutable before/after snapshot.
- Settlement payments carry idempotency keys to prevent duplicate recording on retries.
- CSV import sanitizes cells that start with `=`, `+`, `@`, tab, or carriage return to
  prevent spreadsheet formula injection.

### Known residual risks

- **Rate limiting**: no production rate limiting is implemented. A hosted deployment should
  add one upstream (for example a WAF or edge middleware) before public launch.
- **XSS surface**: user-provided descriptions, notes, and participant names are rendered as
  React text nodes, which escapes HTML by default. Any future use of `dangerouslySetInnerHTML`
  must be reviewed.
- **Dependency policy**: Dependabot keeps npm and GitHub Actions dependencies on patch and
  minor updates weekly. Major upgrades are ignored until they are deliberately verified.
- **Demo database**: PGLite runs inside each serverless instance. State is per-instance and
  ephemeral; it is not a shared or durable store.
