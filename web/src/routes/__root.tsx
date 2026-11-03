import { createRootRoute, Outlet } from '@tanstack/react-router'
import { createContext, useContext, useState } from 'react'
import { Header } from '../components/layout/Header'
import { Sidebar } from '../components/layout/Sidebar'
import { AddMemberModal } from '../components/modals/AddMemberModal'
import { CreateBillModal } from '../components/modals/CreateBillModal'
import { CreateHomeModal } from '../components/modals/CreateHomeModal'
import { ToastProvider } from '../components/ui/Toast'
import { HomeProvider, useHome } from '../context/HomeContext'
import { api, type Member } from '../lib/api'

interface ModalControlContextValue {
  openCreateHome: () => void
  openAddMember: () => void
  openCreateBill: () => void
}

const ModalControlContext = createContext<ModalControlContextValue | null>(null)

export function useModalControl() {
  const ctx = useContext(ModalControlContext)
  if (!ctx) throw new Error('useModalControl must be used within ModalControlProvider')
  return ctx
}

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <ToastProvider>
      <HomeProvider>
        <AppShell />
      </HomeProvider>
    </ToastProvider>
  )
}

function AppShell() {
  const { selectedHome, refreshHomes } = useHome()

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [createHomeOpen, setCreateHomeOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [createBillOpen, setCreateBillOpen] = useState(false)

  const [activeMembers, setActiveMembers] = useState<Member[]>([])

  const loadMembersForBill = async () => {
    if (selectedHome) {
      try {
        const members = await api.getMembers(selectedHome.id)
        setActiveMembers(members)
      } catch {
        setActiveMembers([])
      }
    }
  }

  const handleOpenCreateBill = async () => {
    await loadMembersForBill()
    setCreateBillOpen(true)
  }

  const modalControls: ModalControlContextValue = {
    openCreateHome: () => setCreateHomeOpen(true),
    openAddMember: () => setAddMemberOpen(true),
    openCreateBill: handleOpenCreateBill,
  }

  return (
    <ModalControlContext.Provider value={modalControls}>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onOpenCreateHome={() => setCreateHomeOpen(true)}
            onOpenAddMember={() => setAddMemberOpen(true)}
            onOpenCreateBill={handleOpenCreateBill}
            onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>

        {/* Global Modals */}
        <CreateHomeModal isOpen={createHomeOpen} onClose={() => setCreateHomeOpen(false)} />

        {selectedHome && (
          <>
            <AddMemberModal
              isOpen={addMemberOpen}
              onClose={() => setAddMemberOpen(false)}
              homeId={selectedHome.id}
              homeName={selectedHome.name}
              onMemberAdded={() => {
                refreshHomes()
              }}
            />

            <CreateBillModal
              isOpen={createBillOpen}
              onClose={() => setCreateBillOpen(false)}
              homeId={selectedHome.id}
              homeName={selectedHome.name}
              members={activeMembers}
              onBillCreated={() => {
                refreshHomes()
              }}
            />
          </>
        )}
      </div>
    </ModalControlContext.Provider>
  )
}
