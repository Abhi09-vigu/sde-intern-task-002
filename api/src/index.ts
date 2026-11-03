import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type {
  BalanceItem,
  BillDetail,
  BillRecord,
  HomeRecord,
  HomeSummary,
  MemberRecord,
  MemberSummary,
  ShareRecord,
} from './types'

const app = new Hono<{ Bindings: Env }>()

// Enable CORS for development
app.use('*', cors())

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Global error handler adhering to { "error": "message" }
app.onError((err, c) => {
  console.error('Unhandled server error:', err)
  return c.json({ error: err.message || 'Internal Server Error' }, 500)
})

// ----------------------------------------------------
// HOMES
// ----------------------------------------------------

// List all homes with aggregated dashboard statistics
app.get('/api/homes', async (c) => {
  const db = c.env.DB

  const homes = await db
    .prepare('SELECT id, name, created_at FROM homes ORDER BY created_at DESC')
    .all<HomeRecord>()

  const results: HomeSummary[] = []

  for (const home of homes.results) {
    const memberCountRes = await db
      .prepare('SELECT COUNT(*) as count FROM members WHERE home_id = ?')
      .bind(home.id)
      .first<{ count: number }>()

    const billStatsRes = await db
      .prepare(
        `SELECT 
          (SELECT COALESCE(SUM(total_cents), 0) FROM bills WHERE home_id = ?) AS totalExpenses,
          COALESCE(SUM(CASE WHEN s.paid_at IS NOT NULL THEN s.amount_cents ELSE 0 END), 0) AS totalPaid,
          COALESCE(SUM(CASE WHEN s.paid_at IS NULL THEN s.amount_cents ELSE 0 END), 0) AS totalOutstanding
        FROM bills b
        LEFT JOIN shares s ON s.bill_id = b.id
        WHERE b.home_id = ?`,
      )
      .bind(home.id, home.id)
      .first<{ totalExpenses: number; totalPaid: number; totalOutstanding: number }>()

    results.push({
      id: home.id,
      name: home.name,
      createdAt: home.created_at,
      memberCount: Number(memberCountRes?.count ?? 0),
      totalExpensesCents: Number(billStatsRes?.totalExpenses ?? 0),
      totalPaidCents: Number(billStatsRes?.totalPaid ?? 0),
      totalOutstandingCents: Number(billStatsRes?.totalOutstanding ?? 0),
    })
  }

  return c.json(results, 200)
})

