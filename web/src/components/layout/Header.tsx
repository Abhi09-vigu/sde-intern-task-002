import { Building2, ChevronDown, Menu, Plus, Receipt, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useHome } from '../../context/HomeContext'

interface HeaderProps {
  onOpenCreateHome: () => void
  onOpenAddMember: () => void
  onOpenCreateBill: () => void
  onToggleMobileSidebar: () => void
}

export function Header({
  onOpenCreateHome,
  onOpenAddMember,
  onOpenCreateBill,
  onToggleMobileSidebar,
}: HeaderProps) {
  const { homes, selectedHome, selectedHomeId, selectHome } = useHome()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Household selector */}
        {homes.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/80 text-slate-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {selectedHome?.name || 'Select Household'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {dropdownOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close dropdown"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Household
                  </div>
                  {homes.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        selectHome(h.id)
                        setDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                        h.id === selectedHomeId
                          ? 'text-emerald-700 bg-emerald-50/50 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{h.name}</span>
                      {h.id === selectedHomeId && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  ))}
                  <div className="pt-1 mt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false)
                        onOpenCreateHome()
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left text-slate-900 hover:bg-slate-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      New Household
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Building2 className="w-3.5 h-3.5" />
            No households yet
          </div>
        )}
      </div>

      {/* Right side quick actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {selectedHome && (
          <>
            <button
              type="button"
              onClick={onOpenAddMember}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              Add Member
            </button>

            <button
              type="button"
              onClick={onOpenCreateBill}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Split Bill</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onOpenCreateHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-slate-700" />
          <span className="hidden md:inline">New Home</span>
        </button>

        {/* Database status pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>D1 Connected</span>
        </div>
      </div>
    </header>
  )
}
