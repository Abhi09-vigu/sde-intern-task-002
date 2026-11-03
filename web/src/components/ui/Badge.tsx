import { CheckCircle2, Clock } from 'lucide-react'

interface BadgeProps {
  status: 'paid' | 'unpaid'
  label?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, label, size = 'md' }: BadgeProps) {
  const isPaid = status === 'paid'
  const displayLabel = label || (isPaid ? 'Paid' : 'Unpaid')

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5'

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${sizeClasses} ${
        isPaid
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      {isPaid ? (
        <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      ) : (
        <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      )}
      {displayLabel}
    </span>
  )
}

