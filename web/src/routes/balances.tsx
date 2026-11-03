import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Clock, Scale, UserCheck, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { StatCard } from '../components/ui/StatCard'
import { useHome } from '../context/HomeContext'
import { api, type Balance, formatCents, formatCentsDetailed, type Member } from '../lib/api'
import { useModalControl } from './__root'

export const Route = createFileRoute('/balances')({
  component: BalancesPage,
})

function BalancesPage() {
  const { selectedHome, selectedHomeId } = useHome()
  const { openAddMember, openCreateBill } = useModalControl()

  const [balances, setBalances] = useState<Balance[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBalances = useCallback(async (homeId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const [balancesRes, membersRes] = await Promise.all([
        api.getBalances(homeId),
        api.getMembers(homeId),
      ])
      setBalances(balancesRes.balances)
      setMembers(membersRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balances')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedHomeId) {
      loadBalances(selectedHomeId)
    } else {
      setBalances([])
      setMembers([])
    }
  }, [selectedHomeId, loadBalances])

  const totalOutstandingCents = balances.reduce((acc, b) => acc + b.outstandingCents, 0)
  const fullySettledMembers = balances.filter((b) => b.outstandingCents === 0).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Household Balances</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedHome
              ? `Outstanding debts and allocations for "${selectedHome.name}"`
              : 'Select a household to view balance breakdown'}
          </p>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Could not load balances"
          message={error}
          onRetry={() => selectedHomeId && loadBalances(selectedHomeId)}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Household Debt"
          value={formatCents(totalOutstandingCents)}
          subtext="Cumulative unpaid shares"
          icon={Clock}
          variant={totalOutstandingCents > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Members Settled"
          value={`${fullySettledMembers} of ${balances.length}`}
          subtext="Zero outstanding balance"
          icon={UserCheck}
          variant="slate"
        />
        <StatCard
          title="Creation Order"
          value="Preserved"
          subtext="Determines remainder distribution"
          icon={Scale}
          variant="navy"
        />
      </div>

      {/* Balance Details Table */}
      {isLoading ? (
        <LoadingSkeleton rows={4} className="h-16 w-full" />
      ) : balances.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No member balances to display"
          description="Balances are dynamically calculated across all bills in this home. Add members and bills to begin tracking debts."
          action={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openAddMember}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Add Member
              </button>
              <button
                type="button"
                onClick={openCreateBill}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
              >
                Split Bill
              </button>
            </div>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Member Ledger (Creation Order)
            </h3>
            <span className="text-[11px] text-slate-400">
              Queried directly from `/api/homes/:id/balances`
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-semibold tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4 text-right">Allocated</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Outstanding Debt</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map((balance, idx) => {
                  const memberDetail = members.find((m) => m.id === balance.memberId)
                  const isSettled = balance.outstandingCents === 0

                  return (
                    <tr key={balance.memberId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 text-sm">{balance.name}</div>
                        <div className="text-[10px] text-slate-400">
                          ID: {balance.memberId.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-slate-700">
                        {memberDetail?.totalAllocatedCents !== undefined
                          ? formatCentsDetailed(memberDetail.totalAllocatedCents)
                          : '—'}
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-emerald-700">
                        {memberDetail?.totalPaidCents !== undefined
                          ? formatCentsDetailed(memberDetail.totalPaidCents)
                          : '—'}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-sm">
                        <span className={isSettled ? 'text-slate-400' : 'text-amber-600'}>
                          {formatCentsDetailed(balance.outstandingCents)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            isSettled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isSettled ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Settled Up
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              Owes {formatCents(balance.outstandingCents)}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
