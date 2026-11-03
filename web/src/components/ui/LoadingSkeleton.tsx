export function LoadingSkeleton({
  className = '',
  rows = 1,
}: {
  className?: string
  rows?: number
}) {
  if (rows > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: pure visual skeleton
          <div key={i} className={`h-8 bg-slate-200/70 rounded-lg animate-pulse ${className}`} />
        ))}
      </div>
    )
  }

  return <div className={`bg-slate-200/70 rounded-lg animate-pulse ${className}`} />
}

export function StatCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex items-center justify-between">
        <LoadingSkeleton className="h-3 w-24" />
        <LoadingSkeleton className="h-9 w-9 rounded-xl" />
      </div>
      <div className="mt-4 space-y-2">
        <LoadingSkeleton className="h-8 w-32" />
        <LoadingSkeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: visual skeleton
        <td key={i} className="py-4 px-4">
          <LoadingSkeleton className="h-5 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}