// Create a home
app.post('/api/homes', async (c) => {
  const db = c.env.DB
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('name' in body) ||
    typeof (body as { name: unknown }).name !== 'string'
  ) {
    return c.json({ error: 'Home name is required' }, 400)
  }

  const name = (body as { name: string }).name.trim()
  if (!name) {
    return c.json({ error: 'Home name cannot be empty' }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db
    .prepare('INSERT INTO homes (id, name, created_at) VALUES (?, ?, ?)')
    .bind(id, name, now)
    .run()

  return c.json({ id, name }, 201)
})

// Get home by ID
app.get('/api/homes/:homeId', async (c) => {
  const db = c.env.DB
  const homeId = c.req.param('homeId')

  const home = await db
    .prepare('SELECT id, name, created_at FROM homes WHERE id = ?')
    .bind(homeId)
    .first<HomeRecord>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  const members = await db
    .prepare(
      'SELECT id, home_id, name, created_order, created_at FROM members WHERE home_id = ? ORDER BY created_order ASC',
    )
    .bind(homeId)
    .all<MemberRecord>()

  return c.json(
    {
      id: home.id,
      name: home.name,
      createdAt: home.created_at,
      members: members.results.map((m) => ({
        id: m.id,
        homeId: m.home_id,
        name: m.name,
        createdOrder: m.created_order,
        createdAt: m.created_at,
      })),
    },
    200,
  )
})

// ----------------------------------------------------
// MEMBERS
// ----------------------------------------------------

// List members of a home with individual financial balances
app.get('/api/homes/:homeId/members', async (c) => {
  const db = c.env.DB
  const homeId = c.req.param('homeId')

  const home = await db.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first()
  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  const members = await db
    .prepare(
      `SELECT 
        m.id,
        m.home_id,
        m.name,
        m.created_order,
        m.created_at,
        COALESCE(SUM(s.amount_cents), 0) AS totalAllocated,
        COALESCE(SUM(CASE WHEN s.paid_at IS NOT NULL THEN s.amount_cents ELSE 0 END), 0) AS totalPaid,
        COALESCE(SUM(CASE WHEN s.paid_at IS NULL THEN s.amount_cents ELSE 0 END), 0) AS outstanding
      FROM members m
      LEFT JOIN shares s ON s.member_id = m.id
      WHERE m.home_id = ?
      GROUP BY m.id, m.home_id, m.name, m.created_order, m.created_at
      ORDER BY m.created_order ASC`,
    )
    .bind(homeId)
    .all<
      MemberRecord & {
        totalAllocated: number
        totalPaid: number
        outstanding: number
      }
    >()

  const result: MemberSummary[] = members.results.map((m) => ({
    id: m.id,
    homeId: m.home_id,
    name: m.name,
    createdOrder: m.created_order,
    createdAt: m.created_at,
    totalAllocatedCents: Number(m.totalAllocated),
    totalPaidCents: Number(m.totalPaid),
    outstandingCents: Number(m.outstanding),
  }))

  return c.json(result, 200)
})

// Add member to home
app.post('/api/homes/:homeId/members', async (c) => {
  const db = c.env.DB
  const homeId = c.req.param('homeId')

  const home = await db.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first()
  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('name' in body) ||
    typeof (body as { name: unknown }).name !== 'string'
  ) {
    return c.json({ error: 'Member name is required' }, 400)
  }

  const name = (body as { name: string }).name.trim()
  if (!name) {
    return c.json({ error: 'Member name cannot be empty' }, 400)
  }

  // Find next creation order deterministically for this home
  const orderRes = await db
    .prepare(
      'SELECT COALESCE(MAX(created_order), 0) + 1 AS next_order FROM members WHERE home_id = ?',
    )
    .bind(homeId)
    .first<{ next_order: number }>()

  const nextOrder = Number(orderRes?.next_order ?? 1)
  const memberId = crypto.randomUUID()
  const now = new Date().toISOString()

  await db
    .prepare(
      'INSERT INTO members (id, home_id, name, created_order, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(memberId, homeId, name, nextOrder, now)
    .run()

  return c.json({ id: memberId, homeId, name }, 201)
})

// ----------------------------------------------------
// BILLS
// ----------------------------------------------------

// List bills of a home with shares and member names
app.get('/api/homes/:homeId/bills', async (c) => {
  const db = c.env.DB
  const homeId = c.req.param('homeId')

  const home = await db.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first()
  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  const bills = await db
    .prepare(
      'SELECT id, home_id, title, total_cents, created_at FROM bills WHERE home_id = ? ORDER BY created_at DESC',
    )
    .bind(homeId)
    .all<BillRecord>()

  const results: BillDetail[] = []

  for (const bill of bills.results) {
    const shares = await db
      .prepare(
        `SELECT s.id, s.member_id, s.amount_cents, s.paid_at, m.name AS member_name
         FROM shares s
         JOIN members m ON m.id = s.member_id
         WHERE s.bill_id = ?
         ORDER BY m.created_order ASC`,
      )
      .bind(bill.id)
      .all<{
        id: string
        member_id: string
        amount_cents: number
        paid_at: string | null
        member_name: string
      }>()

    results.push({
      id: bill.id,
      homeId: bill.home_id,
      title: bill.title,
      totalCents: Number(bill.total_cents),
      createdAt: bill.created_at,
      shares: shares.results.map((s) => ({
        id: s.id,
        memberId: s.member_id,
        memberName: s.member_name,
        amountCents: Number(s.amount_cents),
        paidAt: s.paid_at,
      })),
    })
  }

  return c.json(results, 200)
})

// Create bill and automatically split among all home members
app.post('/api/homes/:homeId/bills', async (c) => {
  const db = c.env.DB
  const homeId = c.req.param('homeId')

  const home = await db.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first()
  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }

  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Invalid request body' }, 422)
  }

  const { title, totalCents } = body as { title?: unknown; totalCents?: unknown }

  if (typeof title !== 'string' || title.trim().length === 0) {
    return c.json({ error: 'Title must be a non-empty string' }, 422)
  }

  if (typeof totalCents !== 'number' || !Number.isInteger(totalCents) || totalCents <= 0) {
    return c.json({ error: 'totalCents must be a positive whole number' }, 422)
  }

  // Get members in deterministic creation order
  const membersRes = await db
    .prepare(
      'SELECT id, home_id, name, created_order FROM members WHERE home_id = ? ORDER BY created_order ASC',
    )
    .bind(homeId)
    .all<MemberRecord>()

  const members = membersRes.results
  if (members.length === 0) {
    return c.json({ error: 'Home has no members' }, 422)
  }

  const memberCount = members.length
  const baseShare = Math.floor(totalCents / memberCount)
  const remainder = totalCents % memberCount

  const billId = crypto.randomUUID()
  const now = new Date().toISOString()
  const cleanTitle = title.trim()

  const insertBillStmt = db
    .prepare(
      'INSERT INTO bills (id, home_id, title, total_cents, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(billId, homeId, cleanTitle, totalCents, now)

  const shareInserts: D1PreparedStatement[] = []
  const responseShares: {
    id: string
    memberId: string
    amountCents: number
    paidAt: null
  }[] = []

  for (let i = 0; i < memberCount; i++) {
    const member = members[i]
    if (!member) continue

    const amountCents = i < remainder ? baseShare + 1 : baseShare
    const shareId = crypto.randomUUID()

    shareInserts.push(
      db
        .prepare(
          'INSERT INTO shares (id, bill_id, member_id, amount_cents, paid_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
        )
        .bind(shareId, billId, member.id, amountCents, now),
    )

    responseShares.push({
      id: shareId,
      memberId: member.id,
      amountCents,
      paidAt: null,
    })
  }

  // Execute in atomic transaction batch
  await db.batch([insertBillStmt, ...shareInserts])

  return c.json(
    {
      id: billId,
      homeId,
      title: cleanTitle,
      totalCents,
      shares: responseShares,
    },
    201,
  )
})

