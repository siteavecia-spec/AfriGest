import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export interface Boutique { id: string; name: string; code?: string }

interface BoutiqueContextValue {
  selectedBoutiqueId: string
  setSelectedBoutiqueId: (id: string) => void
  boutiques: Boutique[]
}

const BoutiqueContext = createContext<BoutiqueContextValue | undefined>(undefined)

export function BoutiqueProvider({ children }: { children: React.ReactNode }) {
  const [selectedBoutiqueId, setSelectedBoutiqueIdState] = useState<string>(() => {
    try { return localStorage.getItem('afrigest_boutique_id') || 'bq-1' } catch { return 'bq-1' }
  })
  // MVP: liste statique; plus tard, à remplacer par un fetch API
  const [boutiques] = useState<Boutique[]>([
    { id: 'bq-1', name: 'Boutique Principale', code: 'MAIN' },
  ])

  const setSelectedBoutiqueId = (id: string) => {
    setSelectedBoutiqueIdState(id)
    try { localStorage.setItem('afrigest_boutique_id', id) } catch {}
  }

  useEffect(() => {
    // Hook pour recharger la liste depuis API à l’avenir
  }, [])

  const value = useMemo(() => ({ selectedBoutiqueId, setSelectedBoutiqueId, boutiques }), [selectedBoutiqueId, boutiques])

  return (
    <BoutiqueContext.Provider value={value}>{children}</BoutiqueContext.Provider>
  )
}

export function useBoutique() {
  const ctx = useContext(BoutiqueContext)
  if (!ctx) throw new Error('useBoutique must be used within BoutiqueProvider')
  return ctx
}
