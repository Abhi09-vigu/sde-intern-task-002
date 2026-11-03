import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { api, type Home } from '../lib/api'

interface HomeContextValue {
  homes: Home[]
  selectedHome: Home | null
  selectedHomeId: string | null
  isLoadingHomes: boolean
  error: string | null
  selectHome: (homeId: string) => void
  refreshHomes: () => Promise<void>
  addHomeOptimistic: (newHome: Home) => void
}

const HomeContext = createContext<HomeContextValue | null>(null)

export function HomeProvider({ children }: { children: ReactNode }) {
  const [homes, setHomes] = useState<Home[]>([])
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null)
  const [isLoadingHomes, setIsLoadingHomes] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshHomes = useCallback(async () => {
    setIsLoadingHomes(true)
    setError(null)
    try {
      const data = await api.getHomes()
      setHomes(data)
      // Auto-select first home if nothing selected or current selection no longer exists
      if (data.length > 0) {
        setSelectedHomeId((prev) => {
          if (prev && data.some((h) => h.id === prev)) {
            return prev
          }
          return data[0]?.id ?? null
        })
      } else {
        setSelectedHomeId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch homes')
    } finally {
      setIsLoadingHomes(false)
    }
  }, [])

  useEffect(() => {
    refreshHomes()
  }, [refreshHomes])

  const selectHome = (homeId: string) => {
    setSelectedHomeId(homeId)
  }

  const addHomeOptimistic = (newHome: Home) => {
    setHomes((prev) => [newHome, ...prev])
    setSelectedHomeId(newHome.id)
  }

  const selectedHome = homes.find((h) => h.id === selectedHomeId) || null

  return (
    <HomeContext.Provider
      value={{
        homes,
        selectedHome,
        selectedHomeId,
        isLoadingHomes,
        error,
        selectHome,
        refreshHomes,
        addHomeOptimistic,
      }}
    >
      {children}
    </HomeContext.Provider>
  )
}

export function useHome(): HomeContextValue {
  const ctx = useContext(HomeContext)
  if (!ctx) {
    throw new Error('useHome must be used within HomeProvider')
  }
  return ctx
}
