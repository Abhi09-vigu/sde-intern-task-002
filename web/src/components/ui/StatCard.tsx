import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtext?: string
  icon: LucideIcon
  variant?: 'emerald' | 'navy' | 'slate' | 'amber' | 'rose'
}

export function StatCard({ title, value, subtext, icon: Icon, variant = 'slate' }: StatCardProps) {
  const variantStyles = {
    emerald: {
      bg: 'bg-emerald-50/60',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
    },
    navy: {
      bg: 'bg-slate-900',
      text: 'text-white',
      border: 'border-slate-800',
      iconBg: 'bg-slate-800 text-emerald-400',
      subtextColor: 'text-slate-400',
    },
    slate: {
      bg: 'bg-white',
      text: 'text-slate-900',
      border: 'border-slate-200/80',
      iconBg: 'bg-slate-100 text-slate-700',
    },
    amber: {
      bg: 'bg-amber-50/60',
      text: 'text-amber-900',
      border: 'border-amber-100',
      iconBg: 'bg-amber-500/10 text-amber-600',
    },
    rose: {
      bg: 'bg-rose-50/60',
      text: 'text-rose-900',
      border: 'border-rose-100',
      iconBg: 'bg-rose-500/10 text-rose-600',
    },
  }

  const style = variantStyles[variant]
  const isNavy = variant === 'navy'

  return (
    <div
      className={`relative p-5 rounded-2xl border shadow-xs transition-all hover:shadow-md ${style.bg} ${style.border}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold tracking-wider uppercase ${isNavy ? 'text-slate-400' : 'text-slate-500'}`}
        >
          {title}
        </span>
        <div className={`p-2 rounded-xl ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className={`text-2xl font-extrabold tracking-tight ${style.text}`}>{value}</h3>
        {subtext && (
          <p className={`text-xs mt-1 font-medium ${isNavy ? 'text-slate-400' : 'text-slate-500'}`}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  )
}
