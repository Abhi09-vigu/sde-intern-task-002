// Strong typing for API responses and entities

export interface Home {
  id: string
  name: string
  createdAt?: string
  memberCount?: number
  totalExpensesCents?: number
  totalPaidCents?: number
  totalOutstandingCents?: number
}

export interface Member {
  id: string
  homeId: string
  name: string
  createdOrder?: number
  createdAt?: string
  totalAllocatedCents?: number
  totalPaidCents?: number
  outstandingCents?: number
}

export interface Share {
  id: string
  memberId: string
  memberName?: string
  amountCents: number
  paidAt: string | null
}

export interface Bill {
  id: string
  homeId: string
  title: string
  totalCents: number
  createdAt?: string
  shares: Share[]
}

export interface Balance {
  memberId: string
  name: string
  outstandingCents: number
}

export interface ApiError {
  error: string
  status: number
}

export class AppApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AppApiError'
    this.status = status
  }
}

const BASE_URL = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch (err) {
    throw new AppApiError(
      err instanceof Error ? `Network error: ${err.message}` : 'Network connection failed',
      0,
    )
  }

  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: Request failed`
    if (
      json &&
      typeof json === 'object' &&
      'error' in json &&
      typeof (json as { error: unknown }).error === 'string'
    ) {
      errorMessage = (json as { error: string }).error
    }
    throw new AppApiError(errorMessage, response.status)
  }

  return json as T
}

export const api = {
  // Homes
  async getHomes(): Promise<Home[]> {
    return request<Home[]>('/homes')
  },

  async createHome(name: string): Promise<Home> {
    return request<Home>('/homes', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  async getHome(homeId: string): Promise<Home & { members: Member[] }> {
    return request<Home & { members: Member[] }>(`/homes/${homeId}`)
  },

  // Members
  async getMembers(homeId: string): Promise<Member[]> {
    return request<Member[]>(`/homes/${homeId}/members`)
  },

  async addMember(homeId: string, name: string): Promise<Member> {
    return request<Member>(`/homes/${homeId}/members`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  // Bills
  async getBills(homeId: string): Promise<Bill[]> {
    return request<Bill[]>(`/homes/${homeId}/bills`)
  },

  async createBill(homeId: string, title: string, totalCents: number): Promise<Bill> {
    return request<Bill>(`/homes/${homeId}/bills`, {
      method: 'POST',
      body: JSON.stringify({ title, totalCents }),
    })
  },

  // Payments
  async payShare(billId: string, shareId: string, idempotencyKey: string): Promise<Share> {
    return request<Share>(`/bills/${billId}/shares/${shareId}/pay`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    })
  },

  // Balances
  async getBalances(homeId: string): Promise<{ balances: Balance[] }> {
    return request<{ balances: Balance[] }>(`/homes/${homeId}/balances`)
  },
}

// Utility: format integer cents into currency string
export function formatCents(cents: number): string {
  const isNegative = cents < 0
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const remainingCents = abs % 100
  const formatted = `$${dollars.toLocaleString('en-US')}.${remainingCents.toString().padStart(2, '0')}`
  return isNegative ? `-${formatted}` : formatted
}

export function formatCentsDetailed(cents: number): string {
  return `${cents.toLocaleString('en-US')}¢ (${formatCents(cents)})`
}
