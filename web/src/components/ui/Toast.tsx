import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { createContext, type ReactNode, useContext, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    const newToast: Toast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      removeToast(id)
    }, 4500)
  }

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : toast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-slate-50 border-slate-200 text-slate-950'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-sky-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>
              {toast.message && (
                <p className="text-xs mt-1 text-slate-600 leading-relaxed">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
