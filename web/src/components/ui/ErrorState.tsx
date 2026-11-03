import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 rounded-2xl border border-rose-200 my-4">
      <div className="p-3 bg-rose-100 text-rose-600 rounded-xl mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-rose-950">{title}</h3>
      <p className="text-xs text-rose-700 max-w-md mt-1 mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  )
}