// ----------------------------------------------------
// PAYMENTS
// ----------------------------------------------------

// Pay a share with Idempotency-Key and race condition safety
app.post('/api/bills/:billId/shares/:shareId/pay', async (c) => {
  const db = c.env.DB
  const billId = c.req.param('billId')
  const shareId = c.req.param('shareId')

  const idempotencyKey = c.req.header('Idempotency-Key')?.trim()
  if (!idempotencyKey) {
    return c.json({ error: 'Idempotency-Key header is required' }, 400)
  }

  // Ensure bill exists
  const bill = await db.prepare('SELECT id FROM bills WHERE id = ?').bind(billId).first()
  if (!bill) {
    return c.json({ error: 'Bill not found' }, 404)
  }

  // Ensure share exists and belongs to this bill
  const share = await db
    .prepare(
      'SELECT id, bill_id, member_id, amount_cents, paid_at, idempotency_key FROM shares WHERE id = ? AND bill_id = ?',
    )
    .bind(shareId, billId)
    .first<ShareRecord>()

  if (!share) {
    return c.json({ error: 'Share not found' }, 404)
  }

  // If already paid, check idempotency key
  if (share.paid_at !== null) {
    if (share.idempotency_key === idempotencyKey) {
      return c.json(
        {
          id: share.id,
          memberId: share.member_id,
          amountCents: Number(share.amount_cents),
          paidAt: share.paid_at,
        },
        200,
      )
    }
    return c.json({ error: 'Share already paid' }, 409)
  }

  // Share is currently unpaid; execute atomic conditional update
  const now = new Date().toISOString()
  const updateResult = await db
    .prepare(
      'UPDATE shares SET paid_at = ?, idempotency_key = ? WHERE id = ? AND bill_id = ? AND paid_at IS NULL',
    )
    .bind(now, idempotencyKey, shareId, billId)
    .run()

  if (updateResult.meta.changes === 1) {
    return c.json(
      {
        id: share.id,
        memberId: share.member_id,
        amountCents: Number(share.amount_cents),
        paidAt: now,
      },
      200,
    )
  }

  // Another concurrent request updated it; re-fetch and check idempotency key
  const updatedShare = await db
    .prepare(
      'SELECT id, bill_id, member_id, amount_cents, paid_at, idempotency_key FROM shares WHERE id = ? AND bill_id = ?',
    )
    .bind(shareId, billId)
    .first<ShareRecord>()

  if (updatedShare && updatedShare.idempotency_key === idempotencyKey) {
    return c.json(
      {
        id: updatedShare.id,
        memberId: updatedShare.member_id,
        amountCents: Number(updatedShare.amount_cents),
        paidAt: updatedShare.paid_at,
      },
      200,
    )
  }

  return c.json({ error: 'Share already paid' }, 409)
})

// ----------------------------------------------------
// BALANCES
// ----------------------------------------------------

// Calculate outstanding balances for all members in a home in creation order
app.get('/api/homes/:homeId/balances', async (c) => {
  const db = c.env.DB
  const homeId = c.req.param('homeId')

  const home = await db.prepare('SELECT id FROM homes WHERE id = ?').bind(homeId).first()
  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  const balancesRes = await db
    .prepare(
      `SELECT 
        m.id AS memberId,
        m.name AS name,
        COALESCE(SUM(CASE WHEN s.paid_at IS NULL AND b.id IS NOT NULL THEN s.amount_cents ELSE 0 END), 0) AS outstandingCents
      FROM members m
      LEFT JOIN shares s ON s.member_id = m.id
      LEFT JOIN bills b ON b.id = s.bill_id AND b.home_id = m.home_id
      WHERE m.home_id = ?
      GROUP BY m.id, m.name, m.created_order
      ORDER BY m.created_order ASC`,
    )
    .bind(homeId)
    .all<{ memberId: string; name: string; outstandingCents: number }>()

  const balances: BalanceItem[] = balancesRes.results.map((row) => ({
    memberId: row.memberId,
    name: row.name,
    outstandingCents: Number(row.outstandingCents),
  }))

  return c.json({ balances }, 200)
})

export default app
