# SDE Intern Assignment: Shared Bill Splitter

Welcome. In this assignment you build a small bill splitter for a shared home. It has two parts:

1. **Homes and members:** create a home and add members to it.
2. **Bill splitting:** split a bill between the members. Each member pays their own share.

The assignment is small on purpose. We want correct, safe, and clear code. We do not want many features.

## What we look at

- **Your code passes the tests.** The tests decide, not opinion. You get the visible tests. We also run extra tests that you do not see.
- **Your code is safe when things go wrong.** Wrong input, repeated requests, and two requests at the same time must not break your data.
- **Your code is typed.** Use TypeScript. Do not use `any`.
- **You understand your code.** You record a short video and explain it.

Take your time. A careful, correct solution is better than a fast one. We expect 2 to 3 days of real work.

## Stack (required)

- **API:** Hono on Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite). The binding is `DB` in `api/wrangler.jsonc`.
- **Web:** React, Vite, TanStack Router
- **Language:** TypeScript on both sides
- **Tests:** Vitest, running inside the Workers runtime
- **Quality:** Biome. `pnpm check` and `pnpm typecheck` must pass.

You choose the rest (styling, form library, validation library). Pick tools you can explain.

## The task

The assignment has two parts. Do Part 1 first. Part 2 builds on it.

**Database.** Write the schema as SQL migration files in `api/migrations/`. For example `0001_init.sql`. The tests apply every file in this folder. Your schema must have **at least 3 named constraints** that protect the data. For example a foreign key, a `CHECK`, or a `UNIQUE` key. Be ready to explain what each constraint stops.

**Errors.** Every error response is JSON: `{ "error": "message" }`.

## Part 1: Homes and members

Create a home and add members to it. The order in which members are added matters in Part 2.

#### `POST /api/homes`

- Request: `{ "name": string }`
- Success: `201` `{ id, name }`

#### `POST /api/homes/:homeId/members`

- Request: `{ "name": string }`
- Success: `201` `{ id, homeId, name }`
- Errors: `404` home not found

Visible tests: `api/test/homes.test.ts`.

## Part 2: Bill splitting

Add a bill to a home, split it between the members, and let each member pay their share.

All amounts are whole **cents** (integers). `100` cents is 1 dollar. Never use decimals for money.

#### `POST /api/homes/:homeId/bills`

- Request: `{ "title": string, "totalCents": number }`
- Success: `201` `{ id, homeId, title, totalCents, shares: [{ id, memberId, amountCents, paidAt: null }] }`
- Errors: `404` home not found. `422` total is not a positive whole number, or the home has no members.

#### `POST /api/bills/:billId/shares/:shareId/pay`

- Request: header `Idempotency-Key`
- Success: `200` `{ id, memberId, amountCents, paidAt }`
- Errors: `400` key missing. `404` bill or share not found. `409` share already paid with a different key.

#### `GET /api/homes/:homeId/balances`

- Success: `200` `{ balances: [{ memberId, name, outstandingCents }] }`
- Errors: `404` home not found

**Rules**

- **Split.** A bill is split between all members of the home. The shares always add up to `totalCents`. If the amount does not divide evenly, the extra cents go to the members one by one, in the order the members were added to the home. Example: 1000 cents between 3 members gives `334`, `333`, `333`.
- **Pay.** Paying marks one share as paid and sets `paidAt`. If the same `Idempotency-Key` is sent again for the same share, answer `200` with the same result. Do not pay twice. If two requests pay the same share at the same time, only one may succeed.
- **Balances.** `outstandingCents` is the sum of the member's unpaid shares, across all bills of the home. List the members in the order they were added.

Visible tests: `api/test/bills.test.ts` and `api/test/payments.test.ts`.

#### Web page

Build one page that:

- shows the bills of a home and the shares of each bill,
- lets a member pay a share,
- shows clear **loading**, **empty**, and **error** states,
- keeps the share unpaid and shows an error if the payment fails.

The page must not crash when the API answers with an error or is slow.

## Cases you must handle

You must handle these cases and talk about them in your video:

1. A home with no members.
2. An amount that is zero, negative, or not a whole number.
3. An amount that does not divide evenly.
4. The same payment request sent twice.
5. Two members paying the same share at the same time.
6. A bill or share that does not exist.
7. The API answers with a 500 error or is slow. The web page must not crash.

## Run it

This is a pnpm workspace. Install once at the root.

```bash
pnpm install
pnpm dev          # api on :8787 and web on :5173
```

Open http://localhost:5173. The starter page shows a title. `/api/health` returns `{ "status": "ok" }`.

```bash
pnpm test         # run the visible tests in api/test
pnpm check        # Biome: format and lint. Must pass.
pnpm check:fix    # fix what Biome can fix
pnpm typecheck    # tsc on both packages. Must pass.
pnpm build        # production build of the web app
```

