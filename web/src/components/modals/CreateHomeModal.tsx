import { Building2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useHome } from '../../context/HomeContext'
import { api } from '../../lib/api'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'

interface CreateHomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateHomeModal({ isOpen, onClose }: CreateHomeModalProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { refreshHomes, addHomeOptimistic } = useHome()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please provide a household name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const created = await api.createHome(trimmed)
      addHomeOptimistic(created)
      showToast({
        type: 'success',
        title: 'Household created',
        message: `Successfully created "${created.name}"`,
      })
      setName('')
      onClose()
      await refreshHomes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create home')
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
      title="Create New Household"
      subtitle="Group roommates or flatmates to split shared living costs"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="homeName"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Household Name
          </label>
          <div className="relative">
            <input
              id="homeName"
              type="text"
              placeholder="e.g. Flat 4B, 221B Baker St"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all disabled:opacity-50"
            />
          </div>
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
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5" />
                Create Household
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
