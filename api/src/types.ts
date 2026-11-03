export interface HomeRecord {
  id: string
  name: string
  created_at: string
}

export interface MemberRecord {
  id: string
  home_id: string
  name: string
  created_order: number
  created_at: string
}

export interface BillRecord {
  id: string
  home_id: string
  title: string
  total_cents: number
  created_at: string
}

export interface ShareRecord {
  id: string
  bill_id: string
  member_id: string
  amount_cents: number
  paid_at: string | null
  idempotency_key: string | null
  created_at: string
}

export interface BalanceItem {
  memberId: string
  name: string
  outstandingCents: number
}

export interface HomeSummary {
  id: string
  name: string
  createdAt: string
  memberCount: number
  totalExpensesCents: number
  totalPaidCents: number
  totalOutstandingCents: number
}

export interface MemberSummary {
  id: string
  homeId: string
  name: string
  createdOrder: number
  createdAt: string
  totalAllocatedCents: number
  totalPaidCents: number
  outstandingCents: number
}

export interface BillDetail {
  id: string
  homeId: string
  title: string
  totalCents: number
  createdAt: string
  shares: {
    id: string
    memberId: string
    memberName?: string
    amountCents: number
    paidAt: string | null
  }[]
}

