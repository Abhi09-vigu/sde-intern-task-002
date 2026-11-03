import { AlertCircle, Check, KeyRound, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { api, formatCentsDetailed, type Share } from '../../lib/api'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'

interface PayShareModalProps {
  isOpen: boolean
  onClose: () => void
  billId: string
  billTitle: string
  share: Share
  memberName?: string
  onPaymentSuccess?: (paidShare: Share) => void
}

export function PayShareModal({
  isOpen,
  onClose,
  billId,
  billTitle,
  share,
  memberName,
  onPaymentSuccess,
}: PayShareModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Generate a distinct UUID for this payment attempt
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID())

  const { showToast } = useToast()

  const handleRegenerateKey = () => {
    setIdempotencyKey(crypto.randomUUID())
  }

  const handlePay = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const updatedShare = await api.payShare(billId, share.id, idempotencyKey)
      showToast({
        type: 'success',
        title: 'Payment confirmed',
        message: `Marked share of ${formatCentsDetailed(share.amountCents)} as paid`,
      })
      onPaymentSuccess?.(updatedShare)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      // Note: We deliberately preserve unpaid status on failure!
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
      title="Record Member Payment"
      subtitle="Mark individual bill share as settled"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Payment was not recorded</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Bill:</span>
            <span className="font-bold text-slate-800">{billTitle}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Member:</span>
            <span className="font-bold text-slate-800">{memberName || 'Member'}</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
            <span className="text-slate-500 font-medium">Share Amount:</span>
            <span className="text-sm font-extrabold text-emerald-700">
              {formatCentsDetailed(share.amountCents)}
            </span>
          </div>
        </div>

        {/* Idempotency Protection Indicator */}
        <div className="p-3 bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              Idempotency Protection
            </span>
            <button
              type="button"
              onClick={handleRegenerateKey}
              disabled={isSubmitting}
              className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Generate fresh UUID"
            >
              <RefreshCw className="w-3 h-3" />
              New Key
            </button>
          </div>
          <p className="text-[10px] font-mono text-slate-500 break-all select-all">
            {idempotencyKey}
          </p>
          <p className="text-[10px] text-slate-400">
            This unique key prevents accidental double charges if network connections retry.
          </p>
        </div>

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
            type="button"
            onClick={handlePay}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Confirm Payment
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
