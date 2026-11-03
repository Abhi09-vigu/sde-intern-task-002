import { AlertCircle, Calculator, DollarSign, Loader2, Receipt } from 'lucide-react'
import { useState } from 'react'
import { api, formatCents, type Member } from '../../lib/api'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'

interface CreateBillModalProps {
  isOpen: boolean
  onClose: () => void
  homeId: string
  homeName: string
  members: Member[]
  onBillCreated?: () => void
}

export function CreateBillModal({
  isOpen,
  onClose,
  homeId,
  homeName,
  members,
  onBillCreated,
}: CreateBillModalProps) {
  const [title, setTitle] = useState('')
  const [dollarsInput, setDollarsInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { showToast } = useToast()

  // Calculate integer cents safely
  const parsedDollars = Number.parseFloat(dollarsInput)
  const totalCents =
    !Number.isNaN(parsedDollars) && parsedDollars > 0 ? Math.round(parsedDollars * 100) : 0

  // Calculate preview of shares
  const memberCount = members.length
  const previewShares =
    memberCount > 0 && totalCents > 0
      ? members.map((m, idx) => {
          const base = Math.floor(totalCents / memberCount)
          const remainder = totalCents % memberCount
          const shareAmount = idx < remainder ? base + 1 : base
          return {
            memberId: m.id,
            name: m.name,
            amountCents: shareAmount,
            hasExtraCent: idx < remainder && remainder > 0,
          }
        })
      : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setError('Bill title is required')
      return
    }

    if (totalCents <= 0) {
      setError('Total amount must be greater than zero')
      return
    }

    if (memberCount === 0) {
      setError('Cannot create a bill: this household has no members')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await api.createBill(homeId, trimmedTitle, totalCents)
      showToast({
        type: 'success',
        title: 'Bill created & split',
        message: `Split ${formatCents(totalCents)} across ${memberCount} members`,
      })
      setTitle('')
      setDollarsInput('')
      onClose()
      onBillCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bill')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) {
          setError(null)
          onClose()
        }
      }}
      title="Create & Split Bill"
      subtitle={`Adding expense to "${homeName}"`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {memberCount === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Household has no members yet
            </div>
            <p>
              Bills must be split among household members. Please add at least one member to "
              {homeName}" before creating a bill.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="billTitle"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Bill Title
                </label>
                <input
                  id="billTitle"
                  type="text"
                  placeholder="e.g. Electricity, Fiber Internet, Groceries"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="totalAmount"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Total Amount ($ USD)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="10.00"
                    value={dollarsInput}
                    onChange={(e) => setDollarsInput(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
                {totalCents > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Stored as:{' '}
                    <span className="font-semibold text-slate-700">
                      {totalCents.toLocaleString()} integer cents
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Real-time split preview */}
            {totalCents > 0 && previewShares.length > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                    Exact Split Preview ({memberCount} members)
                  </span>
                  <span className="text-emerald-700 font-bold">{formatCents(totalCents)}</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {previewShares.map((share, idx) => (
                    <div
                      key={share.memberId}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 w-4">#{idx + 1}</span>
                        <span className="font-medium text-slate-800">{share.name}</span>
                        {share.hasExtraCent && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-semibold rounded-sm">
                            +1¢ remainder
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-900">
                        {share.amountCents}¢ ({formatCents(share.amountCents)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || totalCents <= 0 || memberCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Splitting...
              </>
            ) : (
              <>
                <Receipt className="w-3.5 h-3.5" />
                Create & Split Bill
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