`pnpm dev` applies your migrations to a local database before it starts the API.

If pnpm says some build scripts were ignored, run `pnpm approve-builds` and allow `esbuild` and `workerd`.

When you change `api/wrangler.jsonc`, refresh the `Env` types:

```bash
pnpm --filter bill-splitter-api cf-typegen
```

## Rules for the tests

- The visible tests are in `api/test`. They start with a failing result. Your job is to make them pass.
- Do **not** change the visible tests or `api/test/helpers.ts`. We compare them with the original.
- We run extra tests after you submit. They test the cases in "Cases you must handle" more closely.

## AI policy

You can use AI tools. Tell us which ones and where in your answers on the form.
You must understand every line you submit. We check this with your video and in a live call. "The AI wrote it" is not an answer.

## How to submit

1. Click **Use this template**, then **Create a new repository**. Make the repository **public**.
2. Build your solution in your new repository. Small, clear commits are welcome.
3. Update this README with a short section called **Decisions**. Write 3 decisions you made and why.
4. Record a video of **3 minutes or less** (Loom or unlisted YouTube). Show the architecture, the data flow, and one trade-off you made. Make sure anyone with the link can view it.
5. Paste the repository link and the video link in the application form.

We will run `pnpm install && pnpm check && pnpm typecheck && pnpm test` on your repository.

---

# Implementation & Architecture Documentation

## Decisions

### 1. Atomic Conditional Updates with Idempotency Key Tracking for Concurrency Safety

- **Decision:** Rather than relying on multi-step application-level locks or vulnerable check-then-act logic (`SELECT` then `UPDATE`), payment confirmation is executed using an atomic conditional SQL statement:

  ```sql
  UPDATE shares SET paid_at = ?, idempotency_key = ? WHERE id = ? AND bill_id = ? AND paid_at IS NULL
  ```

  If `changes === 1`, the current request won the race and successfully transitioned the share from unpaid to paid. If `changes === 0`, another concurrent request or previous attempt already completed the payment. The handler then retrieves the existing record: if `existing.idempotency_key === incomingKey`, it returns HTTP 200 with identical `paidAt` timestamp (idempotent replay); if the key differs, it returns HTTP 409 Conflict.
- **Why:** In serverless environments like Cloudflare Workers where multiple isolates run concurrently across distributed edge locations, application memory is not shared. Using database-level atomic conditional updates guarantees zero double-charge vulnerabilities, prevents race conditions, and provides safe idempotency without requiring distributed locks.

### 2. Explicit Deterministic Integer Ordering (`created_order`) for Member Creation Sequence

- **Decision:** Instead of relying on timestamps (which can collide when multiple members are created in the same millisecond) or implicit SQLite row IDs (which are not portable and cannot be indexed in Cloudflare D1), an explicit `created_order INTEGER NOT NULL` column is maintained per household:

  ```sql
  SELECT COALESCE(MAX(created_order), 0) + 1 AS next_order FROM members WHERE home_id = ?
  ```
- **Why:** The bill-splitting specification dictates that when `totalCents` does not divide evenly among $N$ members, the leftover cents ($R = \text{totalCents} \pmod N$) must be distributed to members one-by-one in the exact order of their creation. Storing and indexing `created_order` ensures 100% deterministic, immutable ordering across all bill splits, balances queries, and UI displays, even in concurrent or rapid-succession member creation scenarios.

### 3. Atomic D1 Batch Operations for Bill Creation & Share Distribution

- **Decision:** When creating a bill with $N$ member shares, the bill insertion statement and all $N$ share insertion statements are executed within a single Cloudflare D1 `db.batch([insertBillStmt, ...shareInserts])` atomic transaction.
- **Why:** If any individual share insertion fails (e.g., due to a constraint violation or unexpected server disconnect), the entire transaction rolls back automatically. This stops partial bill creation and guarantees that every bill in the database always has its full complement of shares matching `totalCents` exactly.

---

## Database Architecture & Named Constraints

The database schema is defined in `api/migrations/0001_initial_schema.sql` and deployed to Cloudflare D1 (SQLite).

### Tables

1. **`homes`**: Stores household entity records (`id`, `name`, `created_at`).
2. **`members`**: Stores roommates associated with a household (`id`, `home_id`, `name`, `created_order`, `created_at`).
3. **`bills`**: Stores household expenses in integer cents (`id`, `home_id`, `title`, `total_cents`, `created_at`).
4. **`shares`**: Stores each member's split obligation for a bill (`id`, `bill_id`, `member_id`, `amount_cents`, `paid_at`, `idempotency_key`, `created_at`).

### Explicit Named Constraints

