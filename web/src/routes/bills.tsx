import { createFileRoute } from '@tanstack/react-router'
import { Calendar, CheckCircle2, Filter, Plus, Receipt } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PayShareModal } from '../components/modals/PayShareModal'
import { StatusBadge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { useHome } from '../context/HomeContext'
import { api, type Bill, formatCents, formatCentsDetailed, type Share } from '../lib/api'
import { useModalControl } from './__root'

export const Route = createFileRoute('/bills')({
  component: BillsPage,
})

function BillsPage() {
  const { selectedHome, selectedHomeId, refreshHomes } = useHome()
  const { openCreateBill } = useModalControl()

  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all')

  // Payment modal state
  const [payingShare, setPayingShare] = useState<{
    billId: string
    billTitle: string
    share: Share
    memberName?: string
  } | null>(null)

  const loadBills = useCallback(async (homeId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getBills(homeId)
      setBills(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bills')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedHomeId) {
      loadBills(selectedHomeId)
    } else {
      setBills([])
    }
  }, [selectedHomeId, loadBills])

  const filteredBills = bills.filter((b) => {
    const isFullyPaid = b.shares.every((s) => s.paidAt !== null)
    if (filter === 'paid') return isFullyPaid
    if (filter === 'unpaid') return !isFullyPaid
    return true
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Bills & Expense Splits
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedHome
              ? `Tracking expenses for "${selectedHome.name}"`
              : 'Select a household to view expenses'}
          </p>
        </div>

        {selectedHome && (
          <button
            type="button"
            onClick={openCreateBill}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Create & Split Bill
          </button>
        )}
      </div>

      {error && (
        <ErrorState
          title="Could not load bills"
          message={error}
          onRetry={() => selectedHomeId && loadBills(selectedHomeId)}
        />
      )}

      {/* Filter Tabs */}
      {bills.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              All ({bills.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unpaid')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'unpaid'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Unsettled ({bills.filter((b) => b.shares.some((s) => !s.paidAt)).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('paid')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'paid'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Fully Paid ({bills.filter((b) => b.shares.every((s) => s.paidAt)).length})
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-40 w-full" rows={3} />
        </div>
      ) : bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bills recorded yet"
          description="Create your first bill to see how expenses are divided equally, with extra cents automatically assigned to earlier roommates."
          action={
            <button
              type="button"
              onClick={openCreateBill}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Bill
            </button>
          }
        />
      ) : filteredBills.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          No bills match the selected filter ({filter}).
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBills.map((bill) => {
            const paidShares = bill.shares.filter((s) => s.paidAt !== null)
            const unpaidShares = bill.shares.filter((s) => s.paidAt === null)
            const outstandingCents = unpaidShares.reduce((acc, s) => acc + s.amountCents, 0)
            const isFullyPaid = unpaidShares.length === 0

            return (
              <div
                key={bill.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 hover:shadow-md transition-shadow"
              >
                {/* Bill Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{bill.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {bill.createdAt
                              ? new Date(bill.createdAt).toLocaleDateString()
                              : 'recent'}
                          </span>
                          <span>•</span>
                          <span>Bill ID: {bill.id.slice(0, 8)}...</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center sm:text-right gap-4 justify-between sm:justify-end">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Total Bill</div>
                      <div className="text-lg font-black text-slate-900">
                        {formatCentsDetailed(bill.totalCents)}
                      </div>
                    </div>

                    <div className="pl-4 border-l border-slate-200">
                      <div className="text-xs text-slate-400 font-medium">Outstanding</div>
                      <div
                        className={`text-sm font-black ${
                          outstandingCents > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCents(outstandingCents)}
                      </div>
                    </div>

                    <div className="hidden md:block">
                      <StatusBadge status={isFullyPaid ? 'paid' : 'unpaid'} />
                    </div>
                  </div>
                </div>

                {/* Individual Member Shares Breakdown */}
                <div className="pt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                    <span>
                      Member Splits ({paidShares.length}/{bill.shares.length} settled)
                    </span>
                    <span className="text-slate-400 lowercase font-normal">
                      ordered by member creation
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {bill.shares.map((share, idx) => {
                      const isPaid = share.paidAt !== null

                      return (
                        <div
                          key={share.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                            isPaid
                              ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-950'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isPaid
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold truncate">
                                {share.memberName || 'Member'}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-600">
                                {formatCentsDetailed(share.amountCents)}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 ml-2">
                            {isPaid ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Paid
                                </span>
                                {share.paidAt && (
                                  <div className="text-[9px] text-emerald-600">
                                    {new Date(share.paidAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setPayingShare({
                                    billId: bill.id,
                                    billTitle: bill.title,
                                    share,
                                    memberName: share.memberName,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                              >
                                Pay Share
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pay Share Modal */}
      {payingShare && (
        <PayShareModal
          isOpen={true}
          onClose={() => setPayingShare(null)}
          billId={payingShare.billId}
          billTitle={payingShare.billTitle}
          share={payingShare.share}
          memberName={payingShare.memberName}
          onPaymentSuccess={() => {
            if (selectedHomeId) {
              loadBills(selectedHomeId)
              refreshHomes()
            }
          }}
        />
      )}
    </div>
  )
}
