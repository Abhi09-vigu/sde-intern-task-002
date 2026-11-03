import { Link } from '@tanstack/react-router'
import { Building2, CreditCard, LayoutDashboard, Receipt, Scale, Users, X } from 'lucide-react'
import { useHome } from '../../context/HomeContext'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { selectedHome } = useHome()

  const navLinks = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/homes',
      label: 'Homes & Members',
      icon: Users,
    },
    {
      to: '/bills',
      label: 'Bills & Splitting',
      icon: Receipt,
    },
    {
      to: '/balances',
      label: 'Balances',
      icon: Scale,
    },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-white text-base">
          <div className="p-1.5 bg-emerald-500 text-slate-950 rounded-xl font-black">
            <CreditCard className="w-4 h-4" />
          </div>
          <span>
            SplitWise<span className="text-emerald-400">Pro</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          className="p-1 text-slate-400 hover:text-white lg:hidden rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Household Context card */}
      <div className="p-4 mx-4 my-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
          Active Household
        </div>
        {selectedHome ? (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="font-semibold text-white text-xs truncate">{selectedHome.name}</div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">No household created yet</div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onCloseMobile}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors [&.active]:bg-emerald-500/10 [&.active]:text-emerald-400 [&.active]:font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>Engineered with Hono & D1</span>
          <span className="px-1.5 py-0.5 rounded-sm bg-slate-800 text-[10px] text-emerald-400 font-mono">
            v1.0
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close mobile sidebar backdrop"
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-default"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80%] h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
