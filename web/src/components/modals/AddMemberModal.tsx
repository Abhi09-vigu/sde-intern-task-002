import { Loader2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  homeId: string
  homeName: string
  onMemberAdded?: () => void
}

export function AddMemberModal({
  isOpen,
  onClose,
  homeId,
  homeName,
  onMemberAdded,
}: AddMemberModalProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please provide a member name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const member = await api.addMember(homeId, trimmed)
      showToast({
        type: 'success',
        title: 'Member added',
        message: `Added "${member.name}" to ${homeName}`,
      })
      setName('')
      onClose()
      onMemberAdded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
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
      title="Add Household Member"
      subtitle={`Adding member to "${homeName}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="memberName"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Member Name
          </label>
          <input
            id="memberName"
            type="text"
            placeholder="e.g. Asha, Ben, Chitra"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all disabled:opacity-50"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Note: Members are ordered by the sequence they are added. In bill splits that do not
            divide evenly, extra cents are assigned to earlier members.
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
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                Add Member
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