The schema defines **7 explicitly named constraints** to enforce data integrity at the database layer:

1. **`CONSTRAINT fk_members_home FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE`**
   - _Stops:_ Orphan member records referencing a non-existent or deleted household.
2. **`CONSTRAINT fk_bills_home FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE`**
   - _Stops:_ Bills referencing a non-existent or deleted household.
3. **`CONSTRAINT fk_shares_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE`**
   - _Stops:_ Orphan shares referencing a deleted or invalid bill.
4. **`CONSTRAINT fk_shares_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE`**
   - _Stops:_ Allocating shares to a member who does not exist.
5. **`CONSTRAINT chk_bills_positive_cents CHECK (total_cents > 0)`**
   - _Stops:_ Invalid, negative, or zero monetary amounts for bills.
6. **`CONSTRAINT chk_shares_positive_cents CHECK (amount_cents > 0)`**
   - _Stops:_ Negative or zero share amounts from being created.
7. **`CONSTRAINT uq_shares_bill_member UNIQUE (bill_id, member_id)`**
   - _Stops:_ Duplicate share allocations for the same member on the same bill.

---

## API Specification

All monetary values are whole **integer cents** (e.g., `1000` = $10.00). All error responses strictly conform to `{ "error": "message" }`.

### Homes & Members

- `POST /api/homes`: Create a household. Validates non-empty `name`. Returns `201 { id, name }`.
- `GET /api/homes`: Retrieve all households with aggregated totals (expenses, paid, outstanding, member count). Returns `200 [...]`.
- `GET /api/homes/:homeId`: Retrieve household details and member roster. Returns `200 { id, name, createdAt, members }`.
- `POST /api/homes/:homeId/members`: Add a member. Returns `201 { id, homeId, name }`. Returns `404` if home does not exist; `400` on empty name.
- `GET /api/homes/:homeId/members`: Retrieve members with individual allocated, paid, and outstanding balances. Returns `200 [...]`.

### Bills & Splitting

- `POST /api/homes/:homeId/bills`: Create and split a bill. Validates `title` (non-empty) and `totalCents` (positive whole integer).
  - Distributes base share $\lfloor T / N \rfloor$ to all members, and gives extra 1 cent to the first $T \pmod N$ members in creation order.
  - Returns `201 { id, homeId, title, totalCents, shares: [{ id, memberId, amountCents, paidAt: null }] }`.
  - Returns `404` if home not found; `422` if amount is invalid or home has 0 members.
- `GET /api/homes/:homeId/bills`: Retrieve all bills for a home with nested shares and member names. Returns `200 [...]`.

### Payments & Concurrency

- `POST /api/bills/:billId/shares/:shareId/pay`: Record payment with mandatory `Idempotency-Key` header.
  - First request marks share paid with timestamp. Returns `200 { id, memberId, amountCents, paidAt }`.
  - Replay with identical `Idempotency-Key` returns original `200` with same `paidAt`.
  - Conflicting request with different key returns `409 { "error": "Share already paid" }`.
  - Missing key returns `400 { "error": "Idempotency-Key header is required" }`.
  - Non-existent bill or share returns `404 { "error": "..." }`.

### Balances

- `GET /api/homes/:homeId/balances`: Calculates net unpaid debts per member across all bills in the home, preserved in member creation order. Returns `200 { balances: [{ memberId, name, outstandingCents }] }`.

---

## Frontend Architecture & UI/UX

Built with **React 19**, **Vite**, **TypeScript**, **TanStack Router**, and **Tailwind CSS v4** with **Lucide icons**:

- **Real Data Only:** No mock data, no hardcoded states, no dummy transactions. Displays meaningful empty onboarding states when the database is empty.
- **Color Palette & Styling:** Professional SaaS aesthetic using deep navy primary (`#0f172a`), emerald green accent (`#10b981`), subtle slate borders (`border-slate-200`), and typography with Inter font.
- **Resilience & Error Handling:** Network failures, slow APIs, 4xx, and 5xx errors surface user-friendly notifications with explicit retry options.
- **Interactive Calculator:** When creating a bill, a real-time preview calculates the exact cent split for every member, highlighting remainder cents.
- **Audit-Ready Payments:** Payment confirmation dialog displays the unique UUID `Idempotency-Key`, allowing clients to verify idempotency handling.
- **Responsive Layout:** Adaptive desktop sidebar, top header with household switcher, mobile navigation drawer, and responsive cards/tables without horizontal overflow.

---

## Verification & Quality Assurance

All verification commands pass with zero errors:

```bash
# Run all Vitest integration tests (both original suites + edge cases)
pnpm test

# Run Biome linter and formatter check
pnpm check

# Run TypeScript compiler checks across all packages
pnpm typecheck

# Build the production web application
pnpm build
```
