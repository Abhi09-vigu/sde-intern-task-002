import { createFileRoute } from '@tanstack/react-router'
import { Building2, Calendar, CheckCircle2, Clock, Plus, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { useHome } from '../context/HomeContext'
import { api, formatCents, type Member } from '../lib/api'
import { useModalControl } from './__root'

export const Route = createFileRoute('/homes')({
  component: HomesPage,
})

function HomesPage() {
  const { homes, selectedHome, selectedHomeId, selectHome, isLoadingHomes, error, refreshHomes } =
    useHome()
  const { openCreateHome, openAddMember } = useModalControl()

  const [members, setMembers] = useState<Member[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  const loadMembers = useCallback(async (homeId: string) => {
    setIsLoadingMembers(true)
    setMemberError(null)
    try {
      const data = await api.getMembers(homeId)
      setMembers(data)
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to load household members')
    } finally {
      setIsLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    if (selectedHomeId) {
      loadMembers(selectedHomeId)
    } else {
      setMembers([])
    }
  }, [selectedHomeId, loadMembers])

  if (isLoadingHomes) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LoadingSkeleton className="h-64" />
          <LoadingSkeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Could not load households" message={error} onRetry={refreshHomes} />
  }

  if (homes.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No households registered"
        description="Create your first shared household to start adding flatmates and managing shared costs."
        action={
          <button
            type="button"
            onClick={openCreateHome}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Household
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Households & Members
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your shared properties and flatmate rosters
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            New Household
          </button>
          {selectedHome && (
            <button
              type="button"
              onClick={openAddMember}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Households List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>All Households ({homes.length})</span>
          </div>

          <div className="space-y-2">
            {homes.map((h) => {
              const isSelected = h.id === selectedHomeId

              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => selectHome(h.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-900/5'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected
                            ? 'bg-slate-900 text-emerald-400'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{h.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {h.memberCount ?? 0} members
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial stats snippet */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Total Spent
                      </span>
                      <p className="font-bold text-slate-800">
                        {formatCents(h.totalExpensesCents ?? 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Outstanding
                      </span>
                      <p
                        className={`font-bold ${
                          (h.totalOutstandingCents ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCents(h.totalOutstandingCents ?? 0)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Household Detail & Members (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedHome && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">{selectedHome.name}</h2>
                    <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-full">
                      ID: {selectedHome.id.slice(0, 8)}...
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Household active since{' '}
                    {selectedHome.createdAt
                      ? new Date(selectedHome.createdAt).toLocaleDateString()
                      : 'recent'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddMember}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              </div>

              {/* Members Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Household Roster ({members.length} members in creation order)
                  </h3>
                </div>

                {memberError && (
                  <ErrorState
                    title="Failed to load members"
                    message={memberError}
                    onRetry={() => loadMembers(selectedHome.id)}
                  />
                )}

                {isLoadingMembers ? (
                  <LoadingSkeleton rows={4} className="h-12 w-full" />
                ) : members.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No members in this household"
                    description="Bills can only be split among members. Add roomates to begin tracking individual allocations and payments."
                    action={
                      <button
                        type="button"
                        onClick={openAddMember}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add First Member
                      </button>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                          <th className="pb-3 px-3">Order</th>
                          <th className="pb-3 px-3">Member Name</th>
                          <th className="pb-3 px-3 text-right">Allocated</th>
                          <th className="pb-3 px-3 text-right">Paid</th>
                          <th className="pb-3 px-3 text-right">Outstanding</th>
                          <th className="pb-3 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.map((member, idx) => {
                          const outstanding = member.outstandingCents ?? 0
                          const isSettled = outstanding === 0

                          return (
                            <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 font-mono text-slate-400 font-bold">
                                #{idx + 1}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">{member.name}</div>
                                <div className="text-[10px] text-slate-400">
                                  ID: {member.id.slice(0, 8)}...
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-slate-700">
                                {formatCents(member.totalAllocatedCents ?? 0)}
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-emerald-700">
                                {formatCents(member.totalPaidCents ?? 0)}
                              </td>
                              <td className="py-3 px-3 text-right font-extrabold">
                                <span
                                  className={outstanding > 0 ? 'text-amber-600' : 'text-slate-400'}
                                >
                                  {formatCents(outstanding)}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isSettled
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {isSettled ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      Settled
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      Owes
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
