import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg'
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidthClass =
    maxWidth === 'sm' ? 'max-w-md' : maxWidth === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-default"
        onClick={onClose}
      />

      {/* Dialog content */}
      <div
        className={`relative w-full ${maxWidthClass} bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 z-10 transition-all animate-in zoom-in-95 duration-200`}
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-4">{children}</div>
      </div>
    </div>
  )
}
