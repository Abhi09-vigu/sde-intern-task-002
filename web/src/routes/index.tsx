import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  Receipt,
  Scale,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PayShareModal } from '../components/modals/PayShareModal'
import { StatusBadge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingSkeleton, StatCardSkeleton } from '../components/ui/LoadingSkeleton'
import { StatCard } from '../components/ui/StatCard'
import { useHome } from '../context/HomeContext'
import { api, type Bill, formatCents, type Member, type Share } from '../lib/api'
import { useModalControl } from './__root'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const { selectedHome, homes, isLoadingHomes, error: homeError, refreshHomes } = useHome()
  const { openCreateHome, openAddMember, openCreateBill } = useModalControl()

  const [bills, setBills] = useState<Bill[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  // Payment modal state
  const [payingShareInfo, setPayingShareInfo] = useState<{
    billId: string
    billTitle: string
    share: Share
    memberName?: string
  } | null>(null)

  const loadHomeDetails = useCallback(async (homeId: string) => {
    setIsLoadingDetails(true)
    setDetailsError(null)
    try {
      const [fetchedBills, fetchedMembers] = await Promise.all([
        api.getBills(homeId),
        api.getMembers(homeId),
      ])
      setBills(fetchedBills)
      setMembers(fetchedMembers)
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to load household details')
    } finally {
      setIsLoadingDetails(false)
    }
  }, [])

  useEffect(() => {
    if (selectedHome?.id) {
      loadHomeDetails(selectedHome.id)
    } else {
      setBills([])
      setMembers([])
    }
  }, [selectedHome?.id, loadHomeDetails])

  if (isLoadingHomes) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    )
  }

  if (homeError) {
    return (
      <ErrorState title="Failed to load households" message={homeError} onRetry={refreshHomes} />
    )
  }

  // Empty state: completely empty database (no homes exist yet)
  if (homes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          icon={Building2}
          title="Welcome to SplitWise Pro"
          description="A production-ready shared expense manager. Start by creating your first household to add roommates and split living costs with mathematical precision."
          action={
            <button
              type="button"
              onClick={openCreateHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create First Household
            </button>
          }
        />
      </div>
    )
  }

  // Calculate real live aggregates
  const totalBillsCount = bills.length
  const totalMembersCount = members.length

  const allShares = bills.flatMap((b) => b.shares)
  const totalExpensesCents = bills.reduce((acc, b) => acc + b.totalCents, 0)
  const totalPaidCents = allShares
    .filter((s) => s.paidAt !== null)
    .reduce((acc, s) => acc + s.amountCents, 0)
  const totalOutstandingCents = allShares
    .filter((s) => s.paidAt === null)
    .reduce((acc, s) => acc + s.amountCents, 0)

  const recentBills = bills.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">
              {selectedHome?.name}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial summary & expense breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAddMember}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Add Member
          </button>
          <button
            type="button"
            onClick={openCreateBill}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            Split a Bill
          </button>
        </div>
      </div>

      {detailsError && (
        <ErrorState
          title="Could not sync household data"
          message={detailsError}
          onRetry={() => selectedHome && loadHomeDetails(selectedHome.id)}
        />
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expenses"
          value={formatCents(totalExpensesCents)}
          subtext={`${totalBillsCount} total bill${totalBillsCount === 1 ? '' : 's'}`}
          icon={Receipt}
          variant="navy"
        />
        <StatCard
          title="Total Settled"
          value={formatCents(totalPaidCents)}
          subtext="Confirmed payments"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Outstanding"
          value={formatCents(totalOutstandingCents)}
          subtext="Awaiting settlement"
          icon={Clock}
          variant="amber"
        />
        <StatCard
          title="Total Members"
          value={totalMembersCount}
          subtext="Roommates sharing costs"
          icon={Users}
          variant="slate"
        />
      </div>

      {/* Main Content Grid: Recent Bills & Unpaid Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bills (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Recent Bills
            </h2>
            <Link
              to="/bills"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              View all bills
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingDetails ? (
            <LoadingSkeleton className="h-48 w-full" rows={3} />
          ) : bills.length === 0 ? (
            <div className="p-8 bg-white border border-dashed border-slate-200 rounded-2xl text-center">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No bills created yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5 mb-4">
                Add your household's first expense to test automatic splitting.
              </p>
              <button
                type="button"
                onClick={openCreateBill}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Create Bill
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="divide-y divide-slate-100">
                {recentBills.map((bill) => {
                  const paidCount = bill.shares.filter((s) => s.paidAt !== null).length
                  const isFullyPaid = paidCount === bill.shares.length

                  return (
                    <div key={bill.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{bill.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>{bill.shares.length} shares</span>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">
                              {paidCount}/{bill.shares.length} paid
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900">
                            {formatCents(bill.totalCents)}
                          </span>
                          <div className="mt-1">
                            <StatusBadge status={isFullyPaid ? 'paid' : 'unpaid'} size="sm" />
                          </div>
                        </div>
                      </div>

                      {/* Shares summary pill row */}
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                        {bill.shares.map((share) => (
                          <div
                            key={share.id}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border font-medium ${
                              share.paidAt
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{share.memberName || 'Member'}</span>
                            <span className="font-bold">{formatCents(share.amountCents)}</span>
                            {share.paidAt ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setPayingShareInfo({
                                    billId: bill.id,
                                    billTitle: bill.title,
                                    share,
                                    memberName: share.memberName,
                                  })
                                }
                                className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold ml-1 cursor-pointer"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Members & Balances Sidebar (1 column) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              Member Balances
            </h2>
            <Link
              to="/balances"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Details
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingDetails ? (
            <LoadingSkeleton className="h-48 w-full" rows={3} />
          ) : members.length === 0 ? (
            <div className="p-8 bg-white border border-dashed border-slate-200 rounded-2xl text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No members added</p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
                Add roommates in creation order to split costs.
              </p>
              <button
                type="button"
                onClick={openAddMember}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Add First Member
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 divide-y divide-slate-100">
              {members.map((member, idx) => (
                <div
                  key={member.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-slate-200">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{member.name}</div>
                      <div className="text-[10px] text-slate-400">Order #{idx + 1}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-black text-xs ${
                        (member.outstandingCents ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatCents(member.outstandingCents ?? 0)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(member.outstandingCents ?? 0) > 0 ? 'Owes' : 'Settled'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pay Share Modal */}
      {payingShareInfo && (
        <PayShareModal
          isOpen={true}
          onClose={() => setPayingShareInfo(null)}
          billId={payingShareInfo.billId}
          billTitle={payingShareInfo.billTitle}
          share={payingShareInfo.share}
          memberName={payingShareInfo.memberName}
          onPaymentSuccess={() => {
            if (selectedHome) {
              loadHomeDetails(selectedHome.id)
              refreshHomes()
            }
          }}
        />
      )}
    </div>
  )
}
