import { describe, expect, it } from 'vitest'
import { type Balance, call, createBill, createHome, type Share } from './helpers'

describe('Edge cases and concurrency protection', () => {
  it('protects against simultaneous payment requests with different keys', async () => {
    const { homeId } = await createHome(['Alice', 'Bob'])
    const bill = await createBill(homeId, 1500)
    const targetShare = bill.body.shares[0]
    if (!targetShare) throw new Error('Share missing')

    const key1 = crypto.randomUUID()
    const key2 = crypto.randomUUID()

    // Dispatch two concurrent payment attempts for the exact same share
    const [res1, res2] = await Promise.all([
      call<Share>('POST', `/api/bills/${bill.body.id}/shares/${targetShare.id}/pay`, {
        headers: { 'Idempotency-Key': key1 },
      }),
      call<Share>('POST', `/api/bills/${bill.body.id}/shares/${targetShare.id}/pay`, {
        headers: { 'Idempotency-Key': key2 },
      }),
    ])

    const statuses = [res1.status, res2.status].sort()
    // Exactly one must succeed (200), and the other must be rejected (409 Conflict)
    expect(statuses).toEqual([200, 409])

    // Verify balance is only deducted once
    const balances = await call<{ balances: Balance[] }>('GET', `/api/homes/${homeId}/balances`)
    const totalOutstanding = balances.body.balances.reduce((sum, b) => sum + b.outstandingCents, 0)
    // 1500 split between 2 is 750 and 750. After one 750 share is paid, outstanding is 750.
    expect(totalOutstanding).toBe(750)
  })

  it('allows concurrent requests with identical idempotency key to both return 200', async () => {
    const { homeId } = await createHome(['Alice', 'Bob'])
    const bill = await createBill(homeId, 2000)
    const targetShare = bill.body.shares[0]
    if (!targetShare) throw new Error('Share missing')

    const sameKey = crypto.randomUUID()

    const [res1, res2] = await Promise.all([
      call<Share>('POST', `/api/bills/${bill.body.id}/shares/${targetShare.id}/pay`, {
        headers: { 'Idempotency-Key': sameKey },
      }),
      call<Share>('POST', `/api/bills/${bill.body.id}/shares/${targetShare.id}/pay`, {
        headers: { 'Idempotency-Key': sameKey },
      }),
    ])

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(res1.body.paidAt).toBe(res2.body.paidAt)
  })

  it('rejects blank home names with 400', async () => {
    const res = await call('POST', '/api/homes', {
      body: { name: '   ' },
    })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('rejects blank member names with 400', async () => {
    const { homeId } = await createHome([])
    const res = await call('POST', `/api/homes/${homeId}/members`, {
      body: { name: '   ' },
    })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('rejects empty or blank bill titles with 422', async () => {
    const { homeId } = await createHome(['Alice'])
    const res = await call('POST', `/api/homes/${homeId}/bills`, {
      body: { title: '  ', totalCents: 500 },
    })
    expect(res.status).toBe(422)
    expect(res.body).toHaveProperty('error')
  })

  it('rejects payment when share does not belong to the bill with 404', async () => {
    const { homeId } = await createHome(['Alice', 'Bob'])
    const bill1 = await createBill(homeId, 1000)
    const bill2 = await createBill(homeId, 2000)

    const shareFromBill1 = bill1.body.shares[0]
    if (!shareFromBill1) throw new Error('Share missing')

    // Attempt to pay shareFromBill1 under bill2
    const res = await call('POST', `/api/bills/${bill2.body.id}/shares/${shareFromBill1.id}/pay`, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    })
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('provides dashboard statistics across multiple homes, bills and payments', async () => {
    const { homeId: homeA } = await createHome(['User1', 'User2'])
    const { homeId: homeB } = await createHome(['User3'])

    await createBill(homeA, 1000)
    await createBill(homeB, 500)

    const homesRes = await call<Array<{ id: string; totalExpensesCents: number }>>(
      'GET',
      '/api/homes',
    )
    expect(homesRes.status).toBe(200)

    const homeARecord = homesRes.body.find((h) => h.id === homeA)
    const homeBRecord = homesRes.body.find((h) => h.id === homeB)

    expect(homeARecord?.totalExpensesCents).toBe(1000)
    expect(homeBRecord?.totalExpensesCents).toBe(500)
  })
})
